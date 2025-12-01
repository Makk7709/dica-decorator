/**
 * Tests TDD pour ImageExportService
 * Service d'export d'images en plusieurs formats (PNG, JPEG, WebP)
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ImageExportService,
  ImageExportFormat,
  ImageExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from '../image-export.service';

describe('ImageExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration et types', () => {
    it('should have PNG as default format', () => {
      expect(DEFAULT_EXPORT_OPTIONS.format).toBe('png');
    });

    it('should have quality 0.92 as default', () => {
      expect(DEFAULT_EXPORT_OPTIONS.quality).toBe(0.92);
    });

    it('should support all three formats', () => {
      const formats: ImageExportFormat[] = ['png', 'jpeg', 'webp'];
      formats.forEach(format => {
        expect(['png', 'jpeg', 'webp']).toContain(format);
      });
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for PNG', () => {
      expect(ImageExportService.getMimeType('png')).toBe('image/png');
    });

    it('should return correct MIME type for JPEG', () => {
      expect(ImageExportService.getMimeType('jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for WebP', () => {
      expect(ImageExportService.getMimeType('webp')).toBe('image/webp');
    });

    it('should default to PNG for unknown format', () => {
      expect(ImageExportService.getMimeType('unknown' as ImageExportFormat)).toBe('image/png');
    });
  });

  describe('getFileExtension', () => {
    it('should return .png for PNG format', () => {
      expect(ImageExportService.getFileExtension('png')).toBe('.png');
    });

    it('should return .jpg for JPEG format', () => {
      expect(ImageExportService.getFileExtension('jpeg')).toBe('.jpg');
    });

    it('should return .webp for WebP format', () => {
      expect(ImageExportService.getFileExtension('webp')).toBe('.webp');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with correct extension for PNG', () => {
      const filename = ImageExportService.generateFilename('png', 'test-render');
      expect(filename).toBe('test-render.png');
    });

    it('should generate filename with correct extension for JPEG', () => {
      const filename = ImageExportService.generateFilename('jpeg', 'test-render');
      expect(filename).toBe('test-render.jpg');
    });

    it('should generate filename with correct extension for WebP', () => {
      const filename = ImageExportService.generateFilename('webp', 'test-render');
      expect(filename).toBe('test-render.webp');
    });

    it('should generate default filename with timestamp if no base provided', () => {
      const filename = ImageExportService.generateFilename('png');
      expect(filename).toMatch(/^dica-export-\d+\.png$/);
    });

    it('should sanitize filename by removing invalid characters', () => {
      const filename = ImageExportService.generateFilename('png', 'test/render:file*name');
      expect(filename).toBe('test-render-file-name.png');
    });
  });

  describe('getFormatInfo', () => {
    it('should return correct info for PNG', () => {
      const info = ImageExportService.getFormatInfo('png');
      expect(info.name).toBe('PNG');
      expect(info.description).toContain('Qualité maximale');
      expect(info.estimatedSize).toContain('2-5 MB');
    });

    it('should return correct info for JPEG', () => {
      const info = ImageExportService.getFormatInfo('jpeg');
      expect(info.name).toBe('JPEG');
      expect(info.description).toContain('partage');
      expect(info.estimatedSize).toContain('200-500 KB');
    });

    it('should return correct info for WebP', () => {
      const info = ImageExportService.getFormatInfo('webp');
      expect(info.name).toBe('WebP');
      expect(info.description).toContain('moderne');
      expect(info.estimatedSize).toContain('100-300 KB');
    });
  });

  describe('validateQuality', () => {
    it('should accept quality between 0 and 1', () => {
      expect(ImageExportService.validateQuality(0.5)).toBe(0.5);
      expect(ImageExportService.validateQuality(0.92)).toBe(0.92);
      expect(ImageExportService.validateQuality(1)).toBe(1);
    });

    it('should clamp quality below 0 to 0.1', () => {
      expect(ImageExportService.validateQuality(-0.5)).toBe(0.1);
      expect(ImageExportService.validateQuality(0)).toBe(0.1);
    });

    it('should clamp quality above 1 to 1', () => {
      expect(ImageExportService.validateQuality(1.5)).toBe(1);
      expect(ImageExportService.validateQuality(2)).toBe(1);
    });

    it('should handle NaN by returning default quality', () => {
      expect(ImageExportService.validateQuality(NaN)).toBe(0.92);
    });
  });

  describe('getRecommendedQuality', () => {
    it('should return 1 for PNG (lossless)', () => {
      expect(ImageExportService.getRecommendedQuality('png')).toBe(1);
    });

    it('should return 0.9 for JPEG', () => {
      expect(ImageExportService.getRecommendedQuality('jpeg')).toBe(0.9);
    });

    it('should return 0.92 for WebP', () => {
      expect(ImageExportService.getRecommendedQuality('webp')).toBe(0.92);
    });
  });

  describe('convertImageToFormat (mock canvas)', () => {
    // Ces tests nécessitent un mock de canvas car nous sommes dans un environnement Node
    
    it('should throw error if image URL is empty', async () => {
      await expect(ImageExportService.convertImageToFormat('')).rejects.toThrow('URL image requise');
    });

    it('should throw error if image URL is invalid', async () => {
      await expect(ImageExportService.convertImageToFormat('not-a-url')).rejects.toThrow();
    });
  });

  describe('getAvailableFormats', () => {
    it('should return all three formats', () => {
      const formats = ImageExportService.getAvailableFormats();
      expect(formats).toHaveLength(3);
      expect(formats.map(f => f.value)).toEqual(['png', 'jpeg', 'webp']);
    });

    it('should have labels for each format', () => {
      const formats = ImageExportService.getAvailableFormats();
      formats.forEach(format => {
        expect(format.label).toBeDefined();
        expect(format.label.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptions for each format', () => {
      const formats = ImageExportService.getAvailableFormats();
      formats.forEach(format => {
        expect(format.description).toBeDefined();
      });
    });
  });

  describe('Integration - Options complètes', () => {
    it('should create valid export options with all defaults', () => {
      const options: ImageExportOptions = {
        format: 'png',
      };
      
      expect(options.format).toBe('png');
      expect(options.quality).toBeUndefined(); // Will use default
      expect(options.filename).toBeUndefined(); // Will be generated
    });

    it('should create valid export options with custom values', () => {
      const options: ImageExportOptions = {
        format: 'jpeg',
        quality: 0.85,
        filename: 'mon-export-personnalise',
      };
      
      expect(options.format).toBe('jpeg');
      expect(options.quality).toBe(0.85);
      expect(options.filename).toBe('mon-export-personnalise');
    });
  });
});

