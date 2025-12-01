/**
 * Service de génération PDF Brochure Revendeur
 * Clone de Magazine DECO avec couverture personnalisée revendeur
 * 
 * Le NOM DU REVENDEUR remplace "DICA" comme titre principal
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import type { ResellerBranding } from '@/types/plaquette.types';
import type { 
  MagazineDecoOptions, 
  MagazineDecoResult, 
  MagazineAICaption 
} from '@/types/magazine-deco.types';
import { MAGAZINE_DECO_CONFIG } from '@/types/magazine-deco.types';

// Extended options with reseller branding and client customization
export interface ResellerBrochureOptions extends MagazineDecoOptions {
  resellerBranding?: ResellerBranding | null;
  /** Nom du client pour personnaliser la brochure (ex: "Hôtel Le Palace") */
  clientName?: string;
}

export class ResellerBrochurePdfService {
  private static instance: ResellerBrochurePdfService;
  
  private constructor() {}
  
  static getInstance(): ResellerBrochurePdfService {
    if (!this.instance) {
      this.instance = new ResellerBrochurePdfService();
    }
    return this.instance;
  }

  /**
   * Valide les informations de branding revendeur
   * Retourne un objet avec la validité et les champs manquants
   */
  validateResellerBranding(branding: ResellerBranding): {
    isValid: boolean;
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    
    // Champs obligatoires
    if (!branding.companyName?.trim()) {
      missingFields.push('companyName');
    }
    
    // Champs recommandés (warnings)
    if (!branding.email?.trim()) {
      warnings.push('Email non renseigné');
    }
    if (!branding.phone?.trim()) {
      warnings.push('Téléphone non renseigné');
    }
    if (!branding.addressLine1?.trim()) {
      warnings.push('Adresse non renseignée');
    }
    if (!branding.city?.trim()) {
      warnings.push('Ville non renseignée');
    }
    
    const isValid = missingFields.length === 0 && branding.enabled;
    const isComplete = isValid && warnings.length === 0;
    
    return {
      isValid,
      isComplete,
      missingFields,
      warnings,
    };
  }

  /**
   * Détermine le titre de couverture
   * - Si revendeur actif → Nom du revendeur
   * - Sinon → DICA
   */
  private getCoverTitle(branding?: ResellerBranding | null): string {
    if (branding?.enabled && branding?.companyName?.trim()) {
      return branding.companyName.trim();
    }
    return 'DICA';
  }

  /**
   * Formate l'adresse complète du revendeur
   */
  private formatFullAddress(branding: ResellerBranding): string {
    const parts = [
      branding.address,
      `${branding.postalCode || ''} ${branding.city || ''}`.trim()
    ].filter(part => part && part.trim());
    return parts.join(', ');
  }

  /**
   * Formate la ligne de contact (téléphone + email)
   */
  private formatContactLine(branding: ResellerBranding): string {
    const parts = [
      branding.phone ? `Tél: ${branding.phone}` : '',
      branding.email ? `${branding.email}` : '',
    ].filter(Boolean);
    return parts.join('  •  ');
  }

