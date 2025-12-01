/**
 * Service de génération PDF Magazine DECO
 * Style éditorial premium pour DICA DÉCOR
 */

import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import type { 
  MagazineDecoOptions, 
  MagazineDecoResult, 
  MagazineAICaption 
} from '@/types/magazine-deco.types';
import { MAGAZINE_DECO_CONFIG } from '@/types/magazine-deco.types';

export class MagazineDecoPdfService {
  private static instance: MagazineDecoPdfService;
  
  private constructor() {}
  
  static getInstance(): MagazineDecoPdfService {
    if (!this.instance) {
      this.instance = new MagazineDecoPdfService();
    }
    return this.instance;
  }

  /**
   * Génère un PDF Magazine DECO
   */
  async generateMagazinePDF(options: MagazineDecoOptions): Promise<MagazineDecoResult> {
    console.log("📖 Magazine DECO - Starting PDF generation");
    
    try {
      // Validate inputs
      if (!options.project || !options.decor || !options.images || options.images.length === 0) {
        throw new Error("Missing required data for Magazine DECO generation");
      }

      // Generate AI captions for COVER if requested and not provided
      let coverCaptions = options.aiCaptions;
      if (options.generateAICaptions && !coverCaptions) {
        coverCaptions = await this.generateAICaptions({
          ...options,
          images: [options.images[0]] // Cover uses first image
        });
      }

      // Create PDF instance (A4 portrait, 300 DPI quality)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Load images with base64
      const loadedImages = await this.loadImagesWithBase64(options.images);
      
      // PAGE 1 - COVER
      await this.renderCoverPage(pdf, options, loadedImages[0], coverCaptions, pageWidth, pageHeight);
      
      // PAGE 2+ - EDITORIAL ARTICLES with before/after (UNIQUE captions per image)
      for (let i = 0; i < loadedImages.length; i++) {
        pdf.addPage();
        
        // Generate UNIQUE AI captions for THIS specific image
        const pageCaptions = options.generateAICaptions 
          ? await this.generateAICaptions({
              ...options,
              images: [options.images[i]] // Pass current image for analysis
            })
          : undefined;
        
        const originalImage = options.images[i]?.originalUrl 
          ? await this.loadSingleImageWithBase64(options.images[i].originalUrl!)
          : null;
        
        await this.renderEditorialArticlePage(
          pdf, 
          originalImage,
          loadedImages[i], 
          options,
          pageCaptions, // Use image-specific captions
          pageWidth, 
          pageHeight, 
          i + 2
        );
      }
      
      // PAGE FINALE - Certifications & Contact DICA
      pdf.addPage();
      await this.renderClosingPage(pdf, pageWidth, pageHeight);

      // Generate blob
      const blob = pdf.output('blob');
      const filename = this.generateFilename(options.project.name);
      
      console.log("✅ Magazine DECO PDF generated:", {
        filename,
        pageCount: pdf.getNumberOfPages(),
        aiCaptions: coverCaptions
      });

      return {
        success: true,
        blob,
        filename,
        pageCount: pdf.getNumberOfPages(),
        aiCaptions: coverCaptions
      };

    } catch (error: any) {
      console.error("❌ Magazine DECO generation error:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
    }
  }

  /**
   * Génère les captions AI via edge function avec analyse d'image
   */
  private async generateAICaptions(options: MagazineDecoOptions): Promise<MagazineAICaption> {
    console.log("🤖 Generating AI captions with image analysis");
    
    // Générer un article de fallback basé sur la catégorie du décor
    const getFallbackArticle = (category: string = '') => {
      const cat = category.toLowerCase();
      if (cat.includes('metal')) {
        return `La lumière joue sur les surfaces métallisées avec une élégance rare. Dans cet espace, les reflets subtils des finitions DICA créent une atmosphère résolument contemporaine. Le regard se pose, captivé par ces nuances qui évoluent au fil des heures. Derrière cette modernité assumée se cache une technologie de pointe : des surfaces anti-trace qui conservent leur éclat au quotidien, une résistance aux rayures qui défie le temps. L'entretien devient un geste simple, presque anodin. C'est ainsi que DICA réconcilie l'audace esthétique et la praticité du quotidien.`;
      } else if (cat.includes('bois')) {
        return `La chaleur du bois enveloppe l'espace d'une présence rassurante. Les finitions DICA reproduisent avec une fidélité troublante les veinages naturels, ces lignes qui racontent l'histoire de chaque essence. La main effleure la surface et découvre un toucher authentique, une texture qui invite à la contemplation. Pourtant, derrière cette apparence organique se cache une robustesse exemplaire : stabilité dimensionnelle parfaite, résistance aux variations d'humidité, pérennité garantie. Le beau et le durable ne font plus qu'un.`;
      } else if (cat.includes('marbre')) {
        return `Les veines du marbre dessinent sur les surfaces une cartographie silencieuse du temps. Les finitions DICA capturent cette noblesse minérale avec une précision qui frôle la perfection. Chaque nuance, chaque nervure trouve sa place dans cette reproduction haute définition. Mais l'illusion s'accompagne d'un avantage précieux : la légèreté. Là où le marbre naturel impose ses contraintes, DICA offre une liberté nouvelle. La pose se simplifie, les possibilités se multiplient. L'élégance aristocratique devient accessible.`;
      } else {
        return `La lumière du jour glisse sur les surfaces avec une douceur inattendue. Dans cet espace, chaque détail a été pensé pour créer une harmonie visuelle qui apaise autant qu'elle fascine. Les finitions DICA, avec leur texture subtile et leurs reflets maîtrisés, transforment les murs en véritables tableaux vivants. Derrière cette élégance se cache une robustesse remarquable : des matériaux conçus pour traverser le temps sans jamais perdre de leur éclat. Un simple geste d'entretien suffit à leur redonner toute leur splendeur. C'est ainsi que le beau rejoint le durable.`;
      }
    };
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-magazine-captions', {
        body: {
          projectName: options.project.name,
          projectType: options.project.type,
          decorLabel: options.decor.name,
          decorReference: options.decor.referenceCode,
          decorCategory: options.decor.category,
          imageUrl: options.images[0]?.url // Pass first image for analysis
        }
      });

