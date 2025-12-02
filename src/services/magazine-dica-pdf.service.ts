/**
 * @fileoverview Service de génération PDF Magazine DICA
 * Génère un PDF exploitable directement à partir de la structure éditoriale
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import jsPDF from 'jspdf';
import type {
  MagazineDICA,
  MagazinePage,
  CoverPage,
  EditorialIntroPage,
  ZoomProductPage,
  ClosingPage,
} from '@/types/magazine-generator.types';

export interface MagazineDICAPdfResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  pageCount?: number;
  error?: string;
}

interface LoadedImage {
  base64: string;
  width: number;
  height: number;
}

/**
 * Service de génération PDF Magazine DICA
 */
export class MagazineDICAPdfService {
  private static instance: MagazineDICAPdfService;

  private constructor() {}

  static getInstance(): MagazineDICAPdfService {
    if (!this.instance) {
      this.instance = new MagazineDICAPdfService();
    }
    return this.instance;
  }

  /**
   * Génère un PDF Magazine DICA à partir de la structure éditoriale
   */
  async generateMagazinePDF(
    magazine: MagazineDICA,
    imageUrls: Record<string, string>,
    decorTextureUrls?: Record<string, string> // Mapping decor_id -> texture_image_url
  ): Promise<MagazineDICAPdfResult> {
    console.log("📖 Magazine DICA PDF - Starting generation");
    console.log("📄 Pages:", magazine.pages.length);
    console.log("🎨 Décors:", magazine.decors_utilises_total.length);

    try {
      // Validation
      if (!magazine.pages || magazine.pages.length === 0) {
        throw new Error("Structure de magazine vide : aucune page à générer");
      }

      // Créer le PDF (A4 portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm

      // Extraire les URLs de textures depuis decors_utilises_total si non fournies
      if (!decorTextureUrls && magazine.decors_utilises_total) {
        decorTextureUrls = {};
        magazine.decors_utilises_total.forEach(decor => {
          if (decor.texture_image_url) {
            decorTextureUrls![decor.id] = decor.texture_image_url;
            decorTextureUrls![decor.code] = decor.texture_image_url;
          }
        });
      }

      // Générer chaque page
      for (let i = 0; i < magazine.pages.length; i++) {
        const page = magazine.pages[i];
        await this.renderPage(pdf, page, imageUrls, pageWidth, pageHeight, decorTextureUrls);
        
        // Ajouter une nouvelle page sauf pour la dernière
        if (i < magazine.pages.length - 1) {
          pdf.addPage();
        }
      }

      // Générer le blob
      const blob = pdf.output('blob');
      const filename = this.generateFilename(magazine);
      const finalPageCount = pdf.getNumberOfPages();

      console.log("✅ Magazine DICA PDF generated:", {
        filename,
        pageCount: finalPageCount,
      });

      return {
        success: true,
        blob,
        filename,
        pageCount: finalPageCount,
      };
    } catch (error: any) {
      console.error("❌ Magazine DICA PDF generation error:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la génération du PDF",
      };
    }
  }

  /**
   * Rend une page selon son type
   */
  private async renderPage(
    pdf: jsPDF,
    page: MagazinePage,
    imageUrls: Record<string, string>,
    pageWidth: number,
    pageHeight: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    switch (page.type_page) {
      case 'cover':
        await this.renderCoverPage(pdf, page as CoverPage, imageUrls, pageWidth, pageHeight, decorTextureUrls);
        break;
      case 'editorial_intro':
        await this.renderEditorialIntroPage(pdf, page as EditorialIntroPage, imageUrls, pageWidth, pageHeight, decorTextureUrls);
        break;
      case 'zoom_product':
        await this.renderZoomProductPage(pdf, page as ZoomProductPage, imageUrls, pageWidth, pageHeight, decorTextureUrls);
        break;
      case 'closing':
        await this.renderClosingPage(pdf, page as ClosingPage, pageWidth, pageHeight, decorTextureUrls);
        break;
      default:
        console.warn(`Page type ${(page as any).type_page} not implemented`);
    }
  }

