/**
 * @fileoverview Tests TDD pour PresentationService
 * Service de mode présentation fullscreen avec slideshow
 * 
 * Fonctionnalités testées:
 * - Gestion du slideshow
 * - Navigation entre slides
 * - Mode fullscreen
 * - Transitions et animations
 * - Raccourcis clavier
 * - Autoplay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PresentationService,
  PresentationConfig,
  Slide,
  SlideTransition,
  PresentationState,
  NavigationDirection,
  PresentationError,
  SlideType,
  AutoplayConfig,
} from '../presentation.service';

describe('PresentationService', () => {
  let service: PresentationService;

  beforeEach(() => {
    service = new PresentationService();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    it('should create service with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.transitionDuration).toBe(500);
      expect(config.transitionType).toBe('fade');
      expect(config.enableKeyboard).toBe(true);
      expect(config.enableSwipe).toBe(true);
      expect(config.showControls).toBe(true);
      expect(config.showProgress).toBe(true);
      expect(config.loopSlides).toBe(false);
      expect(config.backgroundColor).toBe('#000000');
    });

    it('should allow custom configuration', () => {
      service.configure({
        transitionDuration: 800,
        transitionType: 'slide',
        loopSlides: true,
        backgroundColor: '#1a1a1a',
      });
      
      const config = service.getConfig();
      expect(config.transitionDuration).toBe(800);
      expect(config.transitionType).toBe('slide');
      expect(config.loopSlides).toBe(true);
    });

    it('should validate transition duration', () => {
      expect(() => service.configure({ transitionDuration: -100 }))
        .toThrow(PresentationError);
    });

    it('should validate transition type', () => {
      expect(() => service.configure({ transitionType: 'invalid' as any }))
        .toThrow(PresentationError);
    });

    it('should reset configuration', () => {
      service.configure({ transitionDuration: 1000, loopSlides: true });
      service.resetConfig();
      
      const config = service.getConfig();
      expect(config.transitionDuration).toBe(500);
      expect(config.loopSlides).toBe(false);
    });

    it('should support DICA presets', () => {
      service.applyPreset('dica-commercial');
      const config = service.getConfig();
      
      expect(config.transitionType).toBe('fade');
      expect(config.showProgress).toBe(true);
    });

    it('should support minimal preset', () => {
      service.applyPreset('minimal');
      const config = service.getConfig();
      
      expect(config.showControls).toBe(false);
      expect(config.showProgress).toBe(false);
    });
  });

  // ============================================================================
  // Slide Management Tests
  // ============================================================================
  describe('Slide Management', () => {
    it('should add slides', () => {
      const slide: Slide = {
        id: '1',
        type: 'image',
        content: 'https://example.com/render.jpg',
        title: 'Rendu Inox Brossé',
      };
      
      service.addSlide(slide);
      expect(service.getSlides()).toHaveLength(1);
      expect(service.getSlides()[0].id).toBe('1');
    });

    it('should add multiple slides', () => {
      const slides: Slide[] = [
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
      ];
      
      service.addSlides(slides);
      expect(service.getSlides()).toHaveLength(3);
    });

    it('should remove slide by id', () => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
      ]);
      
      service.removeSlide('1');
      expect(service.getSlides()).toHaveLength(1);
      expect(service.getSlides()[0].id).toBe('2');
    });

    it('should clear all slides', () => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
      ]);
      
      service.clearSlides();
      expect(service.getSlides()).toHaveLength(0);
    });

    it('should reorder slides', () => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
      ]);
      
      service.reorderSlide('3', 0);
      const slides = service.getSlides();
      
      expect(slides[0].id).toBe('3');
      expect(slides[1].id).toBe('1');
    });

    it('should get slide by id', () => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg', title: 'First' },
        { id: '2', type: 'image', content: 'img2.jpg', title: 'Second' },
      ]);
      
      const slide = service.getSlideById('2');
      expect(slide?.title).toBe('Second');
    });

    it('should update slide', () => {
      service.addSlide({ id: '1', type: 'image', content: 'old.jpg' });
      
      service.updateSlide('1', { content: 'new.jpg', title: 'Updated' });
      
      const slide = service.getSlideById('1');
      expect(slide?.content).toBe('new.jpg');
      expect(slide?.title).toBe('Updated');
    });

    it('should validate slide type', () => {
      expect(() => service.addSlide({
        id: '1',
        type: 'invalid' as any,
        content: 'test',
      })).toThrow(PresentationError);
    });

    it('should support different slide types', () => {
      const types: SlideType[] = ['image', 'comparison', 'video', 'text', 'title'];
      
      types.forEach((type, i) => {
        service.addSlide({ id: String(i), type, content: `content-${i}` });
      });
      
      expect(service.getSlides()).toHaveLength(5);
    });
  });

  // ============================================================================
  // Navigation Tests
  // ============================================================================
  describe('Navigation', () => {
    beforeEach(() => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
      ]);
    });

    it('should start at first slide', () => {
      expect(service.getCurrentIndex()).toBe(0);
      expect(service.getCurrentSlide()?.id).toBe('1');
    });

    it('should navigate to next slide', () => {
      service.next();
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should navigate to previous slide', () => {
      service.goTo(2);
      service.previous();
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should not go past last slide without loop', () => {
      service.configure({ loopSlides: false });
      service.goTo(2);
      service.next();
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should loop to first slide when enabled', () => {
      service.configure({ loopSlides: true });
      service.goTo(2);
      service.next();
      expect(service.getCurrentIndex()).toBe(0);
    });

    it('should loop to last slide when going previous from first', () => {
      service.configure({ loopSlides: true });
      service.previous();
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should go to specific slide', () => {
      service.goTo(2);
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should clamp index to valid range', () => {
      service.goTo(100);
      expect(service.getCurrentIndex()).toBe(2);
      
      service.goTo(-5);
      expect(service.getCurrentIndex()).toBe(0);
    });

    it('should go to first slide', () => {
      service.goTo(2);
      service.goToFirst();
      expect(service.getCurrentIndex()).toBe(0);
    });

    it('should go to last slide', () => {
      service.goToLast();
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should report if has next', () => {
      expect(service.hasNext()).toBe(true);
      service.goTo(2);
      expect(service.hasNext()).toBe(false);
    });

    it('should report if has previous', () => {
      expect(service.hasPrevious()).toBe(false);
      service.goTo(1);
      expect(service.hasPrevious()).toBe(true);
    });

    it('should always have next/previous when looping', () => {
      service.configure({ loopSlides: true });
      expect(service.hasNext()).toBe(true);
      expect(service.hasPrevious()).toBe(true);
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================
  describe('State Management', () => {
    beforeEach(() => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
      ]);
    });

    it('should get presentation state', () => {
      const state = service.getState();
      
      expect(state.currentIndex).toBe(0);
      expect(state.totalSlides).toBe(2);
      expect(state.isPlaying).toBe(false);
      expect(state.isFullscreen).toBe(false);
      expect(state.progress).toBe(0);
    });

    it('should calculate progress', () => {
      service.goTo(1);
      const state = service.getState();
      
      expect(state.progress).toBe(50); // 1/2 = 50%
    });

    it('should emit state changes', () => {
      const callback = vi.fn();
      service.onStateChange(callback);
      
      service.next();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ currentIndex: 1 })
      );
    });

    it('should allow unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = service.onStateChange(callback);
      
      service.next();
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      service.next();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Fullscreen Tests
  // ============================================================================
  describe('Fullscreen', () => {
    it('should track fullscreen state', () => {
      expect(service.getState().isFullscreen).toBe(false);
    });

    it('should request fullscreen', () => {
      const element = {
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      };
      
      service.enterFullscreen(element as any);
      expect(element.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen', async () => {
      // Mock exitFullscreen on document
      const originalExitFullscreen = document.exitFullscreen;
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      
      await service.exitFullscreen();
      expect(document.exitFullscreen).toHaveBeenCalled();
      
      // Restore
      document.exitFullscreen = originalExitFullscreen;
    });

    it('should toggle fullscreen', () => {
      const element = {
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      };
      
      service.toggleFullscreen(element as any);
      expect(element.requestFullscreen).toHaveBeenCalled();
    });

    it('should update state on fullscreen change', () => {
      service.setFullscreenState(true);
      expect(service.getState().isFullscreen).toBe(true);
      
      service.setFullscreenState(false);
      expect(service.getState().isFullscreen).toBe(false);
    });
  });

  // ============================================================================
  // Autoplay Tests
  // ============================================================================
  describe('Autoplay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
      ]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start autoplay', () => {
      service.startAutoplay({ interval: 3000 });
      expect(service.getState().isPlaying).toBe(true);
    });

    it('should stop autoplay', () => {
      service.startAutoplay({ interval: 3000 });
      service.stopAutoplay();
      expect(service.getState().isPlaying).toBe(false);
    });

    it('should auto-advance slides', () => {
      service.startAutoplay({ interval: 3000 });
      
      vi.advanceTimersByTime(3000);
      expect(service.getCurrentIndex()).toBe(1);
      
      vi.advanceTimersByTime(3000);
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should pause autoplay', () => {
      service.startAutoplay({ interval: 3000 });
      
      vi.advanceTimersByTime(1500);
      service.pauseAutoplay();
      
      vi.advanceTimersByTime(3000);
      expect(service.getCurrentIndex()).toBe(0);
    });

    it('should resume autoplay', () => {
      service.startAutoplay({ interval: 3000 });
      service.pauseAutoplay();
      service.resumeAutoplay();
      
      vi.advanceTimersByTime(3000);
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should stop at end when not looping', () => {
      service.configure({ loopSlides: false });
      service.startAutoplay({ interval: 1000 });
      
      vi.advanceTimersByTime(5000);
      expect(service.getCurrentIndex()).toBe(2);
      expect(service.getState().isPlaying).toBe(false);
    });

    it('should loop when configured', () => {
      service.configure({ loopSlides: true });
      service.startAutoplay({ interval: 1000 });
      
      vi.advanceTimersByTime(4000);
      expect(service.getCurrentIndex()).toBe(1);
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests
  // ============================================================================
  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
      ]);
    });

    it('should handle ArrowRight', () => {
      service.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() } as any);
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should handle ArrowLeft', () => {
      service.goTo(2);
      service.handleKeyDown({ key: 'ArrowLeft', preventDefault: vi.fn() } as any);
      expect(service.getCurrentIndex()).toBe(1);
    });

    it('should handle Space to toggle play', () => {
      vi.useFakeTimers();
      service.handleKeyDown({ key: ' ', preventDefault: vi.fn() } as any);
      expect(service.getState().isPlaying).toBe(true);
      
      service.handleKeyDown({ key: ' ', preventDefault: vi.fn() } as any);
      expect(service.getState().isPlaying).toBe(false);
      vi.useRealTimers();
    });

    it('should handle Escape to exit', () => {
      const callback = vi.fn();
      service.onExit(callback);
      
      service.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() } as any);
      expect(callback).toHaveBeenCalled();
    });

    it('should handle Home to go to first', () => {
      service.goTo(2);
      service.handleKeyDown({ key: 'Home', preventDefault: vi.fn() } as any);
      expect(service.getCurrentIndex()).toBe(0);
    });

    it('should handle End to go to last', () => {
      service.handleKeyDown({ key: 'End', preventDefault: vi.fn() } as any);
      expect(service.getCurrentIndex()).toBe(2);
    });

    it('should ignore keyboard when disabled', () => {
      service.configure({ enableKeyboard: false });
      service.handleKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() } as any);
      expect(service.getCurrentIndex()).toBe(0);
    });
  });

  // ============================================================================
  // Transition Tests
  // ============================================================================
  describe('Transitions', () => {
    it('should get transition CSS for fade', () => {
      service.configure({ transitionType: 'fade' });
      const css = service.getTransitionCSS();
      
      expect(css).toContain('opacity');
    });

    it('should get transition CSS for slide', () => {
      service.configure({ transitionType: 'slide' });
      const css = service.getTransitionCSS();
      
      expect(css).toContain('transform');
    });

    it('should get transition CSS for zoom', () => {
      service.configure({ transitionType: 'zoom' });
      const css = service.getTransitionCSS();
      
      expect(css).toContain('scale');
    });

    it('should include duration in CSS', () => {
      service.configure({ transitionDuration: 800 });
      const css = service.getTransitionCSS();
      
      expect(css).toContain('800ms');
    });

    it('should get transition class names', () => {
      const classes = service.getTransitionClasses('next');
      
      expect(classes.enter).toBeDefined();
      expect(classes.exit).toBeDefined();
    });
  });

  // ============================================================================
  // Progress Bar Tests
  // ============================================================================
  describe('Progress', () => {
    beforeEach(() => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
        { id: '3', type: 'image', content: 'img3.jpg' },
        { id: '4', type: 'image', content: 'img4.jpg' },
      ]);
    });

    it('should calculate progress percentage', () => {
      expect(service.getProgress()).toBe(0);
      
      service.next();
      expect(service.getProgress()).toBe(25);
      
      service.next();
      expect(service.getProgress()).toBe(50);
      
      service.goToLast();
      expect(service.getProgress()).toBe(75);
    });

    it('should return 0 for empty slides', () => {
      service.clearSlides();
      expect(service.getProgress()).toBe(0);
    });

    it('should return 100 at last slide', () => {
      service.addSlide({ id: '5', type: 'image', content: 'img5.jpg' });
      service.goToLast();
      expect(service.getProgress()).toBe(80);
    });
  });

  // ============================================================================
  // Event Handling Tests
  // ============================================================================
  describe('Events', () => {
    it('should emit slide change event', () => {
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
        { id: '2', type: 'image', content: 'img2.jpg' },
      ]);
      
      const callback = vi.fn();
      service.onSlideChange(callback);
      
      service.next();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ id: '2' }),
        1,
        'next'
      );
    });

    it('should emit exit event', () => {
      const callback = vi.fn();
      service.onExit(callback);
      
      service.exit();
      
      expect(callback).toHaveBeenCalled();
    });

    it('should emit play/pause events', () => {
      vi.useFakeTimers();
      service.addSlides([
        { id: '1', type: 'image', content: 'img1.jpg' },
      ]);
      
      const playCallback = vi.fn();
      const pauseCallback = vi.fn();
      
      service.onPlay(playCallback);
      service.onPause(pauseCallback);
      
      service.startAutoplay({ interval: 1000 });
      expect(playCallback).toHaveBeenCalled();
      
      service.pauseAutoplay();
      expect(pauseCallback).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw PresentationError for invalid config', () => {
      expect(() => service.configure({ transitionDuration: -100 }))
        .toThrow(PresentationError);
    });

    it('should throw for invalid slide type', () => {
      expect(() => service.addSlide({ id: '1', type: 'invalid' as any, content: '' }))
        .toThrow(PresentationError);
    });

    it('should emit error events', () => {
      const callback = vi.fn();
      service.onError(callback);
      
      service.emitError(new PresentationError('Test', 'TEST_ERROR'));
      
      expect(callback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should complete full presentation workflow', () => {
      // 1. Configure
      service.configure({
        transitionType: 'fade',
        transitionDuration: 500,
        loopSlides: true,
      });
      
      // 2. Add slides
      service.addSlides([
        { id: '1', type: 'title', content: 'Présentation DICA', title: 'Introduction' },
        { id: '2', type: 'image', content: 'render1.jpg', title: 'Rendu 1' },
        { id: '3', type: 'image', content: 'render2.jpg', title: 'Rendu 2' },
        { id: '4', type: 'comparison', content: 'compare.jpg', title: 'Comparaison' },
      ]);
      
      // 3. Navigate
      expect(service.getCurrentSlide()?.title).toBe('Introduction');
      
      service.next();
      expect(service.getCurrentSlide()?.title).toBe('Rendu 1');
      
      // 4. Check state
      const state = service.getState();
      expect(state.totalSlides).toBe(4);
      expect(state.progress).toBe(25);
      
      // 5. Get transition CSS
      const css = service.getTransitionCSS();
      expect(css).toContain('500ms');
    });
  });
});

