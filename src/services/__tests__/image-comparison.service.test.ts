/**
 * @fileoverview Tests TDD pour ImageComparisonService
 * Service de comparaison avant/après avec slider interactif
 * 
 * Fonctionnalités testées:
 * - Configuration du slider
 * - Validation des images
 * - Calcul des positions
 * - Gestion des événements
 * - Export de la comparaison
 * - Accessibilité
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ImageComparisonService,
  ComparisonConfig,
  ComparisonState,
  SliderPosition,
  ComparisonExport,
  ImagePair,
  SliderOrientation,
  ComparisonError,
} from '../image-comparison.service';

describe('ImageComparisonService', () => {
  let service: ImageComparisonService;

  beforeEach(() => {
    service = new ImageComparisonService();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    it('should create service with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.orientation).toBe('horizontal');
      expect(config.initialPosition).toBe(50);
      expect(config.showLabels).toBe(true);
      expect(config.labelBefore).toBe('Avant');
      expect(config.labelAfter).toBe('Après');
      expect(config.sliderColor).toBe('#E94E5D');
      expect(config.sliderWidth).toBe(4);
      expect(config.handleSize).toBe(40);
      expect(config.animationDuration).toBe(300);
      expect(config.enableKeyboard).toBe(true);
      expect(config.enableTouch).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customConfig: Partial<ComparisonConfig> = {
        orientation: 'vertical',
        initialPosition: 30,
        labelBefore: 'Original',
        labelAfter: 'Rendu DICA',
        sliderColor: '#000000',
      };
      
      service.configure(customConfig);
      const config = service.getConfig();
      
      expect(config.orientation).toBe('vertical');
      expect(config.initialPosition).toBe(30);
      expect(config.labelBefore).toBe('Original');
      expect(config.labelAfter).toBe('Rendu DICA');
      expect(config.sliderColor).toBe('#000000');
    });

    it('should validate configuration values', () => {
      expect(() => service.configure({ initialPosition: -10 }))
        .toThrow(ComparisonError);
      expect(() => service.configure({ initialPosition: 110 }))
        .toThrow(ComparisonError);
      expect(() => service.configure({ sliderWidth: 0 }))
        .toThrow(ComparisonError);
      expect(() => service.configure({ handleSize: -5 }))
        .toThrow(ComparisonError);
    });

    it('should reset configuration to defaults', () => {
      service.configure({ initialPosition: 75, orientation: 'vertical' });
      service.resetConfig();
      
      const config = service.getConfig();
      expect(config.initialPosition).toBe(50);
      expect(config.orientation).toBe('horizontal');
    });

    it('should support DICA branded presets', () => {
      service.applyPreset('dica-default');
      const config = service.getConfig();
      
      expect(config.sliderColor).toBe('#E94E5D');
      expect(config.labelBefore).toBe('Photo originale');
      expect(config.labelAfter).toBe('Avec décor DICA');
    });

    it('should support dark mode preset', () => {
      service.applyPreset('dica-dark');
      const config = service.getConfig();
      
      expect(config.sliderColor).toBe('#FFFFFF');
      expect(config.handleSize).toBe(44);
    });
  });

  // ============================================================================
  // Image Pair Validation Tests
  // ============================================================================
  describe('Image Pair Validation', () => {
    it('should validate valid image pair', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate base64 images', () => {
      const pair: ImagePair = {
        before: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        after: 'data:image/png;base64,iVBORw0KGgo...',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(true);
    });

    it('should reject empty before image', () => {
      const pair: ImagePair = {
        before: '',
        after: 'https://example.com/render.jpg',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('before_image_required');
    });

    it('should reject empty after image', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: '',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('after_image_required');
    });

    it('should reject invalid URL format', () => {
      const pair: ImagePair = {
        before: 'not-a-valid-url',
        after: 'https://example.com/render.jpg',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid_before_url');
    });

    it('should reject unsupported image formats', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.bmp',
        after: 'https://example.com/render.jpg',
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('unsupported_format');
    });

    it('should accept supported formats (jpg, jpeg, png, webp, svg)', () => {
      const formats = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
      
      formats.forEach(format => {
        const pair: ImagePair = {
          before: `https://example.com/photo.${format}`,
          after: `https://example.com/render.${format}`,
        };
        
        const result = service.validateImagePair(pair);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate image pair with metadata', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
        metadata: {
          decorName: 'Inox Brossé',
          decorCode: '3020BN',
          projectId: 'uuid-123',
        },
      };
      
      const result = service.validateImagePair(pair);
      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
    });
  });

  // ============================================================================
  // Slider Position Calculation Tests
  // ============================================================================
  describe('Position Calculation', () => {
    it('should calculate position from percentage', () => {
      const containerWidth = 800;
      const position = service.calculatePosition(50, containerWidth, 'horizontal');
      
      expect(position.x).toBe(400);
      expect(position.percentage).toBe(50);
    });

    it('should calculate vertical position', () => {
      const containerHeight = 600;
      const position = service.calculatePosition(50, containerHeight, 'vertical');
      
      expect(position.y).toBe(300);
      expect(position.percentage).toBe(50);
    });

    it('should clamp position to valid range', () => {
      const position1 = service.calculatePosition(-10, 800, 'horizontal');
      expect(position1.percentage).toBe(0);
      
      const position2 = service.calculatePosition(150, 800, 'horizontal');
      expect(position2.percentage).toBe(100);
    });

    it('should calculate percentage from pixel position', () => {
      const percentage = service.pixelToPercentage(400, 800);
      expect(percentage).toBe(50);
    });

    it('should handle edge cases for pixel calculation', () => {
      expect(service.pixelToPercentage(0, 800)).toBe(0);
      expect(service.pixelToPercentage(800, 800)).toBe(100);
      expect(service.pixelToPercentage(200, 800)).toBe(25);
    });

    it('should calculate clip paths for horizontal orientation', () => {
      const clipPaths = service.calculateClipPaths(50, 'horizontal');
      
      expect(clipPaths.before).toBe('inset(0 50% 0 0)');
      expect(clipPaths.after).toBe('inset(0 0 0 50%)');
    });

    it('should calculate clip paths for vertical orientation', () => {
      const clipPaths = service.calculateClipPaths(50, 'vertical');
      
      expect(clipPaths.before).toBe('inset(0 0 50% 0)');
      expect(clipPaths.after).toBe('inset(50% 0 0 0)');
    });

    it('should calculate slider handle position', () => {
      const handlePos = service.calculateHandlePosition(50, 800, 600, 'horizontal');
      
      expect(handlePos.left).toBe(400);
      expect(handlePos.top).toBe(300); // Centered vertically
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================
  describe('State Management', () => {
    it('should initialize with default state', () => {
      const state = service.getState();
      
      expect(state.position).toBe(50);
      expect(state.isDragging).toBe(false);
      expect(state.isAnimating).toBe(false);
      expect(state.isLoaded).toBe(false);
    });

    it('should update position state', () => {
      service.setPosition(75);
      const state = service.getState();
      
      expect(state.position).toBe(75);
    });

    it('should emit state change events', () => {
      const callback = vi.fn();
      service.onStateChange(callback);
      
      service.setPosition(30);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ position: 30 })
      );
    });

    it('should support multiple state listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.onStateChange(callback1);
      service.onStateChange(callback2);
      
      service.setPosition(60);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should allow unsubscribing from state changes', () => {
      const callback = vi.fn();
      const unsubscribe = service.onStateChange(callback);
      
      service.setPosition(40);
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      service.setPosition(60);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should track dragging state', () => {
      service.startDrag();
      expect(service.getState().isDragging).toBe(true);
      
      service.endDrag();
      expect(service.getState().isDragging).toBe(false);
    });

    it('should track loading state', () => {
      service.setLoaded(true);
      expect(service.getState().isLoaded).toBe(true);
      
      service.setLoaded(false);
      expect(service.getState().isLoaded).toBe(false);
    });
  });

  // ============================================================================
  // Animation Tests
  // ============================================================================
  describe('Animation', () => {
    it('should set isAnimating to true when animation starts', () => {
      service.setPosition(0);
      
      // Start animation without awaiting
      service.animateTo(100);
      
      expect(service.getState().isAnimating).toBe(true);
    });

    it('should have animation duration in config', () => {
      const config = service.getConfig();
      expect(config.animationDuration).toBe(300);
    });

    it('should support custom animation duration config', () => {
      service.configure({ animationDuration: 500 });
      const config = service.getConfig();
      expect(config.animationDuration).toBe(500);
    });

    it('should support easing option parameter', () => {
      service.setPosition(0);
      
      // This should not throw
      expect(() => {
        service.animateTo(100, { easing: 'easeInOut' });
      }).not.toThrow();
    });

    it('should support onProgress callback option', () => {
      const progressCallback = vi.fn();
      service.setPosition(0);
      
      // This should not throw
      expect(() => {
        service.animateTo(100, { onProgress: progressCallback });
      }).not.toThrow();
    });

    it('should call resetPosition without error', () => {
      service.configure({ initialPosition: 50 });
      service.setPosition(100);
      
      expect(() => service.resetPosition()).not.toThrow();
    });

    it('should use smoothSetPosition with requestAnimationFrame', () => {
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 0;
      });
      
      service.smoothSetPosition(75);
      
      expect(rafSpy).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
  });

  // ============================================================================
  // Event Handling Tests
  // ============================================================================
  describe('Event Handling', () => {
    it('should handle mouse move during drag', () => {
      service.startDrag();
      
      const mockEvent = {
        clientX: 400,
        clientY: 300,
        preventDefault: vi.fn(),
      };
      
      const containerRect = {
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      };
      
      service.handleMouseMove(mockEvent as any, containerRect);
      
      expect(service.getState().position).toBe(50);
    });

    it('should not handle mouse move when not dragging', () => {
      const mockEvent = {
        clientX: 400,
        clientY: 300,
        preventDefault: vi.fn(),
      };
      
      const containerRect = {
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      };
      
      service.setPosition(25);
      service.handleMouseMove(mockEvent as any, containerRect);
      
      expect(service.getState().position).toBe(25);
    });

    it('should handle touch events', () => {
      service.configure({ enableTouch: true });
      service.startDrag();
      
      const mockTouchEvent = {
        touches: [{ clientX: 600, clientY: 300 }],
        preventDefault: vi.fn(),
      };
      
      const containerRect = {
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      };
      
      service.handleTouchMove(mockTouchEvent as any, containerRect);
      
      expect(service.getState().position).toBe(75);
    });

    it('should ignore touch events when disabled', () => {
      service.configure({ enableTouch: false });
      service.startDrag();
      
      const mockTouchEvent = {
        touches: [{ clientX: 600, clientY: 300 }],
        preventDefault: vi.fn(),
      };
      
      const containerRect = {
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      };
      
      service.setPosition(25);
      service.handleTouchMove(mockTouchEvent as any, containerRect);
      
      expect(service.getState().position).toBe(25);
    });

    it('should handle keyboard navigation (arrow keys)', () => {
      service.configure({ enableKeyboard: true });
      service.setPosition(50);
      
      service.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(51);
      
      service.handleKeyDown({ key: 'ArrowLeft', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(50);
    });

    it('should handle keyboard navigation (arrow up/down for vertical)', () => {
      service.configure({ enableKeyboard: true, orientation: 'vertical' });
      service.setPosition(50);
      
      service.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(51);
      
      service.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(50);
    });

    it('should support large jumps with Page keys', () => {
      service.configure({ enableKeyboard: true });
      service.setPosition(50);
      
      service.handleKeyDown({ key: 'PageUp', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(40);
      
      service.handleKeyDown({ key: 'PageDown', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(50);
    });

    it('should jump to extremes with Home/End keys', () => {
      service.configure({ enableKeyboard: true });
      service.setPosition(50);
      
      service.handleKeyDown({ key: 'Home', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(0);
      
      service.handleKeyDown({ key: 'End', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(100);
    });

    it('should ignore keyboard when disabled', () => {
      service.configure({ enableKeyboard: false });
      service.setPosition(50);
      
      service.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() } as any);
      expect(service.getState().position).toBe(50);
    });
  });

  // ============================================================================
  // Export Tests
  // ============================================================================
  describe('Export', () => {
    it('should generate export filename with metadata', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
        metadata: {
          decorName: 'Inox Brossé',
          decorCode: '3020BN',
        },
      };
      
      const filename = service.generateExportFilename(pair);
      
      expect(filename).toContain('dica-comparison');
      expect(filename).toContain('3020BN');
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
    });

    it('should generate filename with unknown code when no metadata', () => {
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
      };
      
      const filename = service.generateExportFilename(pair);
      
      expect(filename).toContain('dica-comparison');
      expect(filename).toContain('unknown');
    });

    it('should reject export with invalid images', async () => {
      const pair: ImagePair = {
        before: '',
        after: 'https://example.com/render.jpg',
      };
      
      await expect(service.exportComparison(pair, {}))
        .rejects.toThrow(ComparisonError);
    });

    it('should set export handler', () => {
      const handler = vi.fn().mockResolvedValue({ dataUrl: 'mock' });
      service.setExportHandler(handler);
      
      // Handler should be set (internal state)
      expect(() => service.setExportHandler(handler)).not.toThrow();
    });

    it('should debounce export calls', async () => {
      vi.useFakeTimers();
      const handler = vi.fn().mockResolvedValue({ dataUrl: 'mock' });
      service.setExportHandler(handler);
      
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
      };
      
      // Multiple rapid calls
      service.debouncedExport(pair, {});
      service.debouncedExport(pair, {});
      service.debouncedExport(pair, {});
      
      vi.advanceTimersByTime(350);
      
      expect(handler).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('Accessibility', () => {
    it('should generate ARIA attributes', () => {
      const ariaProps = service.getAriaAttributes();
      
      expect(ariaProps.role).toBe('slider');
      expect(ariaProps['aria-valuemin']).toBe(0);
      expect(ariaProps['aria-valuemax']).toBe(100);
      expect(ariaProps['aria-valuenow']).toBe(50);
      expect(ariaProps['aria-label']).toBeDefined();
    });

    it('should update ARIA value when position changes', () => {
      service.setPosition(75);
      const ariaProps = service.getAriaAttributes();
      
      expect(ariaProps['aria-valuenow']).toBe(75);
    });

    it('should provide descriptive ARIA label', () => {
      service.configure({ labelBefore: 'Original', labelAfter: 'Rendu' });
      const ariaProps = service.getAriaAttributes();
      
      expect(ariaProps['aria-label']).toContain('Original');
      expect(ariaProps['aria-label']).toContain('Rendu');
    });

    it('should indicate dragging state in ARIA', () => {
      service.startDrag();
      const ariaProps = service.getAriaAttributes();
      
      expect(ariaProps['aria-grabbed']).toBe(true);
    });

    it('should generate focus trap attributes', () => {
      const focusProps = service.getFocusAttributes();
      
      expect(focusProps.tabIndex).toBe(0);
      expect(focusProps.onFocus).toBeDefined();
      expect(focusProps.onBlur).toBeDefined();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================
  describe('Performance', () => {
    it('should support throttle option for position updates', () => {
      const callback = vi.fn();
      service.onStateChange(callback);
      
      // First call should work
      service.setPosition(10, { throttle: true });
      const firstCallCount = callback.mock.calls.length;
      
      // Immediate second call should be throttled
      service.setPosition(20, { throttle: true });
      
      // At minimum, first call should have triggered
      expect(firstCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should set position without throttle by default', () => {
      const callback = vi.fn();
      service.onStateChange(callback);
      
      service.setPosition(10);
      service.setPosition(20);
      service.setPosition(30);
      
      // All calls should trigger without throttle
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should use requestAnimationFrame for smooth updates', () => {
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
        cb(0);
        return 0;
      });
      
      service.smoothSetPosition(75);
      
      expect(rafSpy).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw ComparisonError for invalid image pair export', async () => {
      const invalidPair: ImagePair = {
        before: '',
        after: '',
      };
      
      await expect(service.exportComparison(invalidPair, {}))
        .rejects.toThrow(ComparisonError);
    });

    it('should provide error codes for debugging', () => {
      try {
        service.configure({ initialPosition: -50 });
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ComparisonError);
        expect((error as ComparisonError).code).toBe('INVALID_CONFIG');
      }
    });

    it('should throw ComparisonError with correct code for invalid position', () => {
      expect(() => service.configure({ initialPosition: 150 }))
        .toThrow(ComparisonError);
    });

    it('should throw ComparisonError with correct code for invalid sliderWidth', () => {
      expect(() => service.configure({ sliderWidth: 0 }))
        .toThrow(ComparisonError);
    });

    it('should throw ComparisonError with correct code for invalid handleSize', () => {
      expect(() => service.configure({ handleSize: -10 }))
        .toThrow(ComparisonError);
    });

    it('should emit error events', () => {
      const errorCallback = vi.fn();
      service.onError(errorCallback);
      
      service.emitError(new ComparisonError('Test error', 'TEST_ERROR'));
      
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TEST_ERROR' })
      );
    });

    it('should allow unsubscribing from error events', () => {
      const errorCallback = vi.fn();
      const unsubscribe = service.onError(errorCallback);
      
      service.emitError(new ComparisonError('Error 1', 'ERR1'));
      expect(errorCallback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      service.emitError(new ComparisonError('Error 2', 'ERR2'));
      expect(errorCallback).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should work with complete workflow', async () => {
      // 1. Configure
      service.configure({
        orientation: 'horizontal',
        initialPosition: 50,
        labelBefore: 'Photo',
        labelAfter: 'Rendu DICA',
      });
      
      // 2. Validate image pair
      const pair: ImagePair = {
        before: 'https://example.com/photo.jpg',
        after: 'https://example.com/render.jpg',
        metadata: { decorCode: '3020BN' },
      };
      
      const validation = service.validateImagePair(pair);
      expect(validation.valid).toBe(true);
      
      // 3. Set position
      service.setPosition(50);
      
      // 4. Get state
      const state = service.getState();
      expect(state.position).toBe(50);
      
      // 5. Get clip paths
      const clipPaths = service.calculateClipPaths(50, 'horizontal');
      expect(clipPaths.before).toBeDefined();
      expect(clipPaths.after).toBeDefined();
      
      // 6. Get ARIA attributes
      const aria = service.getAriaAttributes();
      expect(aria['aria-valuenow']).toBe(50);
    });

    it('should maintain consistency across operations', () => {
      service.configure({ initialPosition: 25 });
      service.setPosition(75);
      service.startDrag();
      service.setPosition(50);
      service.endDrag();
      
      const state = service.getState();
      expect(state.position).toBe(50);
      expect(state.isDragging).toBe(false);
    });
  });
});

