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
      await this.renderCoverPage(pdf, options, loadedImages[0], pageWidth, pageHeight);
      
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
      
      if (!data || !data.slugline || !data.caption) {
        throw new Error("Invalid AI response");
      }

      console.log("✅ AI captions generated:", data);
      return {
        slugline: data.slugline,
        caption: data.caption
      };

    } catch (error: any) {
      console.error("❌ AI caption generation failed:", error);
      // Fallback to generic captions
      return {
        slugline: "Style et élégance",
        caption: `Le décor ${options.decor.name} sublime cet espace avec finesse`
      };
    }
  }

  /**
   * PAGE 1 - Cover project
   */
  private async renderCoverPage(
    pdf: jsPDF, 
    options: MagazineDecoOptions,
    image: LoadedImage,
    pageWidth: number,
    pageHeight: number
  ) {
    const { margins } = MAGAZINE_DECO_CONFIG;
    
    // Full bleed or large centered image
    const imgRatio = image.width / image.height;
    const targetHeight = pageHeight * 0.85;
    const targetWidth = targetHeight * imgRatio;
    
    const x = (pageWidth - targetWidth) / 2;
    const y = margins.top;
    
    pdf.addImage(image.base64, 'JPEG', x, y, targetWidth, targetHeight, undefined, 'FAST');
    
    // Bottom-left text block
    const textY = pageHeight - margins.bottom - 15;
    
    // Project name
    pdf.setFont('Playfair Display', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(MAGAZINE_DECO_CONFIG.colors.textPrimary);
    pdf.text(options.project.name, margins.left, textY);
    
    // Project type
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(MAGAZINE_DECO_CONFIG.colors.textSecondary);
    pdf.text(this.getProjectTypeLabel(options.project.type), margins.left, textY + 5);
    
    // Underline (20mm, DICA red)
    pdf.setDrawColor(MAGAZINE_DECO_CONFIG.colors.dicaRed);
    pdf.setLineWidth(0.3);
    pdf.line(margins.left, textY + 8, margins.left + 20, textY + 8);
    
    // Footer
    this.renderFooter(pdf, pageWidth, pageHeight, 1);
  }

  /**
   * PAGE 2 - Narrative + decor focus
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
    
    // Upper half: hero image
    const imgRatio = image.width / image.height;
    const targetWidth = pageWidth - margins.left - margins.right;
    const targetHeight = targetWidth / imgRatio;
    const maxHeight = pageHeight * 0.55;
    
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    if (targetHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }
    
    const imgX = (pageWidth - finalWidth) / 2;
    const imgY = margins.top;
    
    pdf.addImage(image.base64, 'JPEG', imgX, imgY, finalWidth, finalHeight, undefined, 'FAST');
    
    // Content area below image
    const contentY = imgY + finalHeight + 15;
    
    // Vertical accent bar (left margin)
    pdf.setDrawColor(colors.accentLine);
    pdf.setLineWidth(1);
    pdf.line(margins.left, contentY, margins.left, contentY + 40);
    
    // Slugline (handwritten, diagonal positioning)
    if (aiCaptions?.slugline) {
      pdf.setFont(typography.slugline.fontFamily, 'normal');
      pdf.setFontSize(typography.slugline.fontSize);
      pdf.setTextColor(typography.slugline.color);
      
      // Slightly offset from left margin
      const slugX = margins.left + 8;
      const slugY = contentY + 8;
      
      // Rotate text slightly for handwritten feel (-3 degrees)
      pdf.text(aiCaptions.slugline, slugX, slugY, { angle: -3 });
    }
    
    // Caption (serif, left aligned)
    if (aiCaptions?.caption) {
      pdf.setFont(typography.caption.fontFamily, 'normal');
      pdf.setFontSize(typography.caption.fontSize);
      pdf.setTextColor(typography.caption.color);
      
      const captionX = margins.left + 8;
      const captionY = contentY + 20;
      const maxWidth = pageWidth - margins.left - margins.right - 10;
      
      const lines = pdf.splitTextToSize(aiCaptions.caption, maxWidth);
      pdf.text(lines, captionX, captionY, { 
        lineHeightFactor: typography.caption.lineHeight 
      });
    }
    
    // Decor info block bottom-left
    const decorY = pageHeight - margins.bottom - 25;
    
    pdf.setFont('Playfair Display', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(colors.textPrimary);
    pdf.text(options.decor.name, margins.left + 8, decorY);
    
    pdf.setFont('Inter', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.textLight);
    pdf.text(`Réf. ${options.decor.referenceCode}`, margins.left + 8, decorY + 4);
    
    if (options.decor.collection || options.decor.finish) {
      const detail = options.decor.finish || options.decor.collection || '';
      pdf.text(detail, margins.left + 8, decorY + 8);
    }
    
    // Footer
    this.renderFooter(pdf, pageWidth, pageHeight, 2);
  }

  /**
   * PAGE 3+ - Material variations
   */
  private async renderImagePage(
    pdf: jsPDF,
    image: LoadedImage,
    pageWidth: number,
    pageHeight: number,
    pageNumber: number
  ) {
    const { margins } = MAGAZINE_DECO_CONFIG;
    
    // Centered image with generous white space
    const imgRatio = image.width / image.height;
    const targetWidth = (pageWidth - margins.left - margins.right) * 0.85;
    const targetHeight = targetWidth / imgRatio;
    const maxHeight = pageHeight * 0.75;
    
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;
    if (targetHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight * imgRatio;
    }
    
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;
    
    pdf.addImage(image.base64, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
    
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