  /**
   * PAGE COUVERTURE
   */
  private async renderCoverPage(
    pdf: jsPDF,
    page: CoverPage,
    imageUrls: Record<string, string>,
    pageWidth: number,
    pageHeight: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    // Image de couverture si disponible
    if (page.id_image_principale && imageUrls[page.id_image_principale]) {
      try {
        const image = await this.loadImageWithBase64(imageUrls[page.id_image_principale]);
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
      } catch (error) {
        console.warn("Could not load cover image:", error);
      }
    }

    // Fond semi-transparent pour le texte
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(pdf.GState({ opacity: 0.3 }));
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setGState(pdf.GState({ opacity: 1.0 }));

    // Titre principal (avec wrapping pour éviter le débordement)
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(72);
    pdf.setTextColor(255, 250, 240); // Ivoire
    const maxTitleWidth = pageWidth - 40; // Marges de 20mm de chaque côté
    const titleLines = pdf.splitTextToSize(page.titre, maxTitleWidth);
    const titleY = pageHeight * 0.3;
    pdf.text(titleLines, pageWidth / 2, titleY, { align: 'center' });

    // Sous-titre (avec wrapping pour éviter le débordement)
    if (page.sous_titre) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 250, 240);
      const maxSubtitleWidth = pageWidth - 40;
      const subtitleLines = pdf.splitTextToSize(page.sous_titre, maxSubtitleWidth);
      const subtitleY = pageHeight * 0.4 + (titleLines.length - 1) * 12; // Ajuster selon nombre de lignes du titre
      pdf.text(subtitleLines, pageWidth / 2, subtitleY, { align: 'center' });
    }

    // Phrase calligraphiée
    if (page.phrase_calligraphie) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(24);
      pdf.setTextColor(255, 250, 240);
      const phraseLines = pdf.splitTextToSize(page.phrase_calligraphie, pageWidth - 40);
      pdf.text(phraseLines, pageWidth / 2, pageHeight * 0.7, { align: 'center' });
    }

    // Blocs décors et échantillons en bas
    await this.renderDecorsAndEchantillons(pdf, page, pageWidth, pageHeight, undefined, decorTextureUrls);
  }

  /**
   * PAGE ÉDITORIALE INTRO
   */
  private async renderEditorialIntroPage(
    pdf: jsPDF,
    page: EditorialIntroPage,
    imageUrls: Record<string, string>,
    pageWidth: number,
    pageHeight: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    const marginX = 25;
    const marginY = 30;
    let currentY = marginY;

    // Image si disponible (petite, en haut)
    if (page.id_image_principale && imageUrls[page.id_image_principale]) {
      try {
        const image = await this.loadImageWithBase64(imageUrls[page.id_image_principale]);
        const imgWidth = pageWidth - 50;
        const imgHeight = (imgWidth * image.height) / image.width;
        const maxImgHeight = 80;

        if (imgHeight > maxImgHeight) {
          const ratio = maxImgHeight / imgHeight;
          const finalWidth = imgWidth * ratio;
          const finalHeight = maxImgHeight;
          pdf.addImage(image.base64, 'JPEG', marginX, currentY, finalWidth, finalHeight, undefined, 'FAST');
          currentY += finalHeight + 15;
        } else {
          pdf.addImage(image.base64, 'JPEG', marginX, currentY, imgWidth, imgHeight, undefined, 'FAST');
          currentY += imgHeight + 15;
        }
      } catch (error) {
        console.warn("Could not load intro image:", error);
      }
    }

    // Titre (avec wrapping pour éviter le débordement)
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(32);
    pdf.setTextColor(0, 0, 0);
    const maxEditorialTitleWidth = pageWidth - marginX * 2;
    const editorialTitleLines = pdf.splitTextToSize(page.titre, maxEditorialTitleWidth);
    pdf.text(editorialTitleLines, marginX, currentY);
    currentY += 12 + (editorialTitleLines.length - 1) * 10; // Espacement ajusté selon nombre de lignes

    // Sous-titre (avec wrapping pour éviter le débordement)
    if (page.sous_titre) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(14);
      pdf.setTextColor(80, 80, 80);
      const maxEditorialSubtitleWidth = pageWidth - marginX * 2;
      const editorialSubtitleLines = pdf.splitTextToSize(page.sous_titre, maxEditorialSubtitleWidth);
      pdf.text(editorialSubtitleLines, marginX, currentY);
      currentY += 10 + (editorialSubtitleLines.length - 1) * 8;
    }

    // Texte éditorial
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    const textLines = pdf.splitTextToSize(page.texte_court, pageWidth - 50);
    pdf.text(textLines, marginX, currentY, { lineHeightFactor: 1.6 });
    currentY += textLines.length * 6 + 20;

    // Blocs décors et échantillons
    await this.renderDecorsAndEchantillons(pdf, page, pageWidth, pageHeight, currentY);
  }

  /**
   * PAGE ZOOM PRODUIT (pleine page)
   */
  private async renderZoomProductPage(
    pdf: jsPDF,
    page: ZoomProductPage,
    imageUrls: Record<string, string>,
    pageWidth: number,
    pageHeight: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    // Image en PLEINE PAGE
    if (page.id_image_principale && imageUrls[page.id_image_principale]) {
      try {
        const image = await this.loadImageWithBase64(imageUrls[page.id_image_principale]);
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
      } catch (error) {
        console.warn("Could not load zoom product image:", error);
      }
    }

    // Fond semi-transparent pour la phrase calligraphiée (hauteur ajustable selon nombre de lignes)
    const maxPhraseWidth = pageWidth - 40; // Marges de 20mm de chaque côté
    const phraseLines = pdf.splitTextToSize(page.phrase_calligraphie, maxPhraseWidth);
    const phraseBlockHeight = 40 + (phraseLines.length - 1) * 10; // Hauteur ajustée selon nombre de lignes
    
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(pdf.GState({ opacity: 0.4 }));
    pdf.rect(0, pageHeight - phraseBlockHeight, pageWidth, phraseBlockHeight, 'F');
    pdf.setGState(pdf.GState({ opacity: 1.0 }));

    // Phrase calligraphiée (ivoire, grande, centrée) - avec wrapping pour éviter le débordement
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(28);
    pdf.setTextColor(255, 250, 240);
    const phraseY = pageHeight - (phraseBlockHeight / 2) - ((phraseLines.length - 1) * 4); // Centrer verticalement
    pdf.text(phraseLines, pageWidth / 2, phraseY, { align: 'center' });

    // Blocs décors et échantillons (en bas, sur fond semi-transparent)
    await this.renderDecorsAndEchantillons(pdf, page, pageWidth, pageHeight, undefined, decorTextureUrls);
  }

  /**
   * PAGE DE CLÔTURE
   */
  private async renderClosingPage(
    pdf: jsPDF,
    page: ClosingPage,
    pageWidth: number,
    pageHeight: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    const marginX = 25;
    let currentY = 40;

    // Titre (avec wrapping pour éviter le débordement)
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(36);
    pdf.setTextColor(0, 0, 0);
    const maxClosingTitleWidth = pageWidth - 40; // Marges de 20mm de chaque côté
    const closingTitleLines = pdf.splitTextToSize(page.titre, maxClosingTitleWidth);
    pdf.text(closingTitleLines, pageWidth / 2, currentY, { align: 'center' });
    currentY += 25 + (closingTitleLines.length - 1) * 12; // Espacement ajusté selon nombre de lignes

    // Texte (avec wrapping pour éviter le débordement)
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    const maxClosingTextWidth = pageWidth - 50;
    const textLines = pdf.splitTextToSize(page.texte_court, maxClosingTextWidth);
    pdf.text(textLines, pageWidth / 2, currentY, { align: 'center', lineHeightFactor: 1.6 });
    currentY += textLines.length * 6 + 15;

    // Call to action (avec wrapping pour éviter le débordement)
    if (page.call_to_action) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      const maxCtaWidth = pageWidth - 40;
      const ctaLines = pdf.splitTextToSize(page.call_to_action, maxCtaWidth);
      pdf.text(ctaLines, pageWidth / 2, currentY, { align: 'center' });
      currentY += 20 + (ctaLines.length - 1) * 8;
    }

    // Blocs décors et échantillons
    await this.renderDecorsAndEchantillons(pdf, page, pageWidth, pageHeight, currentY);
  }

  /**
   * Rend les blocs décors et échantillons avec carrés élégants type RAL
   * Décors affichés en grille de carrés colorés avec codes
   */
  private async renderDecorsAndEchantillons(
    pdf: jsPDF,
    page: MagazinePage,
    pageWidth: number,
    pageHeight: number,
    startY?: number,
    decorTextureUrls?: Record<string, string>
  ): Promise<void> {
    const marginX = 25;
    const blockY = startY || pageHeight - 80;
    const blockHeight = 70;

    // Fond pour les blocs (fond très clair, presque blanc)
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(marginX, blockY, pageWidth - 50, blockHeight, 3, 3, 'F');

    // Bordure fine et élégante
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginX, blockY, pageWidth - 50, blockHeight, 3, 3, 'D');

    let currentY = blockY + 10;

    // Titre "Palette DICA" ou "Décors DICA utilisés"
    pdf.setFont('Times', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    const title = page.decors_utilises.titre === 'Palette DICA' ? 'Palette DICA' : page.decors_utilises.titre;
    pdf.text(title, marginX + 5, currentY);
    currentY += 12;

    // Grille de carrés RAL élégants
    const squareSize = 12; // Taille des carrés en mm
    const squareSpacing = 8; // Espacement entre carrés
    const squaresPerRow = Math.floor((pageWidth - 50 - 10) / (squareSize + squareSpacing));
    let currentX = marginX + 5;
    let rowStartY = currentY;

    const decors = page.decors_utilises.decors;
    const displayedDecors = decors.slice(0, squaresPerRow * 2); // Max 2 lignes pour ne pas déborder

    for (let i = 0; i < displayedDecors.length; i++) {
      const decor = displayedDecors[i];
      const echantillon = page.echantillons.echantillons.find(e => e.decor_code === decor.code);
      
      // Nouvelle ligne si nécessaire
      if (i > 0 && i % squaresPerRow === 0) {
        currentX = marginX + 5;
        currentY += squareSize + squareSpacing + 8; // Espace pour le texte sous le carré
      }

      // Carré coloré type RAL
      const colorHex = decor.color_hex || echantillon?.color_hex || '#CCCCCC';
      const rgb = this.hexToRgb(colorHex);
      
      // Carré principal avec couleur
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(currentX, currentY, squareSize, squareSize, 1, 1, 'FD'); // Fill and Draw

      // Bordure intérieure fine pour élégance
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(currentX + 0.5, currentY + 0.5, squareSize - 1, squareSize - 1, 1, 1, 'D');

      // Code du décor en petit sous le carré
      pdf.setFont('Times', 'normal');
      pdf.setFontSize(5);
      pdf.setTextColor(80, 80, 80);
      const codeText = decor.code.length > 12 ? decor.code.substring(0, 12) + '...' : decor.code;
      pdf.text(codeText, currentX, currentY + squareSize + 2.5, { 
        maxWidth: squareSize,
        align: 'center'
      });

      // Miniature texture si disponible (superposée en petit coin)
      const decorId = echantillon?.decor_id;
      const textureUrl = decorTextureUrls?.[decorId || ''] || decorTextureUrls?.[decor.code];
      if (textureUrl) {
        try {
          const textureImage = await this.loadImageWithBase64(textureUrl);
          const smallSize = squareSize * 0.7;
          const smallOffset = (squareSize - smallSize) / 2;
          
          pdf.addImage(
            textureImage.base64,
            'JPEG',
            currentX + smallOffset,
            currentY + smallOffset,
            smallSize,
            smallSize,
            undefined,
            'FAST'
          );
        } catch (error) {
          // Ignorer les erreurs de chargement de texture
        }
      }

      currentX += squareSize + squareSpacing;
    }

    // Ajuster la position Y pour la suite
    currentY += squareSize + 12;

    // Légende des échantillons (si espace disponible)
    if (currentY < blockY + blockHeight - 15 && displayedDecors.length > 0) {
      pdf.setDrawColor(240, 240, 240);
      pdf.setLineWidth(0.2);
      pdf.line(marginX + 5, currentY, pageWidth - marginX - 5, currentY);
      currentY += 5;

      pdf.setFont('Times', 'italic');
      pdf.setFontSize(6);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Échantillons de la palette DICA utilisée dans ce numéro', marginX + 5, currentY);
    }
  }

  /**
   * Convertit une couleur hex en RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 204, g: 204, b: 204 }; // Gris par défaut
  }

  /**
   * Charge une image et la convertit en base64
   */
  private async loadImageWithBase64(url: string): Promise<LoadedImage> {
    try {
      // Essayer de charger via fetch pour les URLs cross-origin
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve({
            base64,
            width: img.width,
            height: img.height,
          });
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image: ${url}`));
        };

        // Créer une URL locale pour l'image
        const objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        
        // Nettoyer après chargement
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          URL.revokeObjectURL(objectUrl);
          resolve({
            base64,
            width: img.width,
            height: img.height,
          });
        };
      });
    } catch (error) {
      // Fallback: essayer directement avec Image
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve({
            base64,
            width: img.width,
            height: img.height,
          });
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image: ${url}`));
        };

        img.src = url;
      });
    }
  }

  /**
   * Génère le nom de fichier
   */
  private generateFilename(magazine: MagazineDICA): string {
    const date = magazine.date_publication || new Date().toISOString().split('T')[0];
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `magazine-dica-${sanitize(magazine.titre_magazine)}-${date}.pdf`;
  }
}

// Export singleton instance
export const magazineDICAPdfService = MagazineDICAPdfService.getInstance();

