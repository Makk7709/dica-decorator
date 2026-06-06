/**
 * @fileoverview Tests TDD pour useCreativeImageExport hook
 * 
 * Hook permettant l'export d'images générées par l'assistant créatif
 * en plusieurs formats (PNG, JPEG, WebP).
 * 
 * Process TDD strict - Ces tests sont écrits AVANT l'implémentation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useCreativeImageExport} from '../use-creative-image-export';
import { ImageExportFormat } from '@/services/image-export.service';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock ImageExportService
vi.mock('@/services/image-export.service', () => ({
  ImageExportService: {
    downloadImage: vi.fn(),
    getAvailableFormats: vi.fn(() => [
      { value: 'png', label: 'PNG — Qualité maximale', description: 'Sans perte', estimatedSize: '2-5 MB' },
      { value: 'jpeg', label: 'JPEG — Optimisé partage', description: 'Léger', estimatedSize: '200-500 KB' },
      { value: 'webp', label: 'WebP — Ultra-léger', description: 'Moderne', estimatedSize: '100-300 KB' },
    ]),
    getFormatInfo: vi.fn((format: ImageExportFormat) => {
      const info: Record<string, { name: string; description: string; estimatedSize: string; supportsTransparency: boolean }> = {
        png: { name: 'PNG', description: 'Qualité maximale', estimatedSize: '2-5 MB', supportsTransparency: true },
        jpeg: { name: 'JPEG', description: 'Optimisé partage', estimatedSize: '200-500 KB', supportsTransparency: false },
        webp: { name: 'WebP', description: 'Ultra-léger', estimatedSize: '100-300 KB', supportsTransparency: true },
      };
      return info[format];
    }),
    getRecommendedQuality: vi.fn((format: ImageExportFormat) => {
      const qualities: Record<string, number> = { png: 1, jpeg: 0.9, webp: 0.92 };
      return qualities[format] || 0.92;
    }),
    generateFilename: vi.fn((format: string, baseName?: string) => {
      const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
      return baseName ? `${baseName}${ext}` : `dica-creative-${Date.now()}${ext}`;
    }),
  },
  DEFAULT_EXPORT_OPTIONS: { format: 'png', quality: 0.92 },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

import { ImageExportService } from '@/services/image-export.service';
import { toast } from 'sonner';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const VALID_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_HTTP_URL = 'https://storage.example.com/image.png';
const INVALID_URL = '';

// ============================================================================
// Test Suite: useCreativeImageExport
// ============================================================================

describe('useCreativeImageExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Hook Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCreativeImageExport());

      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportingFormat).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.lastExportedFormat).toBeNull();
    });

    it('should provide available formats', () => {
      const { result } = renderHook(() => useCreativeImageExport());

      expect(result.current.availableFormats).toBeDefined();
      expect(result.current.availableFormats.length).toBe(3);
      expect(result.current.availableFormats.map(f => f.value)).toEqual(['png', 'jpeg', 'webp']);
    });

    it('should provide export function', () => {
      const { result } = renderHook(() => useCreativeImageExport());

      expect(typeof result.current.exportImage).toBe('function');
    });

    it('should provide exportAs shortcut functions', () => {
      const { result } = renderHook(() => useCreativeImageExport());

      expect(typeof result.current.exportAsPng).toBe('function');
      expect(typeof result.current.exportAsJpeg).toBe('function');
      expect(typeof result.current.exportAsWebp).toBe('function');
    });
  });

  // ==========================================================================
  // 2. Export Function Tests
  // ==========================================================================

  describe('exportImage', () => {
    it('should export image in PNG format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({
          format: 'png',
        })
      );
    });

    it('should export image in JPEG format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'jpeg');
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({
          format: 'jpeg',
        })
      );
    });

    it('should export image in WebP format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'webp');
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({
          format: 'webp',
        })
      );
    });

    it('should use custom filename when provided', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png', 'mon-image-creative');
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({
          filename: 'mon-image-creative',
        })
      );
    });

    it('should use recommended quality for each format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (ImageExportService.getRecommendedQuality as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(1)      // PNG
        .mockReturnValueOnce(0.9)    // JPEG
        .mockReturnValueOnce(0.92);  // WebP

      const { result } = renderHook(() => useCreativeImageExport());

      // Export PNG
      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(ImageExportService.downloadImage).toHaveBeenLastCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ quality: 1 })
      );

      // Export JPEG
      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'jpeg');
      });

      expect(ImageExportService.downloadImage).toHaveBeenLastCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ quality: 0.9 })
      );

      // Export WebP
      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'webp');
      });

      expect(ImageExportService.downloadImage).toHaveBeenLastCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ quality: 0.92 })
      );
    });
  });

  // ==========================================================================
  // 3. State Management Tests
  // ==========================================================================

  describe('State Management', () => {
    it('should set isExporting to true during export', async () => {
      let resolvePromise: () => void;
      const exportPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockReturnValue(exportPromise);

      const { result } = renderHook(() => useCreativeImageExport());

      // Start export
      act(() => {
        result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      // Check loading state
      expect(result.current.isExporting).toBe(true);
      expect(result.current.exportingFormat).toBe('png');

      // Complete export
      await act(async () => {
        resolvePromise!();
        await exportPromise;
      });

      // Check state reset
      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportingFormat).toBeNull();
    });

    it('should track the format being exported', async () => {
      let resolvePromise: () => void;
      const exportPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockReturnValue(exportPromise);

      const { result } = renderHook(() => useCreativeImageExport());

      act(() => {
        result.current.exportImage(VALID_HTTP_URL, 'jpeg');
      });

      expect(result.current.exportingFormat).toBe('jpeg');

      await act(async () => {
        resolvePromise!();
        await exportPromise;
      });
    });

    it('should update lastExportedFormat after successful export', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'webp');
      });

      expect(result.current.lastExportedFormat).toBe('webp');
    });

    it('should not update lastExportedFormat on failure', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        try {
          await result.current.exportImage(VALID_HTTP_URL, 'png');
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.lastExportedFormat).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should set error state on export failure', async () => {
      const errorMessage = 'Network error during export';
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should show error toast on failure', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(toast.error).toHaveBeenCalled();
    });

    it('should clear error on successful export', async () => {
      // First, trigger an error
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Export failed'));

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(result.current.error).not.toBeNull();

      // Then, successful export
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle empty URL gracefully', async () => {
      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage('', 'png');
      });

      expect(result.current.error).not.toBeNull();
      expect(ImageExportService.downloadImage).not.toHaveBeenCalled();
    });

    it('should prevent concurrent exports', async () => {
      let resolveFirst: () => void;
      const firstExport = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockReturnValue(firstExport);

      const { result } = renderHook(() => useCreativeImageExport());

      // Start first export
      act(() => {
        result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      // Try second export while first is in progress
      act(() => {
        result.current.exportImage(VALID_HTTP_URL, 'jpeg');
      });

      // Should only have called once
      expect(ImageExportService.downloadImage).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolveFirst!();
        await firstExport;
      });
    });
  });

  // ==========================================================================
  // 5. Toast Notifications Tests
  // ==========================================================================

  describe('Toast Notifications', () => {
    it('should show success toast with format name on successful PNG export', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PNG'));
    });

    it('should show success toast with format name on successful JPEG export', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'jpeg');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('JPEG'));
    });

    it('should show success toast with format name on successful WebP export', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'webp');
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('WebP'));
    });
  });

  // ==========================================================================
  // 6. Shortcut Functions Tests
  // ==========================================================================

  describe('Shortcut Functions', () => {
    it('exportAsPng should call exportImage with png format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportAsPng(VALID_HTTP_URL);
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ format: 'png' })
      );
    });

    it('exportAsJpeg should call exportImage with jpeg format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportAsJpeg(VALID_HTTP_URL);
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ format: 'jpeg' })
      );
    });

    it('exportAsWebp should call exportImage with webp format', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportAsWebp(VALID_HTTP_URL);
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ format: 'webp' })
      );
    });

    it('shortcut functions should accept optional filename', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportAsPng(VALID_HTTP_URL, 'custom-name');
      });

      expect(ImageExportService.downloadImage).toHaveBeenCalledWith(
        VALID_HTTP_URL,
        expect.objectContaining({ filename: 'custom-name' })
      );
    });
  });

  // ==========================================================================
  // 7. Reset Function Tests
  // ==========================================================================

  describe('Reset Function', () => {
    it('should provide reset function', () => {
      const { result } = renderHook(() => useCreativeImageExport());

      expect(typeof result.current.reset).toBe('function');
    });

    it('should clear error state on reset', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear lastExportedFormat on reset', async () => {
      (ImageExportService.downloadImage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCreativeImageExport());

      await act(async () => {
        await result.current.exportImage(VALID_HTTP_URL, 'png');
      });

      expect(result.current.lastExportedFormat).toBe('png');

      act(() => {
        result.current.reset();
      });

      expect(result.current.lastExportedFormat).toBeNull();
    });
  });
});
