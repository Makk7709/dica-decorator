/**
 * @fileoverview PresentationViewer - Mode présentation fullscreen
 * Slideshow interactif avec transitions et contrôles
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {Play, Pause, ChevronLeft, ChevronRight, X, Maximize, Minimize, SkipBack, SkipForward} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {PresentationService, Slide, PresentationState, SlideTransition} from '@/services/presentation.service';
import { BeforeAfterSlider } from '@/components/ui/before-after-slider';
import { SafeImage } from '@/components/ui/safe-image';

// ============================================================================
// Types
// ============================================================================

export interface PresentationViewerProps {
  /** Slides à afficher */
  slides: Slide[];
  /** Démarrer automatiquement */
  autoStart?: boolean;
  /** Intervalle autoplay (ms) */
  autoplayInterval?: number;
  /** Type de transition */
  transition?: SlideTransition;
  /** Durée de transition (ms) */
  transitionDuration?: number;
  /** Boucler les slides */
  loop?: boolean;
  /** Afficher les contrôles */
  showControls?: boolean;
  /** Afficher la barre de progression */
  showProgress?: boolean;
  /** Afficher les thumbnails */
  showThumbnails?: boolean;
  /** Callback à la fermeture */
  onClose?: () => void;
  /** Callback au changement de slide */
  onSlideChange?: (index: number, slide: Slide) => void;
  /** Classe CSS */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

const SlideRenderer: React.FC<{
  slide: Slide;
  isActive: boolean;
  transition: string;
}> = ({ slide, isActive, transition }) => {
  const baseClasses = cn(
    'absolute inset-0 flex items-center justify-center',
    'transition-all',
    transition,
    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
  );

  switch (slide.type) {
    case 'image':
      return (
        <div className={baseClasses}>
          <SafeImage
            src={slide.content}
            alt={slide.title || 'Slide'}
            className="max-w-full max-h-full object-contain"
          />
          {slide.title && (
            <div className="absolute bottom-20 left-0 right-0 text-center">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                {slide.title}
              </h2>
              {slide.decorName && (
                <p className="text-lg text-white/80 mt-1">
                  {slide.decorName}
                  {slide.decorCode && ` (${slide.decorCode})`}
                </p>
              )}
            </div>
          )}
        </div>
      );

    case 'comparison':
      return (
        <div className={cn(baseClasses, 'p-8')}>
          <div className="w-full max-w-4xl">
            <BeforeAfterSlider
              beforeImage={slide.metadata?.beforeImage || slide.content}
              afterImage={slide.metadata?.afterImage || slide.content}
              beforeLabel="Avant"
              afterLabel="Après"
              aspectRatio="16/9"
              metadata={{
                decorName: slide.decorName,
                decorCode: slide.decorCode,
              }}
            />
            {slide.title && (
              <h2 className="text-xl font-bold text-white text-center mt-4">
                {slide.title}
              </h2>
            )}
          </div>
        </div>
      );

    case 'title':
      return (
        <div className={cn(baseClasses, 'flex-col text-center p-8')}>
          <h1 className="text-5xl font-bold text-white mb-4">
            {slide.title || slide.content}
          </h1>
          {slide.subtitle && (
            <p className="text-2xl text-white/80">
              {slide.subtitle}
            </p>
          )}
        </div>
      );

    case 'text':
      return (
        <div className={cn(baseClasses, 'flex-col text-center p-12')}>
          {slide.title && (
            <h2 className="text-3xl font-bold text-white mb-6">
              {slide.title}
            </h2>
          )}
          <p className="text-xl text-white/90 max-w-3xl leading-relaxed">
            {slide.content}
          </p>
        </div>
      );

    case 'video':
      return (
        <div className={baseClasses}>
          <video
            src={slide.content}
            controls={isActive}
            autoPlay={isActive}
            muted
            loop
            className="max-w-full max-h-full"
          />
        </div>
      );

    default:
      return null;
  }
};

const ProgressBar: React.FC<{
  current: number;
  total: number;
  autoplayProgress?: number;
}> = ({ current, total, autoplayProgress = 0 }) => (
  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
    {/* Slides progress */}
    <div
      className="h-full bg-white/40 transition-all duration-300"
      style={{ width: `${((current + 1) / total) * 100}%` }}
    />
    {/* Autoplay progress */}
    {autoplayProgress > 0 && (
      <div
        className="absolute top-0 h-full bg-primary transition-all"
        style={{ 
          width: `${(autoplayProgress / 100) * (100 / total)}%`,
          left: `${(current / total) * 100}%`,
        }}
      />
    )}
  </div>
);

