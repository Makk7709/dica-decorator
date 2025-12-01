/**
 * Service d'export d'images en plusieurs formats
 * Supporte PNG, JPEG et WebP avec qualité configurable
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

/**
 * Formats d'export supportés
 */
export type ImageExportFormat = 'png' | 'jpeg' | 'webp';

/**
 * Options d'export d'image
 */
export interface ImageExportOptions {
  format: ImageExportFormat;
  quality?: number; // 0-1, default 0.92
  filename?: string; // Sans extension
}

/**
 * Informations sur un format d'export
 */
export interface FormatInfo {
  name: string;
  description: string;
  estimatedSize: string;
  supportsTransparency: boolean;
}

/**
 * Format disponible pour le dropdown
 */
export interface AvailableFormat {
  value: ImageExportFormat;
  label: string;
  description: string;
  estimatedSize: string;
}

/**
 * Options par défaut
 */
export const DEFAULT_EXPORT_OPTIONS: ImageExportOptions = {
  format: 'png',
  quality: 0.92,
};

/**
 * Service d'export d'images
 */
export class ImageExportService {
  /**
   * Obtient le type MIME pour un format
   */
  static getMimeType(format: ImageExportFormat): string {
    const mimeTypes: Record<ImageExportFormat, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    return mimeTypes[format] || 'image/png';
  }

  /**
   * Obtient l'extension de fichier pour un format
   */
  static getFileExtension(format: ImageExportFormat): string {
    const extensions: Record<ImageExportFormat, string> = {
      png: '.png',
      jpeg: '.jpg',
      webp: '.webp',
    };
    return extensions[format] || '.png';
  }

  /**
   * Génère un nom de fichier avec la bonne extension
   */
  static generateFilename(format: ImageExportFormat, baseName?: string): string {
    const sanitizedBase = baseName
      ? baseName.replace(/[\/\\:*?"<>|]/g, '-')
      : `dica-export-${Date.now()}`;
    
    return `${sanitizedBase}${this.getFileExtension(format)}`;
  }

  /**
   * Obtient les informations sur un format
   */
  static getFormatInfo(format: ImageExportFormat): FormatInfo {
    const info: Record<ImageExportFormat, FormatInfo> = {
      png: {
        name: 'PNG',
        description: 'Qualité maximale, transparence',
        estimatedSize: '2-5 MB',
        supportsTransparency: true,
      },
      jpeg: {
        name: 'JPEG',
        description: 'Optimisé pour le partage',
        estimatedSize: '200-500 KB',
        supportsTransparency: false,
      },
      webp: {
        name: 'WebP',
        description: 'Format moderne ultra-léger',
        estimatedSize: '100-300 KB',
        supportsTransparency: true,
      },
    };
    return info[format];
  }

  /**
   * Valide et normalise la qualité
   */
  static validateQuality(quality: number): number {
    if (isNaN(quality)) return 0.92;
    if (quality <= 0) return 0.1;
    if (quality > 1) return 1;
    return quality;
  }

  /**
   * Obtient la qualité recommandée pour un format
   */
  static getRecommendedQuality(format: ImageExportFormat): number {
    const qualities: Record<ImageExportFormat, number> = {
      png: 1, // PNG est lossless
      jpeg: 0.9,
      webp: 0.92,
    };
    return qualities[format];
  }

  /**
   * Retourne la liste des formats disponibles
   */
  static getAvailableFormats(): AvailableFormat[] {
    return [
      {
        value: 'png',
        label: 'PNG — Qualité maximale',
        description: 'Sans perte, idéal pour impression',
        estimatedSize: '2-5 MB',
      },
      {
        value: 'jpeg',
        label: 'JPEG — Optimisé partage',
        description: 'Léger, universel',
        estimatedSize: '200-500 KB',
      },
      {
        value: 'webp',
        label: 'WebP — Ultra-léger',
        description: 'Moderne, meilleur ratio qualité/taille',
        estimatedSize: '100-300 KB',
      },
    ];
  }

  /**
   * Convertit une image dans un format donné
   * Utilise canvas pour la conversion
   */
  static async convertImageToFormat(
    imageUrl: string,
    options: ImageExportOptions = DEFAULT_EXPORT_OPTIONS
  ): Promise<Blob> {
    if (!imageUrl || imageUrl.trim() === '') {
      throw new Error('URL image requise');
    }

    const { format, quality = this.getRecommendedQuality(options.format) } = options;
    const validQuality = this.validateQuality(quality);

    // Récupérer l'image via fetch pour contourner CORS
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Erreur de chargement de l'image: ${response.status}`);
    }

    const originalBlob = await response.blob();
    
    // Si c'est déjà le bon format et qualité max, retourner directement
    if (format === 'png' && validQuality === 1) {
      return originalBlob;
    }

    // Créer une image pour le canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Créer un canvas aux dimensions de l'image
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Impossible de créer le contexte canvas');
          }

          // Fond blanc pour JPEG (pas de transparence)
          if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Dessiner l'image
          ctx.drawImage(img, 0, 0);

          // Convertir en blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Échec de la conversion'));
              }
            },
            this.getMimeType(format),
            validQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Erreur de chargement de l\'image'));
      };

      // Charger l'image depuis le blob
      img.src = URL.createObjectURL(originalBlob);
    });
  }

  /**
   * Télécharge une image dans le format spécifié
   */
  static async downloadImage(
    imageUrl: string,
    options: ImageExportOptions = DEFAULT_EXPORT_OPTIONS
  ): Promise<void> {
    const blob = await this.convertImageToFormat(imageUrl, options);
    const filename = options.filename
      ? this.generateFilename(options.format, options.filename)
      : this.generateFilename(options.format);

    // Créer un lien de téléchargement
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Nettoyer
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  }

  /**
   * Obtient la taille estimée d'un blob en format lisible
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

