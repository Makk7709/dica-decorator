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

    // Titre principal
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(72);
    pdf.setTextColor(255, 250, 240); // Ivoire
    const titleWidth = pdf.getTextWidth(page.titre);
    pdf.text(page.titre, (pageWidth - titleWidth) / 2, pageHeight * 0.3);

    // Sous-titre
    if (page.sous_titre) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 250, 240);
      const subtitleWidth = pdf.getTextWidth(page.sous_titre);
      pdf.text(page.sous_titre, (pageWidth - subtitleWidth) / 2, pageHeight * 0.4);
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

    // Titre
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(32);
    pdf.setTextColor(0, 0, 0);
    pdf.text(page.titre, marginX, currentY);
    currentY += 12;

    // Sous-titre
    if (page.sous_titre) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(14);
      pdf.setTextColor(80, 80, 80);
      pdf.text(page.sous_titre, marginX, currentY);
      currentY += 10;
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

    // Fond semi-transparent pour la phrase calligraphiée
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(pdf.GState({ opacity: 0.4 }));
    pdf.rect(0, pageHeight - 60, pageWidth, 60, 'F');
    pdf.setGState(pdf.GState({ opacity: 1.0 }));

    // Phrase calligraphiée (ivoire, grande, centrée)
    pdf.setFont('Times', 'italic');
    pdf.setFontSize(28);
    pdf.setTextColor(255, 250, 240);
    const phraseLines = pdf.splitTextToSize(page.phrase_calligraphie, pageWidth - 40);
    const phraseY = pageHeight - 30;
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

    // Titre
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(36);
    pdf.setTextColor(0, 0, 0);
    const titleWidth = pdf.getTextWidth(page.titre);
    pdf.text(page.titre, (pageWidth - titleWidth) / 2, currentY);
    currentY += 25;

    // Texte
    pdf.setFont('Times', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    const textLines = pdf.splitTextToSize(page.texte_court, pageWidth - 50);
    pdf.text(textLines, marginX, currentY, { lineHeightFactor: 1.6 });
    currentY += textLines.length * 6 + 15;

    // Call to action
    if (page.call_to_action) {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      const ctaWidth = pdf.getTextWidth(page.call_to_action);
      pdf.text(page.call_to_action, (pageWidth - ctaWidth) / 2, currentY);
      currentY += 20;
    }

    // Blocs décors et échantillons
    await this.renderDecorsAndEchantillons(pdf, page, pageWidth, pageHeight, currentY);
  }

  /**
   * Rend les blocs décors et échantillons (OBLIGATOIRE sur toutes les pages)
   * Avec miniatures des textures des décors
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
    const blockY = startY || pageHeight - 100; // Hauteur augmentée pour les miniatures
    const blockHeight = 90; // Hauteur augmentée pour accommoder les miniatures

    // Fond pour les blocs
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(marginX, blockY, pageWidth - 50, blockHeight, 3, 3, 'F');

    // Bordure
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(marginX, blockY, pageWidth - 50, blockHeight, 3, 3, 'D');

    let currentY = blockY + 10;

    // Titre "Décors DICA utilisés"
    pdf.setFont('Times', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(page.decors_utilises.titre, marginX + 5, currentY);
    currentY += 10;

    // Liste des décors avec miniatures
    const thumbnailSize = 10; // Taille des miniatures en mm
    const thumbnailSpacing = 4; // Espacement entre miniature et texte
    const lineHeight = thumbnailSize + 4; // Hauteur de ligne avec miniature
    
    for (let i = 0; i < page.decors_utilises.decors.length; i++) {
      if (currentY > blockY + blockHeight - 25) break; // Éviter le débordement

      const decor = page.decors_utilises.decors[i];
      const echantillon = page.echantillons.echantillons.find(e => e.decor_code === decor.code);
      
      // Trouver l'ID ou le code du décor pour récupérer la texture
      const decorId = echantillon?.decor_id;
      const textureUrl = decorTextureUrls?.[decorId || ''] || decorTextureUrls?.[decor.code];
      
      let currentX = marginX + 5;
      
      // Afficher la miniature si disponible
      if (textureUrl) {
        try {
          const textureImage = await this.loadImageWithBase64(textureUrl);
          const thumbRatio = textureImage.width / textureImage.height;
          let thumbWidth = thumbnailSize;
          let thumbHeight = thumbnailSize / thumbRatio;
          
          if (thumbHeight > thumbnailSize) {
            thumbHeight = thumbnailSize;
            thumbWidth = thumbHeight * thumbRatio;
          }

          // Bordure autour de la miniature
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.rect(currentX, currentY - thumbHeight, thumbWidth + 0.5, thumbHeight + 0.5, 'D');
          
          pdf.addImage(
            textureImage.base64,
            'JPEG',
            currentX + 0.25,
            currentY - thumbHeight + 0.25,
            thumbWidth,
            thumbHeight,
            undefined,
            'FAST'
          );
          
          currentX += thumbWidth + thumbnailSpacing;
        } catch (error) {
          console.warn(`Could not load texture image for decor ${decorId || decor.code}:`, error);
        }
      }

      // Texte du décor à côté de la miniature
      pdf.setFont('Times', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(60, 60, 60);
      
      const decorText = `${decor.nom} • ${decor.code}${decor.effet ? ` • ${decor.effet}` : ''}`;
      pdf.text(decorText, currentX, currentY - 2);

      // Ligne suivante
      currentY += lineHeight;
    }

    // Séparateur
    currentY += 3;
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.line(marginX + 5, currentY, pageWidth - marginX - 5, currentY);
    currentY += 5;

    // Titre "Échantillons" (si espace disponible)
    if (currentY < blockY + blockHeight - 15) {
      pdf.setFont('Times', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Échantillons', marginX + 5, currentY);
      currentY += 5;

      // Descriptions échantillons (version courte si espace limité)
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(6);
      pdf.setTextColor(80, 80, 80);

      page.echantillons.echantillons.slice(0, 2).forEach((echantillon) => {
        if (currentY > blockY + blockHeight - 5) return;

        const echantillonText = `${echantillon.decor_code}: ${echantillon.description_courte}`;
        pdf.text(echantillonText, marginX + 5, currentY);
        currentY += 3.5;
      });
    }
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