  /**
   * Génère un PDF Brochure Revendeur
   */
  async generateResellerBrochurePDF(options: ResellerBrochureOptions): Promise<MagazineDecoResult> {
    console.log("📖 Brochure Revendeur - Starting PDF generation");
    console.log("🏢 Reseller branding:", options.resellerBranding?.companyName || 'DICA (default)');
    console.log("👤 Client name:", options.clientName || '(none)');
    
    try {
      // Validate inputs
      if (!options.project || !options.decor || !options.images || options.images.length === 0) {
        throw new Error("Missing required data for Brochure generation");
      }

      // Generate AI captions for COVER if requested
      let coverCaptions = options.aiCaptions;
      if (options.generateAICaptions && !coverCaptions) {
        coverCaptions = await this.generateAICaptions({
          ...options,
          images: [options.images[0]]
        });
      }

      // Create PDF instance (A4 portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      
      // Load images with base64
      const loadedImages = await this.loadImagesWithBase64(options.images);
      
      // PAGE 1 - COVER with RESELLER BRANDING
      await this.renderResellerCoverPage(
        pdf, 
        options, 
        loadedImages[0], 
        coverCaptions, 
        pageWidth, 
        pageHeight
      );
      
      // PAGE 2+ - EDITORIAL ARTICLES (same as Magazine DECO)
      for (let i = 0; i < loadedImages.length; i++) {
        pdf.addPage();
        
        const pageCaptions = options.generateAICaptions 
          ? await this.generateAICaptions({
              ...options,
              images: [options.images[i]]
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
          pageCaptions,
          pageWidth, 
          pageHeight, 
          i + 2
        );
      }

      // Generate blob
      const blob = pdf.output('blob');
      const filename = this.generateFilename(options.project.name, options.resellerBranding);
      
      console.log("✅ Brochure Revendeur PDF generated:", {
        filename,
        pageCount: pdf.getNumberOfPages(),
        resellerName: options.resellerBranding?.companyName || 'DICA',
        clientName: options.clientName || '(none)'
      });

      return {
        success: true,
        blob,
        filename,
        pageCount: pdf.getNumberOfPages(),
        aiCaptions: coverCaptions
      };

    } catch (error: any) {
      console.error("❌ Brochure Revendeur generation error:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
    }
  }

  /**
   * PAGE 1 - Cover page with RESELLER NAME as title
   */
  private async renderResellerCoverPage(
    pdf: jsPDF, 
    options: ResellerBrochureOptions,
    image: LoadedImage,
    aiCaptions: MagazineAICaption | undefined,
    pageWidth: number,
    pageHeight: number
  ) {
    const { colors } = MAGAZINE_DECO_CONFIG;
    const branding = options.resellerBranding;
    
    // Full bleed image - cover mode
    const imgRatio = image.width / image.height;
    const pageRatio = pageWidth / pageHeight;
    
    let finalWidth, finalHeight, x, y;
    
    if (imgRatio > pageRatio) {
      finalHeight = pageHeight;
      finalWidth = finalHeight * imgRatio;
      x = (pageWidth - finalWidth) / 2;
      y = 0;
    } else {
      finalWidth = pageWidth;
      finalHeight = finalWidth / imgRatio;
      x = 0;
      y = (pageHeight - finalHeight) / 2;
    }
    
    pdf.addImage(image.base64, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    
    // ═══════════════════════════════════════════════════════════════════
    // TITRE PRINCIPAL - NOM DU REVENDEUR ou DICA
    // ═══════════════════════════════════════════════════════════════════
    
    const coverTitle = this.getCoverTitle(branding);
    const isReseller = branding?.enabled && branding?.companyName?.trim();
    
    // Ajuster la taille selon la longueur du nom
    let fontSize = 90;
    if (coverTitle.length > 10) fontSize = 70;
    if (coverTitle.length > 15) fontSize = 55;
    if (coverTitle.length > 20) fontSize = 45;
    
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(fontSize);
    
    // Ombre grise (plusieurs couches pour profondeur)
    pdf.setTextColor(80, 80, 80);
    for (let dx = 1.5; dx <= 3; dx += 0.5) {
      for (let dy = 1.5; dy <= 3; dy += 0.5) {
        pdf.text(coverTitle, 10 + dx, 42 + dy);
      }
    }
    
    // Texte principal en IVOIRE
    pdf.setTextColor(255, 250, 240);
    pdf.text(coverTitle, 10, 42);
    
    // Sous-titre élégant
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("DÉCOR  MAGAZINE", 10.4, 52.4);
    pdf.setTextColor(255, 250, 240);
    pdf.text("DÉCOR  MAGAZINE", 10, 52);
    
    // ═══════════════════════════════════════════════════════════════════
    // NOM DU CLIENT (si fourni)
    // ═══════════════════════════════════════════════════════════════════
    
    if (options.clientName?.trim()) {
      const clientLabel = `Projet pour ${options.clientName.trim()}`;
      
      // Style élégant pour le nom du client
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(14);
      
      // Fond semi-transparent pour le nom client
      const textWidth = pdf.getTextWidth(clientLabel);
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(pdf.GState({ opacity: 0.4 }));
      pdf.roundedRect(8, 57, textWidth + 10, 10, 2, 2, 'F');
      pdf.setGState(pdf.GState({ opacity: 1.0 }));
      
      // Ombre
      pdf.setTextColor(60, 60, 60);
      pdf.text(clientLabel, 13.5, 64.5);
      
      // Texte principal - couleur dorée élégante
      pdf.setTextColor(255, 215, 150);
      pdf.text(clientLabel, 13, 64);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INFOS REVENDEUR (si branding actif)
    // ═══════════════════════════════════════════════════════════════════
    
    if (isReseller && branding) {
      // Bloc d'informations revendeur en bas de page
      const infoBlockY = pageHeight - 65;
      const infoBlockX = 15;
      
      // Fond semi-transparent
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(pdf.GState({ opacity: 0.5 }));
      pdf.roundedRect(infoBlockX - 5, infoBlockY - 5, 120, 55, 3, 3, 'F');
      pdf.setGState(pdf.GState({ opacity: 1.0 }));
      
      // "Présenté par" label
      pdf.setFont('Inter', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text("Présenté par", infoBlockX, infoBlockY);
      
      // Nom contact (si fourni)
      if (branding.contactName) {
        pdf.setFont('Inter', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.text(branding.contactName, infoBlockX, infoBlockY + 8);
      }
      
      // Adresse
      const fullAddress = this.formatFullAddress(branding);
      if (fullAddress) {
        pdf.setFont('Inter', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(220, 220, 220);
        pdf.text(fullAddress, infoBlockX, infoBlockY + 16);
      }
      
      // Contact (téléphone + email)
      const contactLine = this.formatContactLine(branding);
      if (contactLine) {
        pdf.setFont('Inter', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(220, 220, 220);
        pdf.text(contactLine, infoBlockX, infoBlockY + 24);
      }
      
      // Website
      if (branding.website) {
        pdf.setFont('Inter', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(255, 200, 200); // Rouge clair
        pdf.text(branding.website, infoBlockX, infoBlockY + 32);
      }
      
      // Tagline (slogan)
      if (branding.tagline) {
        pdf.setFont('Times', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(255, 250, 240);
        pdf.text(`"${branding.tagline}"`, infoBlockX, infoBlockY + 42);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // HEADLINE IA (texte principal sur l'image)
    // ═══════════════════════════════════════════════════════════════════
    
    const headline = aiCaptions?.headline || "La nouvelle décoration";
    const subheadline = aiCaptions?.subheadline || "Découvrez une nouvelle dimension de l'élégance intérieure.";
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(48);
    
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
    
    pdf.setTextColor(255, 255, 255);
    pdf.text(headlineLines, headlineX, headlineY);
    
    // Sub-headline box
    const subY = headlineY + (headlineLines.length * 16) + 15;
    
    pdf.setFillColor(colors.dicaRed);
    pdf.rect(headlineX - 2, subY - 8, 4, 20, 'F');
    
    pdf.setFont('Inter', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(colors.dicaRed);
    pdf.text("NOUVEAU", headlineX + 8, subY - 2);
    
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const subLines = pdf.splitTextToSize(subheadline, maxWidth - 40);
    pdf.text(subLines, headlineX + 8, subY + 4, { lineHeightFactor: 1.3 });
    
    // Date (top-right)
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    const now = new Date();
    const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
    const dateText = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - dateWidth - 12, 15);
    
    // Barcode (bottom-right)
    const barcodeX = pageWidth - 15;
    const barcodeY = pageHeight - 70;
    const barcodeHeight = 50;
    const barWidth = 1.2;
    
    pdf.setFillColor(0, 0, 0);
    for (let i = 0; i < 35; i++) {
      const barHeight = Math.random() * barcodeHeight * 0.85 + barcodeHeight * 0.15;
      const yOffset = barcodeY + (barcodeHeight - barHeight) / 2;
      pdf.rect(barcodeX + (i * (barWidth + 0.4)), yOffset, barWidth, barHeight, 'F');
    }
    
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text("9 782847 365894", barcodeX - 10, barcodeY + barcodeHeight + 6);
    pdf.setFontSize(5);
    pdf.text("M 02650-894", barcodeX - 6, barcodeY - 3);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MÉTHODES HÉRITÉES DE MAGAZINE DECO (sans modification)
  // ═══════════════════════════════════════════════════════════════════

  private async generateAICaptions(options: MagazineDecoOptions): Promise<MagazineAICaption> {
    console.log("🤖 Generating AI captions");
    
    const getFallbackArticle = (category: string = '') => {
      const cat = category.toLowerCase();
      if (cat.includes('metal')) {
        return `La lumière joue sur les surfaces métallisées avec une élégance rare. Les finitions créent une atmosphère résolument contemporaine. Le regard se pose, captivé par ces nuances qui évoluent au fil des heures.`;
      } else if (cat.includes('bois')) {
        return `La chaleur du bois enveloppe l'espace d'une présence rassurante. Les finitions reproduisent avec une fidélité troublante les veinages naturels.`;
      } else if (cat.includes('marbre')) {
        return `Les veines du marbre dessinent sur les surfaces une cartographie silencieuse du temps. Chaque nuance trouve sa place dans cette reproduction haute définition.`;
      } else {
        return `La lumière du jour glisse sur les surfaces avec une douceur inattendue. Chaque détail a été pensé pour créer une harmonie visuelle qui apaise autant qu'elle fascine.`;
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
          imageUrl: options.images[0]?.url
        }
      });

      if (error) throw error;
      
      if (!data?.headline || !data?.subheadline) {
        throw new Error("Invalid AI response");
      }

      return {
        headline: data.headline,
        subheadline: data.subheadline,
        slugline: data.slugline || "L'art du raffinement",
        caption: data.caption || "Finitions premium",
        article: data.article || getFallbackArticle(options.decor.category)
      };

    } catch (error) {
      console.error("❌ AI caption generation failed, using fallback");
      return {
        headline: "Quand la lumière rencontre la matière",
        subheadline: "Un dialogue subtil entre l'espace et les surfaces.",
        slugline: "L'art du raffinement",
        caption: "Finitions premium",
        article: getFallbackArticle(options.decor.category)
      };
    }
  }

  private async renderEditorialArticlePage(
    pdf: jsPDF,
    originalImage: LoadedImage | null,
    renderedImage: LoadedImage,
    options: ResellerBrochureOptions,
    aiCaptions: MagazineAICaption | undefined,
    pageWidth: number,
    pageHeight: number,
    pageNumber: number
  ) {
    const { margins, colors } = MAGAZINE_DECO_CONFIG;
    const branding = options.resellerBranding;
    
    // En-tête - Logo (revendeur ou DICA)
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    const logoText = this.getCoverTitle(branding);
    const logoWidth = pdf.getTextWidth(logoText);
    pdf.text(logoText, (pageWidth - logoWidth) / 2, 16);
    
    // Composition image (même logique que Magazine DECO)
    const compositionY = 25;
    const compositionHeight = pageHeight * 0.70;
    
    let finalImageBase64: string;
    let finalImageWidth: number;
    let finalImageHeight: number;
    
    if (originalImage) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const compositeWidth = 2000;
      const compositeHeight = 1400;
      canvas.width = compositeWidth;
      canvas.height = compositeHeight;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, compositeWidth, compositeHeight);
      
      const gap = 40;
      const labelHeight = 80;
      const singleWidth = (compositeWidth - gap) / 2;
      const imageHeight = compositeHeight - labelHeight;
      
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
      
      const drawImageFit = (img: HTMLImageElement, x: number, width: number) => {
        const ratio = img.height / img.width;
        const finalH = Math.min(imageHeight, width * ratio);
        const finalW = finalH / ratio;
        const offsetX = x + (width - finalW) / 2;
        const offsetY = labelHeight + (imageHeight - finalH) / 2;
        ctx.drawImage(img, offsetX, offsetY, finalW, finalH);
      };
      
      // Police élégante serif italique (style magazine)
      ctx.font = 'italic 52px "Times New Roman", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // AVANT - gris élégant
      ctx.fillStyle = '#4A4A4A';
      ctx.fillText('Avant', singleWidth / 2, 18);
      
      // APRÈS - rouge DICA
      ctx.fillStyle = '#DC2626';
      ctx.fillText('Après', singleWidth + gap + singleWidth / 2, 18);
      
      drawImageFit(originalImg, 0, singleWidth);
      drawImageFit(renderedImg, singleWidth + gap, singleWidth);
      
      finalImageBase64 = canvas.toDataURL('image/jpeg', 0.95);
      finalImageWidth = compositeWidth;
      finalImageHeight = compositeHeight;
    } else {
      finalImageBase64 = renderedImage.base64;
      finalImageWidth = renderedImage.width;
      finalImageHeight = renderedImage.height;
    }
    
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
    
    // Référence décor
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    const creditText = `${options.decor.name} • Réf. ${options.decor.referenceCode}`;
    const creditWidth = pdf.getTextWidth(creditText);
    pdf.text(creditText, (pageWidth - creditWidth) / 2, compositionY + imgH + 5);
    
    // Section texte éditoriale
    const textSectionY = compositionY + imgH + 15;
    
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
    
    // Titre
    const titleY = textSectionY + 8;
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    
    const articleTitle = aiCaptions?.headline || "L'art de la transformation";
    const titleLines = pdf.splitTextToSize(articleTitle, pageWidth - 50);
    
    let currentTitleY = titleY;
    titleLines.forEach((line: string) => {
      const lineWidth = pdf.getTextWidth(line);
      pdf.text(line, (pageWidth - lineWidth) / 2, currentTitleY);
      currentTitleY += 8;
    });
    
    // Article
    const articleY = currentTitleY + 4;
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    
    const articleText = aiCaptions?.article || aiCaptions?.subheadline || 
      "Les finitions transforment cet espace avec une grâce naturelle.";
    
    const articleLines = pdf.splitTextToSize(articleText, pageWidth - 40);
    
    if (articleLines.length > 6) {
      pdf.text(articleLines, margins.left + 10, articleY, {
        lineHeightFactor: 1.6,
        maxWidth: pageWidth - 40
      });
    } else {
      articleLines.forEach((line: string, idx: number) => {
        pdf.text(line, margins.left + 10, articleY + (idx * 4.5));
      });
    }
    
    const articleHeight = Math.min(articleLines.length * 4.5, 50);
    
    // Auteur
    const authorY = articleY + articleHeight + 8;
    pdf.setFont('Inter', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    
    // Si revendeur, créditer le revendeur
    const authorText = branding?.enabled && branding?.companyName
      ? `Présenté par ${branding.companyName}`
      : "Par la rédaction DICA DÉCOR";
    const authorWidth = pdf.getTextWidth(authorText);
    pdf.text(authorText, (pageWidth - authorWidth) / 2, authorY);
    
    // Date
    const now = new Date();
    const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
    const dateText = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(120, 120, 120);
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, (pageWidth - dateWidth) / 2, authorY + 4);
    
    // Numéro de page
    pdf.setFont('Times', 'bold');
    pdf.setFontSize(36);
    pdf.setTextColor(235, 235, 235);
    pdf.text(pageNumber.toString(), pageWidth - margins.right - 15, pageHeight - margins.bottom + 5);
    
    // Footer
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(5);
    pdf.setTextColor(180, 180, 180);
    const footerText = branding?.enabled && branding?.website
      ? `Visuels non contractuels • ${branding.website}`
      : "Visuels non contractuels • www.dica-france.com";
    pdf.text(footerText, margins.left, pageHeight - 6);
  }

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

  private async loadImagesWithBase64(images: any[]): Promise<LoadedImage[]> {
    const promises = images.map(async (img) => {
      const response = await fetch(img.url);
      if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
      
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      const dimensions = await this.getImageDimensions(img.url);
      
      return {
        url: img.url,
        base64,
        width: dimensions.width,
        height: dimensions.height
      };
    });

    return Promise.all(promises);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    });
  }

  private generateFilename(projectName: string, branding?: ResellerBranding | null): string {
    const sanitize = (str: string) => str
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    const date = new Date().toISOString().split('T')[0];
    
    if (branding?.enabled && branding?.companyName) {
      return `${sanitize(branding.companyName)}_brochure_${sanitize(projectName)}_${date}.pdf`;
    }
    
    return `dica_brochure_${sanitize(projectName)}_${date}.pdf`;
  }
}

interface LoadedImage {
  url: string;
  base64: string;
  width: number;
  height: number;
}

// Export singleton instance
export const resellerBrochurePdfService = ResellerBrochurePdfService.getInstance();