      if (error) throw error;
      
      if (!data || !data.headline || !data.subheadline || !data.slugline || !data.caption) {
        throw new Error("Invalid AI response");
      }

      console.log("✅ AI captions generated:", data);
      return {
        headline: data.headline,
        subheadline: data.subheadline,
        slugline: data.slugline,
        caption: data.caption,
        article: data.article || getFallbackArticle(options.decor.category)
      };

    } catch (error: any) {
      console.error("❌ AI caption generation failed:", error);
      // Fallback avec article storytelling
      return {
        headline: "Quand la lumière rencontre la matière",
        subheadline: `Un dialogue subtil entre l'espace et les surfaces, où chaque reflet raconte une histoire d'élégance intemporelle.`,
        slugline: "L'art du raffinement",
        caption: `Les finitions DICA subliment cet espace avec une grâce naturelle`,
        article: getFallbackArticle(options.decor.category)
      };
    }
  }

  /**
   * PAGE 1 - AD Magazine Cover with DICA branding
   */
  private async renderCoverPage(
    pdf: jsPDF, 
    options: MagazineDecoOptions,
    image: LoadedImage,
    aiCaptions: MagazineAICaption | undefined,
    pageWidth: number,
    pageHeight: number
  ) {
    const { colors } = MAGAZINE_DECO_CONFIG;
    
    // Full bleed image - cover mode (remplir toute la page sans bandes)
    const imgRatio = image.width / image.height;
    const pageRatio = pageWidth / pageHeight;
    
    let finalWidth, finalHeight, x, y;
    
    // Mode "cover" - l'image remplit toute la page (accepte le crop)
    if (imgRatio > pageRatio) {
      // Image plus large - fit en hauteur, crop sur les côtés
      finalHeight = pageHeight;
      finalWidth = finalHeight * imgRatio;
      x = (pageWidth - finalWidth) / 2;
      y = 0;
    } else {
      // Image plus haute - fit en largeur, crop en haut/bas
      finalWidth = pageWidth;
      finalHeight = finalWidth / imgRatio;
      x = 0;
      y = (pageHeight - finalHeight) / 2;
    }
    
    // Add image (no background fill, direct full bleed)
    pdf.addImage(image.base64, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    
    // ═══════════════════════════════════════════════════════════════════
    // DICA BRANDING - Logo magazine élégant ivoire
    // ═══════════════════════════════════════════════════════════════════
    
    // Titre "DICA" - Grand, ivoire avec ombre grise
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(90); // Très grand pour impact maximum
    
    // Ombre grise (plusieurs couches pour profondeur)
    pdf.setTextColor(80, 80, 80); // Gris foncé
    for (let dx = 1.5; dx <= 3; dx += 0.5) {
      for (let dy = 1.5; dy <= 3; dy += 0.5) {
        pdf.text("DICA", 10 + dx, 42 + dy);
      }
    }
    
    // Texte principal en IVOIRE (crème élégant)
    pdf.setTextColor(255, 250, 240); // Ivoire / Floral White
    pdf.text("DICA", 10, 42);
    
    // Sous-titre élégant en ivoire
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80); // Ombre
    pdf.text("DÉCOR  MAGAZINE", 10.4, 52.4);
    pdf.setTextColor(255, 250, 240); // Ivoire
    pdf.text("DÉCOR  MAGAZINE", 10, 52);
    
    // OVERLAY TEXT ON IMAGE (style AD)
    const headline = aiCaptions?.headline || "La nouvelle décoration";
    const subheadline = aiCaptions?.subheadline || "Découvrez une nouvelle dimension de l'élégance intérieure avec les finitions DICA.";
    
    // ═══════════════════════════════════════════════════════════════════
    // TITRE PRINCIPAL - IVOIRE, GRAND, TYPO MAGAZINE DÉCO
    // ═══════════════════════════════════════════════════════════════════
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(56); // Plus grand pour effet premium
    
    const headlineX = 25;
    const headlineY = pageHeight * 0.40;
    const maxWidth = pageWidth - 50;
    
    const headlineLines = pdf.splitTextToSize(headline, maxWidth);
    
    // Ombre grise subtile pour profondeur
    pdf.setTextColor(60, 60, 60);
    for (let dx = 1; dx <= 2.5; dx += 0.5) {
      for (let dy = 1; dy <= 2.5; dy += 0.5) {
        pdf.text(headlineLines, headlineX + dx, headlineY + dy);
      }
    }
    
    // Texte principal en IVOIRE (255, 250, 240)
    pdf.setTextColor(255, 250, 240);
    pdf.text(headlineLines, headlineX, headlineY);
    
    // ═══════════════════════════════════════════════════════════════════
    // SOUS-TITRE - "À LA UNE CE MOIS-CI :" + Texte IA
    // ═══════════════════════════════════════════════════════════════════
    
    const subY = headlineY + (headlineLines.length * 18) + 20;
    
    // Label "À la une ce mois-ci :" en Times italic, taille moyenne
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(12);
    pdf.setTextColor(220, 220, 220); // Gris clair élégant
    pdf.text("À la une ce mois-ci :", headlineX, subY);
    
    // Texte IA généré en Times normal, un peu plus petit
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(240, 240, 240); // Presque blanc, légèrement plus foncé que le titre
    const subLines = pdf.splitTextToSize(subheadline, maxWidth);
    pdf.text(subLines, headlineX, subY + 8, { lineHeightFactor: 1.4 });
    
    // Date (top-right, discret)
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    const now = new Date();
    const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
    const dateText = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - dateWidth - 12, 15);
    
    // FAKE BARCODE (bottom-right, vertical)
    const barcodeX = pageWidth - 15;
    const barcodeY = pageHeight - 70;
    const barcodeHeight = 50;
    const barWidth = 1.2;
    
    pdf.setFillColor(0, 0, 0);
    // Generate realistic barcode pattern
    for (let i = 0; i < 35; i++) {
      const barHeight = Math.random() * barcodeHeight * 0.85 + barcodeHeight * 0.15;
      const yOffset = barcodeY + (barcodeHeight - barHeight) / 2;
      pdf.rect(barcodeX + (i * (barWidth + 0.4)), yOffset, barWidth, barHeight, 'F');
    }
    
    // Barcode number below
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text("9 782847 365894", barcodeX - 10, barcodeY + barcodeHeight + 6);
    
    // Magazine code above barcode
    pdf.setFontSize(5);
    pdf.text("M 02650-894", barcodeX - 6, barcodeY - 3);
  }

  /**
   * PAGE 2 - Material Focus with opacity background
   */
  private async renderNarrativePage(
    pdf: jsPDF,
    options: MagazineDecoOptions,
    image: LoadedImage,
    aiCaptions: MagazineAICaption | undefined,
    pageWidth: number,
    pageHeight: number
  ) {
    const { margins, typography, colors } = MAGAZINE_DECO_CONFIG;
    
    // Background: enlarged hero image with 15% opacity
    const bgImgRatio = image.width / image.height;
    const bgPageRatio = pageWidth / pageHeight;
    
    let bgWidth, bgHeight, bgX, bgY;
    if (bgImgRatio > bgPageRatio) {
      bgHeight = pageHeight;
      bgWidth = bgHeight * bgImgRatio;
      bgX = (pageWidth - bgWidth) / 2;
      bgY = 0;
    } else {
      bgWidth = pageWidth;
      bgHeight = bgWidth / bgImgRatio;
      bgX = 0;
      bgY = (pageHeight - bgHeight) / 2;
    }
    
    // Add background with opacity (using lighter version)
    pdf.setGState(pdf.GState({ opacity: 0.15 }));
    pdf.addImage(image.base64, 'JPEG', bgX, bgY, bgWidth, bgHeight, undefined, 'FAST');
    pdf.setGState(pdf.GState({ opacity: 1.0 }));
    
    // Foreground: sharp centered main image
    const imgRatio = image.width / image.height;
    const targetWidth = (pageWidth - margins.left - margins.right) * 0.75;
    const targetHeight = targetWidth / imgRatio;
    const maxHeight = pageHeight * 0.65;
    
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    if (targetHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }
    
    const imgX = (pageWidth - finalWidth) / 2;
    const imgY = margins.top + 15;
    
    pdf.addImage(image.base64, 'JPEG', imgX, imgY, finalWidth, finalHeight, undefined, 'FAST');
    
    // Left margin: vertical DICA red bar (70% page height)
    const barHeight = pageHeight * 0.7;
    const barY = (pageHeight - barHeight) / 2;
    pdf.setDrawColor(colors.dicaRed);
    pdf.setLineWidth(2);
    pdf.line(margins.left, barY, margins.left, barY + barHeight);
    
    // Material swatches (extract from decor or use defaults)
    const swatchY = imgY + finalHeight + 18;
    const swatchSize = 15;
    const swatchSpacing = 20;
    
    // Default material colors (can be enhanced with actual color extraction)
    const materialColors = [
      [44, 62, 80],   // Dark slate
      [189, 195, 199], // Light gray
      [149, 165, 166], // Medium gray
      [127, 140, 141]  // Blue gray
    ];
    
    materialColors.forEach((color, i) => {
      const swatchX = margins.left + 10 + (i * swatchSpacing);
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.rect(swatchX, swatchY, swatchSize, swatchSize, 'FD');
    });
    
    const contentY = swatchY + swatchSize + 16;
    
    // Slugline (handwritten, with red accent, AD style)
    if (aiCaptions?.slugline) {
      const slugX = margins.left + 10;
      const slugY = contentY;
      
      // Red vertical bar accent
      pdf.setFillColor(colors.dicaRed);
      pdf.rect(slugX - 3, slugY - 5, 2, 12, 'F');
      
      pdf.setFont(typography.slugline.fontFamily, 'normal');
      pdf.setFontSize(typography.slugline.fontSize);
      pdf.setTextColor(typography.slugline.color);
      
      // Rotate text slightly for handwritten feel (-3 degrees)
      pdf.text(aiCaptions.slugline, slugX + 3, slugY, { angle: -3 });
    }
    
    // Caption (serif italic, left aligned, AD style)
    if (aiCaptions?.caption) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      const captionX = margins.left + 10;
      const captionY = contentY + 18;
      const maxWidth = (pageWidth * 0.6);
      
      const lines = pdf.splitTextToSize(aiCaptions.caption, maxWidth);
      pdf.text(lines, captionX, captionY, { 
        lineHeightFactor: 1.5
      });
    }
    
    // Decor info block (bottom-left)
    const decorY = pageHeight - margins.bottom - 30;
    
    pdf.setFont('Playfair Display', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(colors.textPrimary);
    pdf.text(options.decor.name, margins.left + 10, decorY);
    
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.textLight);
    pdf.text(`Réf. ${options.decor.referenceCode}`, margins.left + 10, decorY + 5);
    
    if (options.decor.category) {
      pdf.setFontSize(8);
      pdf.text(options.decor.category, margins.left + 10, decorY + 9);
    }
    
    // Footer
    this.renderFooter(pdf, pageWidth, pageHeight, 2);
  }

  /**
   * PAGE 3+ - Additional images with minimal captions
   */
  private async renderImagePage(
    pdf: jsPDF,
    image: LoadedImage,
    pageWidth: number,
    pageHeight: number,
    pageNumber: number
  ) {
    const { margins, colors } = MAGAZINE_DECO_CONFIG;
    
    // Centered image with generous white space
    const imgRatio = image.width / image.height;
    const targetWidth = (pageWidth - margins.left - margins.right) * 0.8;
    const targetHeight = targetWidth / imgRatio;
    const maxHeight = pageHeight * 0.7;
    
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    if (targetHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }
    
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;
    
    pdf.addImage(image.base64, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    
    // Small page number bottom-left
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.textLight);
    pdf.text(`${pageNumber}`, margins.left + 10, pageHeight - margins.bottom);
    
    // Footer
    this.renderFooter(pdf, pageWidth, pageHeight, pageNumber);
  }

  /**
   * PAGE 2+ - Editorial avec composition multi-images (AVANT/APRÈS côte à côte)
   */
  private async renderEditorialArticlePage(
    pdf: jsPDF,
    originalImage: LoadedImage | null,
    renderedImage: LoadedImage,
    options: MagazineDecoOptions,
    aiCaptions: MagazineAICaption | undefined,
    pageWidth: number,
    pageHeight: number,
    pageNumber: number
  ) {
    const { margins, colors } = MAGAZINE_DECO_CONFIG;
    
    // ═══════════════════════════════════════════════════════════════════
    // EN-TÊTE - Logo DICA centré
    // ═══════════════════════════════════════════════════════════════════
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    const logoText = "DICA";
    const logoWidth = pdf.getTextWidth(logoText);
    pdf.text(logoText, (pageWidth - logoWidth) / 2, 16);
    
    // ═══════════════════════════════════════════════════════════════════
    // COMPOSITION IMAGE - Fusion avant/après en une seule image A4
    // ═══════════════════════════════════════════════════════════════════
    const compositionY = 25;
    const compositionHeight = pageHeight * 0.70;
    
    let finalImageBase64: string;
    let finalImageWidth: number;
    let finalImageHeight: number;
    
    if (originalImage) {
      // Créer une image composite fusionnant avant/après
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Dimensions A4 paysage optimisées
      const compositeWidth = 2000;
      const compositeHeight = 1400;
      canvas.width = compositeWidth;
      canvas.height = compositeHeight;
      
      // Fond blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, compositeWidth, compositeHeight);
      
      // Dimensions pour chaque image
      const gap = 40;
      const labelHeight = 80;
      const singleWidth = (compositeWidth - gap) / 2;
      const imageHeight = compositeHeight - labelHeight;
      
      // Charger les images
      const originalImg = new Image();
      const renderedImg = new Image();
      
      await Promise.all([
        new Promise((resolve) => {
          originalImg.onload = resolve;
          originalImg.src = originalImage.base64.startsWith('data:') 
            ? originalImage.base64 
            : `data:image/jpeg;base64,${originalImage.base64}`;
        }),
        new Promise((resolve) => {
          renderedImg.onload = resolve;
          renderedImg.src = renderedImage.base64.startsWith('data:') 
            ? renderedImage.base64 
            : `data:image/jpeg;base64,${renderedImage.base64}`;
        })
      ]);
      
      // Fonction pour dessiner une image avec fit
      const drawImageFit = (img: HTMLImageElement, x: number, width: number) => {
        const ratio = img.height / img.width;
        const finalH = Math.min(imageHeight, width * ratio);
        const finalW = finalH / ratio;
        const offsetX = x + (width - finalW) / 2;
        const offsetY = labelHeight + (imageHeight - finalH) / 2;
        ctx.drawImage(img, offsetX, offsetY, finalW, finalH);
      };
      
      // Labels en haut - Police élégante serif italique (style magazine)
      ctx.font = 'italic 52px "Times New Roman", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Label AVANT (gauche, gris élégant)
      ctx.fillStyle = '#4A4A4A';
      ctx.fillText('Avant', singleWidth / 2, 18);
      
      // Label APRÈS (droite, rouge DICA)
      ctx.fillStyle = '#DC2626';
      ctx.fillText('Après', singleWidth + gap + singleWidth / 2, 18);
      
      // Dessiner les images
      drawImageFit(originalImg, 0, singleWidth);
      drawImageFit(renderedImg, singleWidth + gap, singleWidth);
      
      // Convertir en base64
      finalImageBase64 = canvas.toDataURL('image/jpeg', 0.95);
      finalImageWidth = compositeWidth;
      finalImageHeight = compositeHeight;
      
    } else {
      // Image unique
      finalImageBase64 = renderedImage.base64;
      finalImageWidth = renderedImage.width;
      finalImageHeight = renderedImage.height;
    }
    
    // Ajouter l'image finale au PDF (centrée, format A4)
    const imgRatio = finalImageHeight / finalImageWidth;
    const maxWidth = pageWidth - margins.left - margins.right;
    let imgW = maxWidth * 0.95;
    let imgH = imgW * imgRatio;
    
    if (imgH > compositionHeight) {
      imgH = compositionHeight;
      imgW = imgH / imgRatio;
    }
    
    const imgX = (pageWidth - imgW) / 2;
    pdf.addImage(finalImageBase64, 'JPEG', imgX, compositionY, imgW, imgH, undefined, 'FAST');
    
    // Référence décor sous l'image
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    const creditText = `${options.decor.name} • Réf. ${options.decor.referenceCode}`;
    const creditWidth = pdf.getTextWidth(creditText);
    pdf.text(creditText, (pageWidth - creditWidth) / 2, compositionY + imgH + 5);
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION TEXTE ÉDITORIALE
    // ═══════════════════════════════════════════════════════════════════
    const textSectionY = compositionY + imgH + 15; // Espace après l'image composite
    
    // Label "DÉCORATION" centré avec lignes
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.dicaRed);
    const labelText = "DÉCORATION";
    const labelWidth = pdf.getTextWidth(labelText);
    const labelX = (pageWidth - labelWidth) / 2;
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(40, textSectionY, labelX - 5, textSectionY);
    pdf.line(labelX + labelWidth + 5, textSectionY, pageWidth - 40, textSectionY);
    pdf.text(labelText, labelX, textSectionY + 1);
    
    // ─────────────────────────────────────────────────────────────────────
    // TITRE (grande typographie serif italique)
    // ─────────────────────────────────────────────────────────────────────
    const titleY = textSectionY + 8; // Espace minimal
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(20); // Légèrement réduit pour mieux proportionner
    pdf.setTextColor(0, 0, 0);
    
    const articleTitle = aiCaptions?.headline || "L'art de la transformation";
    const titleLines = pdf.splitTextToSize(articleTitle, pageWidth - 50);
    
    let currentTitleY = titleY;
    titleLines.forEach((line: string) => {
      const lineWidth = pdf.getTextWidth(line);
      pdf.text(line, (pageWidth - lineWidth) / 2, currentTitleY);
      currentTitleY += 8; // Interligne réduit
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // ARTICLE TECHNIQUE (par l'expert stratifiés)
    // ─────────────────────────────────────────────────────────────────────
    const articleY = currentTitleY + 4; // Espace minimal
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    
    // Article éditorial OU fallback storytelling
    const articleText = aiCaptions?.article || aiCaptions?.subheadline || 
      `La lumière du jour glisse sur les surfaces avec une douceur inattendue. Dans cet espace, chaque détail a été pensé pour créer une harmonie visuelle qui apaise autant qu'elle fascine. Les finitions DICA, avec leur texture subtile et leurs reflets maîtrisés, transforment les murs en véritables tableaux vivants. Derrière cette élégance se cache une robustesse remarquable : des matériaux conçus pour traverser le temps sans jamais perdre de leur éclat. Un simple geste d'entretien suffit à leur redonner toute leur splendeur.`;
    
    const articleLines = pdf.splitTextToSize(articleText, pageWidth - 40);
    
    // Texte justifié en deux colonnes si article long
    if (articleLines.length > 6) {
      // Article long: mise en page sur largeur complète
      pdf.text(articleLines, margins.left + 10, articleY, {
        lineHeightFactor: 1.6,
        maxWidth: pageWidth - 40
      });
    } else {
      // Article court: centré
      articleLines.forEach((line: string, idx: number) => {
        pdf.text(line, margins.left + 10, articleY + (idx * 4.5));
      });
    }
    
    const articleHeight = Math.min(articleLines.length * 4.5, 50);
    
    // ─────────────────────────────────────────────────────────────────────
    // AUTEUR & DATE
    // ─────────────────────────────────────────────────────────────────────
    const authorY = articleY + articleHeight + 8;
    pdf.setFont('Inter', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    const authorText = "Par la rédaction DICA DÉCOR";
    const authorWidth = pdf.getTextWidth(authorText);
    pdf.text(authorText, (pageWidth - authorWidth) / 2, authorY);
    
    const now = new Date();
    const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
    const dateText = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, (pageWidth - dateWidth) / 2, authorY + 4);
    
    // ═══════════════════════════════════════════════════════════════════
    // NUMÉRO DE PAGE (grand, discret)
    // ═══════════════════════════════════════════════════════════════════
    pdf.setFont('Times', 'bold');
    pdf.setFontSize(36);
    pdf.setTextColor(235, 235, 235);
    pdf.text(pageNumber.toString(), pageWidth - margins.right - 15, pageHeight - margins.bottom + 5);
    
    // Footer
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(5);
    pdf.setTextColor(180, 180, 180);
    pdf.text("Visuels non contractuels • www.dica-france.com", margins.left, pageHeight - 6);
  }
  
  /**
   * Get default intro when AI captions not available
   */
  private getDefaultIntro(decorCategory: string): string {
    return "Les finitions DICA transforment chaque espace en une œuvre d'exception, où la qualité des matériaux et la précision de l'application créent une atmosphère unique.";
  }
  
  /**
   * Get default commentary when AI captions not available
   */
  private getDefaultCommentary(decorName: string): string {
    return `L'application de la finition ${decorName} révèle tout le potentiel de cet espace. La texture subtile et la profondeur du matériau créent un dialogue harmonieux avec l'architecture, offrant aux professionnels un outil de persuasion visuelle incomparable pour convaincre leurs clients.`;
  }
  
  /**
   * Load single image with base64
   */
  private async loadSingleImageWithBase64(url: string): Promise<LoadedImage> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
    
    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);
    const dimensions = await this.getImageDimensions(url);
    
    return {
      url,
      base64,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  /**
   * Render footer on all pages
   */
  private renderFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number) {
    const { margins, typography, colors } = MAGAZINE_DECO_CONFIG;
    
    pdf.setFont(typography.body.fontFamily, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(colors.textLight);
    
    const footerText = "Visuels non contractuels — DICA France — www.dica-france.com";
    const textWidth = pdf.getTextWidth(footerText);
    const footerX = pageWidth - margins.right - textWidth;
    const footerY = pageHeight - margins.bottom + 5;
    
    pdf.text(footerText, footerX, footerY);
  }

  /**
   * Load images with base64 encoding
   */
  private async loadImagesWithBase64(images: any[]): Promise<LoadedImage[]> {
    console.log("📷 Loading images with base64...");
    
    const promises = images.map(async (img) => {
      try {
        const response = await fetch(img.url);
        if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
        
        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);
        
        // Get dimensions
        const dimensions = await this.getImageDimensions(img.url);
        
        return {
          url: img.url,
          base64,
          width: dimensions.width,
          height: dimensions.height
        };
      } catch (error) {
        console.error("Failed to load image:", img.url, error);
        throw error;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * PAGE FINALE - Certifications, Solutions et Contact DICA
   * Style éditorial premium avec typographie élégante
   */
  private async renderClosingPage(
    pdf: jsPDF,
    pageWidth: number,
    pageHeight: number
  ) {
    // Fond blanc cassé élégant
    pdf.setFillColor(253, 252, 250);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    const marginX = 25;
    const contentWidth = pageWidth - 50;
    let currentY = 40;
    
    // ═══════════════════════════════════════════════════════════════════
    // EN-TÊTE ÉLÉGANT
    // ═══════════════════════════════════════════════════════════════════
    
    // Filet fin décoratif en haut
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, 25, pageWidth - marginX, 25);
    
    // Titre principal en Times italic
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(28);
    pdf.setTextColor(50, 50, 50);
    pdf.text('Notre engagement', marginX, currentY);
    
    currentY += 15;
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION CONSCIENCE ÉCOLOGIQUE
    // ═══════════════════════════════════════════════════════════════════
    
    // Sous-titre élégant
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(12);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Une démarche responsable au cœur de notre métier', marginX, currentY);
    
    currentY += 15;
    
    // Texte principal
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    const ecoText1 = `Dica France inscrit son développement dans une philosophie de respect et de durabilité. Nos partenariats avec les filières certifiées PEFC et FSC témoignent de notre attachement à la préservation des forêts et à une traçabilité rigoureuse de chaque matériau.`;
    
    const ecoLines1 = pdf.splitTextToSize(ecoText1, contentWidth);
    pdf.text(ecoLines1, marginX, currentY);
    currentY += ecoLines1.length * 5 + 8;
    
    // Citation mise en valeur
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    const quote = `« La qualité d'un matériau se mesure autant à sa beauté qu'à son impact sur notre environnement. »`;
    pdf.text(quote, marginX + 10, currentY);
    
    currentY += 15;
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION EXCELLENCE & NORMES
    // ═══════════════════════════════════════════════════════════════════
    
    // Titre section
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(50, 50, 50);
    pdf.text('Excellence et exigences', marginX, currentY);
    
    // Filet sous le titre
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, currentY + 3, marginX + 45, currentY + 3);
    
    currentY += 15;
    
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    const qualityText = `Nos stratifiés et compacts répondent aux normes européennes les plus strictes. La certification EN 438 garantit la résistance et la durabilité de nos surfaces, tandis que le classement feu M1 assure une sécurité optimale pour tous les environnements, des espaces publics aux projets résidentiels d'exception.`;
    
    const qualityLines = pdf.splitTextToSize(qualityText, contentWidth);
    pdf.text(qualityLines, marginX, currentY);
    
    currentY += qualityLines.length * 5 + 15;
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION SAVOIR-FAIRE
    // ═══════════════════════════════════════════════════════════════════
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(50, 50, 50);
    pdf.text('Domaines d\'expertise', marginX, currentY);
    
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, currentY + 3, marginX + 50, currentY + 3);
    
    currentY += 12;
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Interlocuteur privilégié des industriels et agenceurs depuis plus de 30 ans.', marginX, currentY);
    
    currentY += 12;
    
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    const expertises = [
      { title: 'Décoration intérieure', desc: 'Panneaux stratifiés HPL, compacts et postformables pour mobilier, habillages muraux et plans de travail.' },
      { title: 'Cabines d\'ascenseurs', desc: 'Solutions complètes en stratifié compact : parois, plafonds et sols, prêts à poser.' },
      { title: 'Agencement mobile', desc: 'Contreplaqués replaqués légers pour véhicules de loisirs et aménagements nomades.' }
    ];
    
    for (const exp of expertises) {
      // Titre en italique
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`— ${exp.title}`, marginX, currentY);
      
      currentY += 5;
      
      // Description
      pdf.setFont('Times', 'normal');
      pdf.setTextColor(70, 70, 70);
      const descLines = pdf.splitTextToSize(exp.desc, contentWidth - 10);
      pdf.text(descLines, marginX + 5, currentY);
      currentY += descLines.length * 4.5 + 6;
    }
    
    currentY += 10;
    
    // ═══════════════════════════════════════════════════════════════════
    // BLOC CONTACT ÉLÉGANT
    // ═══════════════════════════════════════════════════════════════════
    
    // Filet de séparation
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, currentY, pageWidth - marginX, currentY);
    
    currentY += 15;
    
    // DICA France en typographie élégante
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(22);
    pdf.setTextColor(60, 60, 60);
    pdf.text('DICA', marginX, currentY);
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 120);
    pdf.text('France', marginX + 32, currentY);
    
    currentY += 12;
    
    // Coordonnées en style magazine
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    
    pdf.text("13, rue Marcel Chabloz", marginX, currentY);
    currentY += 5;
    pdf.text("38400 Saint-Martin-d'Hères", marginX, currentY);
    currentY += 8;
    
    pdf.setFont('Times', 'italic');
    pdf.text("Tél. 04 76 25 82 83", marginX, currentY);
    currentY += 5;
    pdf.text("info@dica-france.fr", marginX, currentY);
    pdf.text("www.dica-france.fr", marginX + 50, currentY);
    
    // ═══════════════════════════════════════════════════════════════════
    // FOOTER DISCRET
    // ═══════════════════════════════════════════════════════════════════
    
    // Filet fin en bas
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, pageHeight - 20, pageWidth - marginX, pageHeight - 20);
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.text(
      "PEFC • FSC • EN 438 • Classement feu M1",
      pageWidth / 2,
      pageHeight - 14,
      { align: 'center' }
    );
  }

  /**
   * Generate PDF filename
   */
  private generateFilename(projectName: string): string {
    const sanitized = projectName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    const date = new Date().toISOString().split('T')[0];
    return `magazine_deco_${sanitized}_${date}.pdf`;
  }

  /**
   * Get project type label
   */
  private getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ascenseur: 'Ascenseur',
      restaurant: 'Restaurant',
      hotel: 'Hôtel',
      bureau: 'Bureau',
      van: 'Van aménagé',
      cuisine: 'Cuisine',
      terrasse: 'Terrasse',
      autre: 'Autre'
    };
    return labels[type] || type;
  }
}

interface LoadedImage {
  url: string;
  base64: string;
  width: number;
  height: number;
}

// Export singleton instance
export const magazineDecoPdfService = MagazineDecoPdfService.getInstance();
