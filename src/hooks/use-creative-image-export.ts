/**
 * @fileoverview Hook useCreativeImageExport
 * 
 * Hook permettant l'export d'images générées par l'assistant créatif
 * en plusieurs formats (PNG, JPEG, WebP).
 * 
 * Features:
 * - Export multi-format (PNG, JPEG, WebP)
 * - Gestion d'état pendant l'export
 * - Notifications toast automatiques
 * - Prévention des exports concurrents
 * - Fonctions shortcut par format
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ImageExportService,
  ImageExportFormat,
  ImageExportOptions,
  AvailableFormat,
} from '@/services/image-export.service';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CreativeExportState {
  isExporting: boolean;
  exportingFormat: ImageExportFormat | null;
  error: string | null;
  lastExportedFormat: ImageExportFormat | null;
}

export interface CreativeExportResult {
  success: boolean;
  format?: ImageExportFormat;
  error?: string;
}

export interface UseCreativeImageExportReturn extends CreativeExportState {
  /** Liste des formats disponibles */
  availableFormats: AvailableFormat[];
  
  /** Exporte une image dans le format spécifié */
  exportImage: (imageUrl: string, format: ImageExportFormat, filename?: string) => Promise<CreativeExportResult>;
  
  /** Shortcut pour export PNG */
  exportAsPng: (imageUrl: string, filename?: string) => Promise<CreativeExportResult>;
  
  /** Shortcut pour export JPEG */
  exportAsJpeg: (imageUrl: string, filename?: string) => Promise<CreativeExportResult>;
  
  /** Shortcut pour export WebP */
  exportAsWebp: (imageUrl: string, filename?: string) => Promise<CreativeExportResult>;
  
  /** Réinitialise l'état du hook */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCreativeImageExport(): UseCreativeImageExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ImageExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExportedFormat, setLastExportedFormat] = useState<ImageExportFormat | null>(null);

  /**
   * Exporte une image dans le format spécifié
   */
  const exportImage = useCallback(async (
    imageUrl: string,
    format: ImageExportFormat,
    filename?: string
  ): Promise<CreativeExportResult> => {
    // Validation URL
    if (!imageUrl || imageUrl.trim() === '') {
      const errorMsg = 'URL image requise';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    // Prévenir les exports concurrents
    if (isExporting) {
      return { success: false, error: 'Export déjà en cours' };
    }

    // Démarrer l'export
    setIsExporting(true);
    setExportingFormat(format);
    setError(null);

    try {
      const quality = ImageExportService.getRecommendedQuality(format);
      
      const options: ImageExportOptions = {
        format,
        quality,
        filename: filename || `dica-creative-${Date.now()}`,
      };

      await ImageExportService.downloadImage(imageUrl, options);

      // Succès
      const formatInfo = ImageExportService.getFormatInfo(format);
      toast.success(`Image téléchargée en ${formatInfo.name} !`);
      setLastExportedFormat(format);

      return { success: true, format };
    } catch (err) {
      // Erreur
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
      setError(errorMessage);
      toast.error(`Erreur: ${errorMessage}`);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [isExporting]);

  /**
   * Shortcut pour export PNG
   */
  const exportAsPng = useCallback(async (
    imageUrl: string,
    filename?: string
  ): Promise<CreativeExportResult> => {
    return exportImage(imageUrl, 'png', filename);
  }, [exportImage]);

  /**
   * Shortcut pour export JPEG
   */
  const exportAsJpeg = useCallback(async (
    imageUrl: string,
    filename?: string
  ): Promise<CreativeExportResult> => {
    return exportImage(imageUrl, 'jpeg', filename);
  }, [exportImage]);

  /**
   * Shortcut pour export WebP
   */
  const exportAsWebp = useCallback(async (
    imageUrl: string,
    filename?: string
  ): Promise<CreativeExportResult> => {
    return exportImage(imageUrl, 'webp', filename);
  }, [exportImage]);

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setError(null);
    setLastExportedFormat(null);
    setExportingFormat(null);
    setIsExporting(false);
  }, []);

  return {
    // State
    isExporting,
    exportingFormat,
    error,
    lastExportedFormat,
    
    // Data
    availableFormats: ImageExportService.getAvailableFormats(),
    
    // Actions
    exportImage,
    exportAsPng,
    exportAsJpeg,
    exportAsWebp,
    reset,
  };
}

export default useCreativeImageExport;