const ThumbnailStrip: React.FC<{
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
}> = ({ slides, currentIndex, onSelect }) => (
  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-lg bg-black/50 backdrop-blur-sm">
    {slides.map((slide, index) => (
      <button
        key={slide.id}
        onClick={() => onSelect(index)}
        className={cn(
          'w-16 h-12 rounded overflow-hidden border-2 transition-all',
          index === currentIndex
            ? 'border-primary scale-110'
            : 'border-transparent opacity-60 hover:opacity-100'
        )}
      >
        {slide.type === 'image' || slide.type === 'comparison' ? (
          <SafeImage
            src={slide.content}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/20 flex items-center justify-center">
            <span className="text-xs text-white">{index + 1}</span>
          </div>
        )}
      </button>
    ))}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  slides,
  autoStart = false,
  autoplayInterval = 5000,
  transition = 'fade',
  transitionDuration = 500,
  loop = true,
  showControls = true,
  showProgress = true,
  showThumbnails = false,
  onClose,
  onSlideChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [service] = useState(() => new PresentationService());
  const [state, setState] = useState<PresentationState>({
    currentIndex: 0,
    totalSlides: slides.length,
    isPlaying: autoStart,
    isFullscreen: false,
    isPaused: false,
    progress: 0,
  });
  const [showUI, setShowUI] = useState(true);
  const [autoplayProgress, setAutoplayProgress] = useState(0);
  const hideUITimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize service
  useEffect(() => {
    service.configure({
      transitionType: transition,
      transitionDuration,
      loopSlides: loop,
      enableKeyboard: true,
    });
    
    service.clearSlides();
    service.addSlides(slides);

    const unsubState = service.onStateChange(setState);
    const unsubSlide = service.onSlideChange((slide, index) => {
      onSlideChange?.(index, slide);
      setAutoplayProgress(0);
    });
    const unsubExit = service.onExit(() => onClose?.());

    if (autoStart) {
      service.startAutoplay({ interval: autoplayInterval });
    }

    return () => {
      unsubState();
      unsubSlide();
      unsubExit();
      service.stopAutoplay();
    };
  }, [slides, transition, transitionDuration, loop, autoStart, autoplayInterval, service, onSlideChange, onClose]);

  // Autoplay progress animation
  useEffect(() => {
    if (!state.isPlaying || state.isPaused) {
      setAutoplayProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setAutoplayProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / (autoplayInterval / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.isPaused, autoplayInterval]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      service.handleKeyDown(e);
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [service]);

  // Hide UI on inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowUI(true);
      if (hideUITimeoutRef.current) {
        clearTimeout(hideUITimeoutRef.current);
      }
      hideUITimeoutRef.current = setTimeout(() => {
        if (state.isPlaying && !state.isPaused) {
          setShowUI(false);
        }
      }, 3000);
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      if (hideUITimeoutRef.current) clearTimeout(hideUITimeoutRef.current);
    };
  }, [state.isPlaying, state.isPaused]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      service.setFullscreenState(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [service]);

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      service.toggleFullscreen(containerRef.current);
    }
  }, [service]);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      service.stopAutoplay();
    } else {
      service.startAutoplay({ interval: autoplayInterval });
    }
  }, [state.isPlaying, service, autoplayInterval]);

  const transitionCSS = service.getTransitionCSS();
  const currentSlide = slides[state.currentIndex];

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Présentation interactive"
      className={cn(
        'relative w-full h-full bg-black overflow-hidden',
        'select-none',
        className
      )}
      onClick={() => setShowUI(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowUI(true);
        }
      }}
    >
      {/* Slides */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <SlideRenderer
            key={slide.id}
            slide={slide}
            isActive={index === state.currentIndex}
            transition={transitionCSS}
          />
        ))}
      </div>

      {/* UI Overlay */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-opacity duration-300',
          showUI ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="font-semibold">{currentSlide?.title || 'Présentation'}</h3>
              <p className="text-sm text-white/70">
                {state.currentIndex + 1} / {state.totalSlides}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {state.isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {showControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => service.previous()}
              disabled={!service.hasPrevious()}
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto',
                'h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60',
                !service.hasPrevious() && 'opacity-30'
              )}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => service.next()}
              disabled={!service.hasNext()}
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto',
                'h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60',
                !service.hasNext() && 'opacity-30'
              )}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Bottom Controls */}
        {showControls && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full bg-black/50 backdrop-blur-sm pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => service.goToFirst()}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              {state.isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => service.goToLast()}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Thumbnails */}
        {showThumbnails && (
          <ThumbnailStrip
            slides={slides}
            currentIndex={state.currentIndex}
            onSelect={(index) => service.goTo(index)}
          />
        )}

        {/* Progress Bar */}
        {showProgress && (
          <ProgressBar
            current={state.currentIndex}
            total={state.totalSlides}
            autoplayProgress={state.isPlaying ? autoplayProgress : 0}
          />
        )}
      </div>
    </div>
  );
};

export default PresentationViewer;

