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

      // Generate AI captions if requested and not provided
      let aiCaptions = options.aiCaptions;
      if (options.generateAICaptions && !aiCaptions) {
        aiCaptions = await this.generateAICaptions(options);
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
      await this.renderCoverPage(pdf, options, loadedImages[0], aiCaptions, pageWidth, pageHeight);
      
      // PAGE 2 - NARRATIVE + DECOR FOCUS
      if (loadedImages.length > 0) {
        pdf.addPage();
        const heroImage = loadedImages.length > 1 ? loadedImages[1] : loadedImages[0];
        await this.renderNarrativePage(pdf, options, heroImage, aiCaptions, pageWidth, pageHeight);
      }
      
      // PAGE 3+ - ADDITIONAL IMAGES
      for (let i = 2; i < loadedImages.length; i++) {
        pdf.addPage();
        await this.renderImagePage(pdf, loadedImages[i], pageWidth, pageHeight, i + 1);
      }

      // Generate blob
      const blob = pdf.output('blob');
      const filename = this.generateFilename(options.project.name);
      
      console.log("✅ Magazine DECO PDF generated:", {
        filename,
        pageCount: pdf.getNumberOfPages(),
        aiCaptions
      });

      return {
        success: true,
        blob,
        filename,
        pageCount: pdf.getNumberOfPages(),
        aiCaptions
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
   * Génère les captions AI via edge function
   */
  private async generateAICaptions(options: MagazineDecoOptions): Promise<MagazineAICaption> {
    console.log("🤖 Generating AI captions via orchestrator");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-magazine-captions', {
        body: {
          projectName: options.project.name,
          projectType: options.project.type,
          decorLabel: options.decor.name,
          decorReference: options.decor.referenceCode,
          decorCategory: options.decor.category
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
    
    // Full bleed image - show ENTIRE image with letterboxing if needed
    const imgRatio = image.width / image.height;
    const pageRatio = pageWidth / pageHeight;
    
    let finalWidth, finalHeight, x, y;
    
    // Always fit the entire image (contain mode)
    if (imgRatio > pageRatio) {
      // Image wider - fit to page width
      finalWidth = pageWidth;
      finalHeight = finalWidth / imgRatio;
      x = 0;
      y = (pageHeight - finalHeight) / 2;
    } else {
      // Image taller - fit to page height
      finalHeight = pageHeight;
      finalWidth = finalHeight * imgRatio;
      x = (pageWidth - finalWidth) / 2;
      y = 0;
    }
    
    // Fill background with dark color for letterboxing
    pdf.setFillColor(20, 20, 20);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Add image on top
    pdf.addImage(image.base64, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    
    // DICA BRANDING - Top-left (HUGE magazine title)
    pdf.setFont('Playfair Display', 'bold');
    pdf.setFontSize(72);
    pdf.setTextColor(255, 255, 255);
    
    // Shadow for DICA (stronger for larger text)
    pdf.setTextColor(0, 0, 0);
    for (let dx = 0.5; dx <= 1.5; dx += 0.5) {
      for (let dy = 0.5; dy <= 1.5; dy += 0.5) {
        pdf.text("DICA", 20 + dx, 40 + dy);
      }
    }
    pdf.setTextColor(255, 255, 255);
    pdf.text("DICA", 20, 40);
    
    // OVERLAY TEXT ON IMAGE
    const headline = aiCaptions?.headline || "L'excellence du design";
    const subheadline = aiCaptions?.subheadline || "Découvrez une nouvelle dimension de l'élégance intérieure avec les finitions DICA.";
    
    // Headline (center-left, huge, white with shadow)
    pdf.setFont('Playfair Display', 'bold');
    pdf.setFontSize(42);
    
    // Text shadow effect (multiple offset black layers)
    pdf.setTextColor(0, 0, 0);
    const headlineX = 25;
    const headlineY = pageHeight * 0.35;
    const maxWidth = pageWidth - 50;
    
    const headlineLines = pdf.splitTextToSize(headline, maxWidth);
    
    // Shadow layers
    for (let dx = 0.3; dx <= 0.9; dx += 0.3) {
      for (let dy = 0.3; dy <= 0.9; dy += 0.3) {
        pdf.text(headlineLines, headlineX + dx, headlineY + dy);
      }
    }
    
    // White text on top
    pdf.setTextColor(255, 255, 255);
    pdf.text(headlineLines, headlineX, headlineY);
    
    // Sub-headline (under headline, smaller, white with shadow)
    pdf.setFont('Playfair Display', 'normal');
    pdf.setFontSize(14);
    
    const subheadlineY = headlineY + (headlineLines.length * 14) + 8;
    const subheadlineLines = pdf.splitTextToSize(subheadline, maxWidth - 20);
    
    // Shadow
    pdf.setTextColor(0, 0, 0);
    for (let dx = 0.2; dx <= 0.6; dx += 0.2) {
      for (let dy = 0.2; dy <= 0.6; dy += 0.2) {
        pdf.text(subheadlineLines, headlineX + dx, subheadlineY + dy, { lineHeightFactor: 1.4 });
      }
    }
    
    // White text
    pdf.setTextColor(255, 255, 255);
    pdf.text(subheadlineLines, headlineX, subheadlineY, { lineHeightFactor: 1.4 });
    
    // RED CIRCULAR BADGE (top-right)
    const badgeX = pageWidth - 30;
    const badgeY = 30;
    const badgeRadius = 18;
    
    // Red circle
    pdf.setFillColor(colors.dicaRed);
    pdf.circle(badgeX, badgeY, badgeRadius, 'F');
    
    // Badge text
    pdf.setFont('Inter', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    
    const badgeText = "NOUVEAUTÉ";
    const badgeTextWidth = pdf.getTextWidth(badgeText);
    pdf.text(badgeText, badgeX - (badgeTextWidth / 2), badgeY + 2);
    
    // FAKE BARCODE (bottom-right, vertical)
    const barcodeX = pageWidth - 15;
    const barcodeY = pageHeight - 60;
    const barcodeHeight = 40;
    const barWidth = 1;
    
    pdf.setFillColor(0, 0, 0);
    // Generate random barcode pattern
    for (let i = 0; i < 30; i++) {
      const barHeight = Math.random() * barcodeHeight * 0.8 + barcodeHeight * 0.2;
      const yOffset = barcodeY + (barcodeHeight - barHeight) / 2;
      pdf.rect(barcodeX + (i * (barWidth + 0.3)), yOffset, barWidth, barHeight, 'F');
    }
    
    // Barcode number below
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255);
    pdf.text("9 782847 365894", barcodeX - 8, barcodeY + barcodeHeight + 4);
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
    
    // Slugline (handwritten, diagonal positioning)
    if (aiCaptions?.slugline) {
      pdf.setFont(typography.slugline.fontFamily, 'normal');
      pdf.setFontSize(typography.slugline.fontSize);
      pdf.setTextColor(typography.slugline.color);
      
      const slugX = margins.left + 10;
      const slugY = contentY;
      
      // Rotate text slightly for handwritten feel (-3 degrees)
      pdf.text(aiCaptions.slugline, slugX, slugY, { angle: -3 });
    }
    
    // Caption (serif, left aligned)
    if (aiCaptions?.caption) {
      pdf.setFont(typography.caption.fontFamily, 'normal');
      pdf.setFontSize(typography.caption.fontSize);
      pdf.setTextColor(typography.caption.color);
      
      const captionX = margins.left + 10;
      const captionY = contentY + 15;
      const maxWidth = (pageWidth * 0.6);
      
      const lines = pdf.splitTextToSize(aiCaptions.caption, maxWidth);
      pdf.text(lines, captionX, captionY, { 
        lineHeightFactor: typography.caption.lineHeight 
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
