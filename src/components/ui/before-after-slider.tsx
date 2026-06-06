/**
 * @fileoverview BeforeAfterSlider - Composant de comparaison avant/après
 * Slider interactif pour comparer photo originale et rendu DICA
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ImageComparisonService,
  ComparisonConfig,
  ImagePair,
} from '@/services/image-comparison.service';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSignedUrl } from '@/hooks/use-signed-url';

// ============================================================================
// Types
// ============================================================================

export interface BeforeAfterSliderProps {
  /** Image avant (photo originale) */
  beforeImage: string;
  /** Image après (rendu DICA) */
  afterImage: string;
  /** Label pour l'image avant */
  beforeLabel?: string;
  /** Label pour l'image après */
  afterLabel?: string;
  /** Position initiale du slider (0-100) */
  initialPosition?: number;
  /** Orientation du slider */
  orientation?: 'horizontal' | 'vertical';
  /** Afficher les labels */
  showLabels?: boolean;
  /** Couleur du slider */
  sliderColor?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Callback quand la position change */
  onPositionChange?: (position: number) => void;
  /** Métadonnées du décor */
  metadata?: {
    decorName?: string;
    decorCode?: string;
  };
  /** Aspect ratio du conteneur */
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
}

// ============================================================================
// Component
// ============================================================================

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Photo originale',
  afterLabel = 'Avec décor DICA',
  initialPosition = 50,
  orientation = 'horizontal',
  showLabels = true,
  sliderColor = '#E94E5D',
  className,
  onPositionChange,
  metadata,
  aspectRatio = '4/3',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [service] = useState(() => new ImageComparisonService());
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState({ before: false, after: false });
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  // Résolution automatique des URLs Supabase Storage privées en URLs signées
  const { url: signedBefore } = useSignedUrl(beforeImage);
  const { url: signedAfter } = useSignedUrl(afterImage);

  // Configure service
  useEffect(() => {
    service.configure({
      orientation,
      initialPosition,
      showLabels,
      labelBefore: beforeLabel,
      labelAfter: afterLabel,
      sliderColor,
    });
  }, [service, orientation, initialPosition, showLabels, beforeLabel, afterLabel, sliderColor]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = service.onStateChange((state) => {
      setPosition(state.position);
      setIsDragging(state.isDragging);
      onPositionChange?.(state.position);
    });
    return unsubscribe;
  }, [service, onPositionChange]);

  // Handle mouse/touch events
  const handleInteractionStart = useCallback(() => {
    service.startDrag();
  }, [service]);

  const handleInteractionEnd = useCallback(() => {
    service.endDrag();
  }, [service]);

  const handleInteractionMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    if (orientation === 'horizontal') {
      const newPosition = service.pixelToPercentage(
        clientX - containerRect.left,
        containerRect.width
      );
      service.setPosition(newPosition);
    } else {
      const newPosition = service.pixelToPercentage(
        clientY - containerRect.top,
        containerRect.height
      );
      service.setPosition(newPosition);
    }
  }, [service, orientation]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleInteractionStart();
    handleInteractionMove(e.clientX, e.clientY);
  }, [handleInteractionStart, handleInteractionMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleInteractionMove(e.clientX, e.clientY);
  }, [isDragging, handleInteractionMove]);

  const handleMouseUp = useCallback(() => {
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleInteractionStart();
    if (e.touches[0]) {
      handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleInteractionStart, handleInteractionMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [isDragging, handleInteractionMove]);

  // Keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    service.handleKeyDown(e.nativeEvent);
  }, [service]);

  // Add/remove global listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      globalThis.addEventListener('touchmove', handleTouchMove);
      globalThis.addEventListener('touchend', handleInteractionEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleInteractionEnd]);

  // Image load handlers
  const handleBeforeLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (aspectRatio === 'auto' && !naturalAspect) {
      setNaturalAspect(img.naturalWidth / img.naturalHeight);
    }
    setIsLoaded(prev => ({ ...prev, before: true }));
  };
  const handleAfterLoad = () => setIsLoaded(prev => ({ ...prev, after: true }));

  // Calculate clip paths
  const clipPaths = service.calculateClipPaths(position, orientation);

  // Aria attributes
  const ariaProps = service.getAriaAttributes();

  // Aspect ratio class
  const aspectRatioStyle = aspectRatio === 'auto' && naturalAspect
    ? { aspectRatio: `${naturalAspect}` }
    : undefined;

  const aspectRatioClass = aspectRatio === 'auto'
    ? ''
    : {
        'square': 'aspect-square',
        '4/3': 'aspect-[4/3]',
        '16/9': 'aspect-video',
      }[aspectRatio];

  const bothLoaded = isLoaded.before && isLoaded.after;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-xl select-none cursor-col-resize',
        'bg-muted',
        aspectRatioClass,
        isDragging && 'cursor-grabbing',
        className
      )}
      style={aspectRatioStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      {...ariaProps}
    >
      {/* Loading skeleton */}
      {!bothLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <span className="text-muted-foreground text-sm">Chargement...</span>
        </div>
      )}

      {/* Before Image (Photo originale) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: clipPaths.before }}
      >
        <img
          src={signedBefore}
          alt={beforeLabel}
          className="w-full h-full object-contain"
          onLoad={handleBeforeLoad}
          draggable={false}
        />
      </div>

      {/* After Image (Rendu DICA) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: clipPaths.after }}
      >
        <img
          src={signedAfter}
          alt={afterLabel}
          className="w-full h-full object-contain"
          onLoad={handleAfterLoad}
          draggable={false}
        />
      </div>

      {/* Slider Line */}
      {bothLoaded && (
        <div
          className="absolute z-10 transition-opacity"
          style={{
            ...(orientation === 'horizontal'
              ? {
                  left: `${position}%`,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  transform: 'translateX(-50%)',
                }
              : {
                  top: `${position}%`,
                  left: 0,
                  right: 0,
                  height: '4px',
                  transform: 'translateY(-50%)',
                }),
            backgroundColor: sliderColor,
            boxShadow: '0 0 10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Slider Handle */}
          <div
            className={cn(
              'absolute flex items-center justify-center rounded-full',
              'bg-white shadow-lg border-2 transition-transform',
              isDragging && 'scale-110'
            )}
            style={{
              borderColor: sliderColor,
              width: '44px',
              height: '44px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex items-center gap-0.5" style={{ color: sliderColor }}>
              <ChevronLeft className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Labels */}
      {showLabels && bothLoaded && (
        <>
          {/* Before Label */}
          <div
            className={cn(
              'absolute z-20 px-3 py-1.5 rounded-full',
              'bg-black/60 text-white text-xs font-medium',
              'backdrop-blur-sm transition-opacity',
              position < 15 && 'opacity-0'
            )}
            style={{
              left: '12px',
              top: '12px',
            }}
          >
            {beforeLabel}
          </div>

          {/* After Label */}
          <div
            className={cn(
              'absolute z-20 px-3 py-1.5 rounded-full',
              'bg-black/60 text-white text-xs font-medium',
              'backdrop-blur-sm transition-opacity',
              position > 85 && 'opacity-0'
            )}
            style={{
              ...(orientation === 'horizontal'
                ? { right: '12px', top: '12px' }
                : { right: '12px', bottom: '12px' }),
            }}
          >
            {afterLabel}
          </div>
        </>
      )}

      {/* Metadata Badge (Décor reference) */}
      {metadata?.decorCode && bothLoaded && (
        <div
          className={cn(
            'absolute z-20 bottom-3 right-3',
            'px-3 py-1.5 rounded-lg',
            'bg-white/90 text-foreground text-xs font-medium',
            'shadow-md backdrop-blur-sm'
          )}
        >
          <span className="text-muted-foreground">Décor:</span>{' '}
          <span className="font-semibold">{metadata.decorName || metadata.decorCode}</span>
          {metadata.decorCode && (
            <span className="text-muted-foreground ml-1">({metadata.decorCode})</span>
          )}
        </div>
      )}

      {/* Disclaimer non contractuel */}
      {bothLoaded && (
        <div
          className={cn(
            'absolute z-20 bottom-3 left-3',
            'px-2 py-1 rounded',
            'bg-black/40 text-white/80 text-[10px]',
            'backdrop-blur-sm'
          )}
        >
          Image non contractuelle
        </div>
      )}

      {/* Instructions overlay (on hover, first time) */}
      <div
        className={cn(
          'absolute inset-0 z-30 flex items-center justify-center',
          'bg-black/30 text-white text-center transition-opacity duration-300',
          'pointer-events-none',
          (isDragging || !bothLoaded) && 'opacity-0',
          'group-hover:opacity-0'
        )}
        style={{ opacity: bothLoaded ? 0.8 : 0 }}
        onAnimationEnd={(e) => e.currentTarget.style.opacity = '0'}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm animate-pulse">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Glissez pour comparer</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default BeforeAfterSlider;

