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
        caption: data.caption
      };

    } catch (error: any) {
      console.error("❌ AI caption generation failed:", error);
      // Fallback to generic captions (no specific décor mention)
      return {
        headline: "L'excellence du design intérieur",
        subheadline: `Découvrez comment les finitions DICA transforment les espaces avec une élégance intemporelle et une précision exceptionnelle.`,
        slugline: "Style et élégance",
        caption: `Les finitions DICA subliment cet espace avec raffinement`
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
    
    // Headline (center-left, mix of italic and caps like AD)
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(48);
    
    // Text shadow effect
    pdf.setTextColor(0, 0, 0);
    const headlineX = 25;
    const headlineY = pageHeight * 0.42;
    const maxWidth = pageWidth - 50;
    
    const headlineLines = pdf.splitTextToSize(headline, maxWidth);
    
    // Shadow layers
    for (let dx = 0.4; dx <= 1.2; dx += 0.4) {
      for (let dy = 0.4; dy <= 1.2; dy += 0.4) {
        pdf.text(headlineLines, headlineX + dx, headlineY + dy);
      }
    }
    
    // White text on top
    pdf.setTextColor(255, 255, 255);
    pdf.text(headlineLines, headlineX, headlineY);
    
    // Sub-headline box with red accent (AD style)
    const subY = headlineY + (headlineLines.length * 16) + 15;
    
    // Red "LUMIÈRE!" style accent
    pdf.setFillColor(colors.dicaRed);
    pdf.rect(headlineX - 2, subY - 8, 4, 20, 'F'); // Vertical red bar
    
    pdf.setFont('Inter', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(colors.dicaRed);
    pdf.text("NOUVEAU", headlineX + 8, subY - 2);
    
    // Sub description (black italic)
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const subLines = pdf.splitTextToSize(subheadline, maxWidth - 40);
    pdf.text(subLines, headlineX + 8, subY + 4, { lineHeightFactor: 1.3 });
    
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
    const targetWidth = (pageWidth - margins.left - margins.right) * 0.7;
    const targetHeight = targetWidth / imgRatio;
    const maxHeight = pageHeight * 0.6;
    
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    if (targetHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }
    
    const imgX = (pageWidth - finalWidth) / 2;
    const imgY = margins.top + 20;
    
    pdf.addImage(image.base64, 'JPEG', imgX, imgY, finalWidth, finalHeight, undefined, 'FAST');
    
    // Left margin: vertical DICA red bar (70% page height)
    const barHeight = pageHeight * 0.7;
    const barY = (pageHeight - barHeight) / 2;
    pdf.setDrawColor(colors.dicaRed);
    pdf.setLineWidth(2);
    pdf.line(margins.left, barY, margins.left, barY + barHeight);
    
    // Material swatches (extract from decor or use defaults)
    const swatchY = imgY + finalHeight + 25;
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
    
    const contentY = swatchY + swatchSize + 20;
    
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
    // COMPOSITION MULTI-IMAGES (AVANT / APRÈS côte à côte)
    // ═══════════════════════════════════════════════════════════════════
    const compositionY = 25;
    const compositionHeight = pageHeight * 0.55;
    const gap = 4; // Espace entre les images
    
    if (originalImage) {
      // Mode AVANT/APRÈS côte à côte
      const halfWidth = (pageWidth - margins.left - margins.right - gap) / 2;
      const leftX = margins.left;
      const rightX = margins.left + halfWidth + gap;
      
      // ─────────────────────────────────────────────────────────────────
      // IMAGE AVANT (gauche)
      // ─────────────────────────────────────────────────────────────────
      const beforeRatio = originalImage.width / originalImage.height;
      let beforeW = halfWidth;
      let beforeH = beforeW / beforeRatio;
      if (beforeH > compositionHeight) {
        beforeH = compositionHeight;
        beforeW = beforeH * beforeRatio;
      }
      const beforeX = leftX + (halfWidth - beforeW) / 2;
      
      pdf.addImage(originalImage.base64, 'JPEG', beforeX, compositionY, beforeW, beforeH, undefined, 'FAST');
      
      // Label AVANT
      pdf.setFont('Inter', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text("AVANT", leftX, compositionY + beforeH + 6);
      
      // ─────────────────────────────────────────────────────────────────
      // IMAGE APRÈS (droite)
      // ─────────────────────────────────────────────────────────────────
      const afterRatio = renderedImage.width / renderedImage.height;
      let afterW = halfWidth;
      let afterH = afterW / afterRatio;
      if (afterH > compositionHeight) {
        afterH = compositionHeight;
        afterW = afterH * afterRatio;
      }
      const afterX = rightX + (halfWidth - afterW) / 2;
      
      pdf.addImage(renderedImage.base64, 'JPEG', afterX, compositionY, afterW, afterH, undefined, 'FAST');
      
      // Label APRÈS avec couleur DICA
      pdf.setTextColor(colors.dicaRed);
      pdf.text("APRÈS", rightX, compositionY + afterH + 6);
      
      // Référence décor sous l'image APRÈS
      pdf.setFont('Inter', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`${options.decor.name} • Réf. ${options.decor.referenceCode}`, rightX, compositionY + afterH + 12);
      
    } else {
      // Mode image unique (pas d'original)
      const imgRatio = renderedImage.width / renderedImage.height;
      const maxWidth = pageWidth - margins.left - margins.right;
      let imgW = maxWidth;
      let imgH = imgW / imgRatio;
      if (imgH > compositionHeight) {
        imgH = compositionHeight;
        imgW = imgH * imgRatio;
      }
      const imgX = (pageWidth - imgW) / 2;
      
      pdf.addImage(renderedImage.base64, 'JPEG', imgX, compositionY, imgW, imgH, undefined, 'FAST');
      
      // Crédits
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`${options.decor.name} • Réf. ${options.decor.referenceCode}`, imgX, compositionY + imgH + 5);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SECTION TEXTE ÉDITORIALE
    // ═══════════════════════════════════════════════════════════════════
    const textSectionY = compositionY + compositionHeight + 20;
    
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
    const titleY = textSectionY + 15;
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    
    const articleTitle = aiCaptions?.headline || "L'art de la transformation";
    const titleLines = pdf.splitTextToSize(articleTitle, pageWidth - 50);
    
    let currentTitleY = titleY;
    titleLines.forEach((line: string) => {
      const lineWidth = pdf.getTextWidth(line);
      pdf.text(line, (pageWidth - lineWidth) / 2, currentTitleY);
      currentTitleY += 9;
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // ARTICLE TECHNIQUE (par l'expert stratifiés)
    // ─────────────────────────────────────────────────────────────────────
    const articleY = currentTitleY + 8;
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    
    // Article technique complet OU fallback sur subheadline
    const articleText = aiCaptions?.article || aiCaptions?.subheadline || 
      `Les panneaux stratifiés haute pression DICA représentent l'aboutissement de décennies de recherche en matériaux de surface. Leur structure multicouche confère une résistance exceptionnelle aux chocs, à l'abrasion et aux produits chimiques. La technologie HPL garantit une stabilité dimensionnelle parfaite, même dans les environnements exigeants comme les cabines d'ascenseur ou les espaces à fort trafic. Les finitions anti-trace facilitent l'entretien quotidien. Certifiés pour les établissements recevant du public avec un classement feu M1, ces revêtements allient performance technique et esthétique premium pour les professionnels les plus exigeants.`;
    
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
    const authorText = "Par Jean-Marc Delacroix, Expert Stratifiés HPL";
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
