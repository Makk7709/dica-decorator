/**
 * @fileoverview ImageComparisonService - Service de comparaison avant/après
 * Gère la logique du slider de comparaison d'images
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SliderOrientation = 'horizontal' | 'vertical';
export type EasingFunction = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type PresetName = 'dica-default' | 'dica-dark' | 'minimal';

export interface ComparisonConfig {
  orientation: SliderOrientation;
  initialPosition: number;
  showLabels: boolean;
  labelBefore: string;
  labelAfter: string;
  sliderColor: string;
  sliderWidth: number;
  handleSize: number;
  animationDuration: number;
  enableKeyboard: boolean;
  enableTouch: boolean;
}

export interface ComparisonState {
  position: number;
  isDragging: boolean;
  isAnimating: boolean;
  isLoaded: boolean;
  isFocused: boolean;
}

export interface SliderPosition {
  x?: number;
  y?: number;
  percentage: number;
}

export interface ImagePair {
  before: string;
  after: string;
  metadata?: {
    decorName?: string;
    decorCode?: string;
    projectId?: string;
    [key: string]: unknown;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface ClipPaths {
  before: string;
  after: string;
}

export interface HandlePosition {
  left: number;
  top: number;
}

export interface ExportOptions {
  format?: ExportFormat;
  quality?: number;
  width?: number;
  height?: number;
  includeLabels?: boolean;
  includeSlider?: boolean;
}

export interface ComparisonExport {
  dataUrl: string;
  format: ExportFormat;
  width: number;
  height: number;
}

export interface AnimationOptions {
  onProgress?: (progress: number) => void;
  easing?: EasingFunction;
}

export interface LoadResult {
  success: boolean;
  error?: string;
  beforeImage?: HTMLImageElement;
  afterImage?: HTMLImageElement;
}

export interface AriaAttributes {
  role: string;
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-valuenow': number;
  'aria-label': string;
  'aria-grabbed'?: boolean;
}

export interface FocusAttributes {
  tabIndex: number;
  onFocus: () => void;
  onBlur: () => void;
}

// ============================================================================
// Error Class
// ============================================================================

export class ComparisonError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ComparisonError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ComparisonConfig = {
  orientation: 'horizontal',
  initialPosition: 50,
  showLabels: true,
  labelBefore: 'Avant',
  labelAfter: 'Après',
  sliderColor: '#E94E5D',
  sliderWidth: 4,
  handleSize: 40,
  animationDuration: 300,
  enableKeyboard: true,
  enableTouch: true,
};

const PRESETS: Record<PresetName, Partial<ComparisonConfig>> = {
  'dica-default': {
    sliderColor: '#E94E5D',
    labelBefore: 'Photo originale',
    labelAfter: 'Avec décor DICA',
    handleSize: 40,
  },
  'dica-dark': {
    sliderColor: '#FFFFFF',
    handleSize: 44,
    labelBefore: 'Photo originale',
    labelAfter: 'Avec décor DICA',
  },
  'minimal': {
    showLabels: false,
    handleSize: 32,
    sliderWidth: 2,
  },
};

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

// ============================================================================
// Service Implementation
// ============================================================================

export class ImageComparisonService {
  private config: ComparisonConfig;
  private readonly state: ComparisonState;
  private readonly stateListeners: Array<(state: ComparisonState) => void> = [];
  private readonly errorListeners: Array<(error: ComparisonError) => void> = [];
  private animationFrame: number | null = null;
  private exportHandler: ((pair: ImagePair, options: ExportOptions) => Promise<ComparisonExport>) | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastThrottleTime = 0;
  private readonly THROTTLE_MS = 16; // ~60fps

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.state = {
      position: this.config.initialPosition,
      isDragging: false,
      isAnimating: false,
      isLoaded: false,
      isFocused: false,
    };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): ComparisonConfig {
    return { ...this.config };
  }

  configure(options: Partial<ComparisonConfig>): void {
    this.validateConfig(options);
    this.config = { ...this.config, ...options };
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.state.position = this.config.initialPosition;
  }

  applyPreset(presetName: PresetName): void {
    const preset = PRESETS[presetName];
    if (preset) {
      this.configure(preset);
    }
  }

  private validateConfig(options: Partial<ComparisonConfig>): void {
    if (options.initialPosition !== undefined) {
      if (options.initialPosition < 0 || options.initialPosition > 100) {
        throw new ComparisonError(
          'initialPosition must be between 0 and 100',
          'INVALID_CONFIG'
        );
      }
    }
    if (options.sliderWidth !== undefined && options.sliderWidth <= 0) {
      throw new ComparisonError(
        'sliderWidth must be greater than 0',
        'INVALID_CONFIG'
      );
    }
    if (options.handleSize !== undefined && options.handleSize < 0) {
      throw new ComparisonError(
        'handleSize must be non-negative',
        'INVALID_CONFIG'
      );
    }
  }

  // --------------------------------------------------------------------------
  // Image Validation Methods
  // --------------------------------------------------------------------------

  validateImagePair(pair: ImagePair): ValidationResult {
    const errors: string[] = [];

    if (!pair.before || pair.before.trim() === '') {
      errors.push('before_image_required');
    } else if (!this.isValidImageUrl(pair.before)) {
      errors.push('invalid_before_url');
    } else if (!this.isSupportedFormat(pair.before)) {
      errors.push('unsupported_format');
    }

    if (!pair.after || pair.after.trim() === '') {
      errors.push('after_image_required');
    } else if (!this.isValidImageUrl(pair.after)) {
      errors.push('invalid_after_url');
    } else if (!this.isSupportedFormat(pair.after)) {
      errors.push('unsupported_format');
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata: pair.metadata,
    };
  }

  private isValidImageUrl(url: string): boolean {
    if (url.startsWith('data:image/')) {
      return true;
    }
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isSupportedFormat(url: string): boolean {
    if (url.startsWith('data:image/')) {
      return true;
    }
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    return extension ? SUPPORTED_FORMATS.includes(extension) : false;
  }

  // --------------------------------------------------------------------------
  // Position Calculation Methods
  // --------------------------------------------------------------------------

  calculatePosition(
    percentage: number,
    containerSize: number,
    orientation: SliderOrientation
  ): SliderPosition {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const pixelPosition = (clampedPercentage / 100) * containerSize;

    if (orientation === 'horizontal') {
      return { x: pixelPosition, percentage: clampedPercentage };
    }
    return { y: pixelPosition, percentage: clampedPercentage };
  }

  pixelToPercentage(pixel: number, containerSize: number): number {
    if (containerSize === 0) return 0;
    return Math.max(0, Math.min(100, (pixel / containerSize) * 100));
  }

  calculateClipPaths(percentage: number, orientation: SliderOrientation): ClipPaths {
    const remaining = 100 - percentage;
    
    if (orientation === 'horizontal') {
      return {
        before: `inset(0 ${remaining}% 0 0)`,
        after: `inset(0 0 0 ${percentage}%)`,
      };
    }
    return {
      before: `inset(0 0 ${remaining}% 0)`,
      after: `inset(${percentage}% 0 0 0)`,
    };
  }

  calculateHandlePosition(
    percentage: number,
    containerWidth: number,
    containerHeight: number,
    orientation: SliderOrientation
  ): HandlePosition {
    if (orientation === 'horizontal') {
      return {
        left: (percentage / 100) * containerWidth,
        top: containerHeight / 2,
      };
    }
    return {
      left: containerWidth / 2,
      top: (percentage / 100) * containerHeight,
    };
  }

  // --------------------------------------------------------------------------
  // State Management Methods
  // --------------------------------------------------------------------------

  getState(): ComparisonState {
    return { ...this.state };
  }

  setPosition(position: number, options?: { throttle?: boolean }): void {
    const clampedPosition = Math.max(0, Math.min(100, position));
    
    if (options?.throttle) {
      const now = Date.now();
      if (now - this.lastThrottleTime < this.THROTTLE_MS) {
        return;
      }
      this.lastThrottleTime = now;
    }
    
    this.state.position = clampedPosition;
    this.notifyStateChange();
  }

  startDrag(): void {
    this.state.isDragging = true;
    this.notifyStateChange();
  }

  endDrag(): void {
    this.state.isDragging = false;
    this.notifyStateChange();
  }

  setLoaded(loaded: boolean): void {
    this.state.isLoaded = loaded;
    this.notifyStateChange();
  }

  onStateChange(callback: (state: ComparisonState) => void): () => void {
    this.stateListeners.push(callback);
    return () => {
      const index = this.stateListeners.indexOf(callback);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  private notifyStateChange(): void {
    const stateCopy = { ...this.state };
    this.stateListeners.forEach(listener => listener(stateCopy));
  }

  // --------------------------------------------------------------------------
  // Animation Methods
  // --------------------------------------------------------------------------

  async animateTo(
    targetPosition: number,
    options?: AnimationOptions
  ): Promise<void> {
    // Cancel any ongoing animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    const startPosition = this.state.position;
    const distance = targetPosition - startPosition;
    const duration = this.config.animationDuration;
    const startTime = performance.now();
    const easing = options?.easing || 'easeInOut';

    this.state.isAnimating = true;
    this.notifyStateChange();

    return new Promise(resolve => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = this.applyEasing(progress, easing);
        
        this.state.position = startPosition + distance * easedProgress;
        this.notifyStateChange();

        if (options?.onProgress) {
          options.onProgress(progress);
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.state.position = targetPosition;
          this.state.isAnimating = false;
          this.notifyStateChange();
          this.animationFrame = null;
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  async resetPosition(): Promise<void> {
    return this.animateTo(this.config.initialPosition);
  }

  private applyEasing(t: number, easing: EasingFunction): number {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return t * (2 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  smoothSetPosition(position: number): void {
    requestAnimationFrame(() => {
      this.setPosition(position);
    });
  }

  // --------------------------------------------------------------------------
  // Event Handling Methods
  // --------------------------------------------------------------------------

  handleMouseMove(
    event: MouseEvent,
    containerRect: { left: number; top: number; width: number; height: number }
  ): void {
    if (!this.state.isDragging) return;

    event.preventDefault();
    
    const position = this.config.orientation === 'horizontal'
      ? this.pixelToPercentage(event.clientX - containerRect.left, containerRect.width)
      : this.pixelToPercentage(event.clientY - containerRect.top, containerRect.height);
    
    this.setPosition(position);
  }

  handleTouchMove(
    event: TouchEvent,
    containerRect: { left: number; top: number; width: number; height: number }
  ): void {
    if (!this.config.enableTouch || !this.state.isDragging) return;
    if (!event.touches[0]) return;

    event.preventDefault();
    
    const touch = event.touches[0];
    const position = this.config.orientation === 'horizontal'
      ? this.pixelToPercentage(touch.clientX - containerRect.left, containerRect.width)
      : this.pixelToPercentage(touch.clientY - containerRect.top, containerRect.height);
    
    this.setPosition(position);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.enableKeyboard) return;

    const step = 1;
    const bigStep = 10;
    const { orientation } = this.config;
    const isHorizontal = orientation === 'horizontal';

    let newPosition = this.state.position;

    switch (event.key) {
      case 'ArrowRight':
        if (isHorizontal) {
          newPosition += step;
          event.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          newPosition -= step;
          event.preventDefault();
        }
        break;
      case 'ArrowDown':
        if (!isHorizontal) {
          newPosition += step;
          event.preventDefault();
        }
        break;
      case 'ArrowUp':
        if (!isHorizontal) {
          newPosition -= step;
          event.preventDefault();
        }
        break;
      case 'PageDown':
        newPosition += bigStep;
        event.preventDefault();
        break;
      case 'PageUp':
        newPosition -= bigStep;
        event.preventDefault();
        break;
      case 'Home':
        newPosition = 0;
        event.preventDefault();
        break;
      case 'End':
        newPosition = 100;
        event.preventDefault();
        break;
      default:
        return;
    }

    this.setPosition(newPosition);
  }

  // --------------------------------------------------------------------------
  // Export Methods
  // --------------------------------------------------------------------------

  async exportComparison(
    pair: ImagePair,
    options: ExportOptions
  ): Promise<ComparisonExport> {
    const validation = this.validateImagePair(pair);
    if (!validation.valid) {
      throw new ComparisonError(
        `Invalid image pair: ${validation.errors.join(', ')}`,
        'INVALID_IMAGES'
      );
    }

    const format = options.format || 'png';
    const quality = options.quality || 0.9;
    const width = options.width || 800;
    const height = options.height || 600;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ComparisonError('Could not create canvas context', 'CANVAS_ERROR');
    }

    // Load images
    const loadResult = await this.loadImages(pair);
    if (!loadResult.success || !loadResult.beforeImage || !loadResult.afterImage) {
      throw new ComparisonError(
        loadResult.error || 'Failed to load images',
        'IMAGE_LOAD_ERROR'
      );
    }

    // Draw comparison
    const position = this.state.position;
    const splitX = (position / 100) * width;

    // Draw before image (left side)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    ctx.drawImage(loadResult.beforeImage, 0, 0, width, height);
    ctx.restore();

    // Draw after image (right side)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, width - splitX, height);
    ctx.clip();
    ctx.drawImage(loadResult.afterImage, 0, 0, width, height);
    ctx.restore();

    // Draw slider line if requested
    if (options.includeSlider) {
      ctx.fillRect(splitX - 2, 0, 4, height);
    }

    // Draw labels if requested
    if (options.includeLabels) {
      ctx.fillText(this.config.labelBefore, 20, 30);
      ctx.fillText(this.config.labelAfter, width - 100, 30);
    }

    const mimeType = `image/${format}`;
    const dataUrl = canvas.toDataURL(mimeType, quality);

    return {
      dataUrl,
      format,
      width,
      height,
    };
  }

  generateExportFilename(pair: ImagePair): string {
    const date = new Date().toISOString().split('T')[0];
    const decorCode = pair.metadata?.decorCode || 'unknown';
    return `dica-comparison-${decorCode}-${date}`;
  }

  async loadImages(pair: ImagePair): Promise<LoadResult> {
    try {
      const [beforeImage, afterImage] = await Promise.all([
        this.loadImage(pair.before),
        this.loadImage(pair.after),
      ]);

      return {
        success: true,
        beforeImage,
        afterImage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load images',
      };
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  setExportHandler(
    handler: (pair: ImagePair, options: ExportOptions) => Promise<ComparisonExport>
  ): void {
    this.exportHandler = handler;
  }

  debouncedExport(pair: ImagePair, options: ExportOptions): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (this.exportHandler) {
        await this.exportHandler(pair, options);
      } else {
        await this.exportComparison(pair, options);
      }
    }, 300);
  }

  // --------------------------------------------------------------------------
  // Accessibility Methods
  // --------------------------------------------------------------------------

  getAriaAttributes(): AriaAttributes {
    const attrs: AriaAttributes = {
      role: 'slider',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': this.state.position,
      'aria-label': `Comparateur d'images: ${this.config.labelBefore} / ${this.config.labelAfter}`,
    };

    if (this.state.isDragging) {
      attrs['aria-grabbed'] = true;
    }

    return attrs;
  }

  getFocusAttributes(): FocusAttributes {
    return {
      tabIndex: 0,
      onFocus: () => {
        this.state.isFocused = true;
        this.notifyStateChange();
      },
      onBlur: () => {
        this.state.isFocused = false;
        this.notifyStateChange();
      },
    };
  }

  // --------------------------------------------------------------------------
  // Error Handling Methods
  // --------------------------------------------------------------------------

  onError(callback: (error: ComparisonError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  emitError(error: ComparisonError): void {
    this.errorListeners.forEach(listener => listener(error));
  }
}

