/**
 * @fileoverview PresentationService - Mode présentation fullscreen
 * Slideshow interactif pour présentations commerciales DICA
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SlideType = 'image' | 'comparison' | 'video' | 'text' | 'title';
export type SlideTransition = 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
export type NavigationDirection = 'next' | 'previous';

export interface Slide {
  id: string;
  type: SlideType;
  content: string;
  title?: string;
  subtitle?: string;
  decorName?: string;
  decorCode?: string;
  metadata?: Record<string, any>;
}

export interface PresentationConfig {
  transitionDuration: number;
  transitionType: SlideTransition;
  enableKeyboard: boolean;
  enableSwipe: boolean;
  showControls: boolean;
  showProgress: boolean;
  loopSlides: boolean;
  backgroundColor: string;
}

export interface PresentationState {
  currentIndex: number;
  totalSlides: number;
  isPlaying: boolean;
  isFullscreen: boolean;
  isPaused: boolean;
  progress: number;
}

export interface AutoplayConfig {
  interval: number;
  pauseOnHover?: boolean;
}

export interface TransitionClasses {
  enter: string;
  exit: string;
}

// ============================================================================
// Error Class
// ============================================================================

export class PresentationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PresentationError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PresentationConfig = {
  transitionDuration: 500,
  transitionType: 'fade',
  enableKeyboard: true,
  enableSwipe: true,
  showControls: true,
  showProgress: true,
  loopSlides: false,
  backgroundColor: '#000000',
};

const PRESETS: Record<string, Partial<PresentationConfig>> = {
  'dica-commercial': {
    transitionType: 'fade',
    showProgress: true,
    showControls: true,
  },
  'minimal': {
    showControls: false,
    showProgress: false,
    transitionType: 'fade',
  },
};

const VALID_TRANSITIONS: SlideTransition[] = ['fade', 'slide', 'zoom', 'flip', 'none'];
const VALID_SLIDE_TYPES: SlideType[] = ['image', 'comparison', 'video', 'text', 'title'];

// ============================================================================
// Service Implementation
// ============================================================================

export class PresentationService {
  private config: PresentationConfig;
  private slides: Slide[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private isFullscreen = false;
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private autoplayConfig: AutoplayConfig | null = null;
  
  private readonly stateListeners: Array<(state: PresentationState) => void> = [];
  private readonly slideChangeListeners: Array<(slide: Slide, index: number, direction: NavigationDirection) => void> = [];
  private readonly exitListeners: Array<() => void> = [];
  private readonly playListeners: Array<() => void> = [];
  private readonly pauseListeners: Array<() => void> = [];
  private readonly errorListeners: Array<(error: PresentationError) => void> = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): PresentationConfig {
    return { ...this.config };
  }

  configure(options: Partial<PresentationConfig>): void {
    if (options.transitionDuration !== undefined && options.transitionDuration < 0) {
      throw new PresentationError('Transition duration must be non-negative', 'INVALID_CONFIG');
    }
    
    if (options.transitionType && !VALID_TRANSITIONS.includes(options.transitionType)) {
      throw new PresentationError(`Invalid transition type: ${options.transitionType}`, 'INVALID_CONFIG');
    }
    
    this.config = { ...this.config, ...options };
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  applyPreset(name: string): void {
    const preset = PRESETS[name];
    if (preset) {
      this.configure(preset);
    }
  }

  // --------------------------------------------------------------------------
  // Slide Management Methods
  // --------------------------------------------------------------------------

  addSlide(slide: Slide): void {
    if (!VALID_SLIDE_TYPES.includes(slide.type)) {
      throw new PresentationError(`Invalid slide type: ${slide.type}`, 'INVALID_SLIDE_TYPE');
    }
    this.slides.push(slide);
  }

  addSlides(slides: Slide[]): void {
    slides.forEach(slide => this.addSlide(slide));
  }

  removeSlide(id: string): void {
    const index = this.slides.findIndex(s => s.id === id);
    if (index > -1) {
      this.slides.splice(index, 1);
      if (this.currentIndex >= this.slides.length) {
        this.currentIndex = Math.max(0, this.slides.length - 1);
      }
    }
  }

  clearSlides(): void {
    this.slides = [];
    this.currentIndex = 0;
    this.notifyStateChange();
  }

  reorderSlide(id: string, newIndex: number): void {
    const currentIdx = this.slides.findIndex(s => s.id === id);
    if (currentIdx === -1) return;
    
    const [slide] = this.slides.splice(currentIdx, 1);
    this.slides.splice(newIndex, 0, slide);
  }

  getSlides(): Slide[] {
    return [...this.slides];
  }

  getSlideById(id: string): Slide | undefined {
    return this.slides.find(s => s.id === id);
  }

  updateSlide(id: string, updates: Partial<Slide>): void {
    const slide = this.slides.find(s => s.id === id);
    if (slide) {
      Object.assign(slide, updates);
    }
  }

  // --------------------------------------------------------------------------
  // Navigation Methods
  // --------------------------------------------------------------------------

  next(): void {
    const nextIndex = this.currentIndex + 1;
    
    if (nextIndex >= this.slides.length) {
      if (this.config.loopSlides) {
        this.goTo(0);
        this.emitSlideChange('next');
      } else if (this.isPlaying) {
        this.stopAutoplay();
      }
    } else {
      this.currentIndex = nextIndex;
      this.emitSlideChange('next');
    }
    
    this.notifyStateChange();
  }

  previous(): void {
    const prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      if (this.config.loopSlides) {
        this.goTo(this.slides.length - 1);
        this.emitSlideChange('previous');
      }
    } else {
      this.currentIndex = prevIndex;
      this.emitSlideChange('previous');
    }
    
    this.notifyStateChange();
  }

  goTo(index: number): void {
    const clampedIndex = Math.max(0, Math.min(index, this.slides.length - 1));
    clampedIndex > this.currentIndex ? 'next' : 'previous';
    this.currentIndex = clampedIndex;
    this.notifyStateChange();
  }

  goToFirst(): void {
    this.goTo(0);
  }

  goToLast(): void {
    this.goTo(this.slides.length - 1);
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentSlide(): Slide | undefined {
    return this.slides[this.currentIndex];
  }

  hasNext(): boolean {
    return this.config.loopSlides || this.currentIndex < this.slides.length - 1;
  }

  hasPrevious(): boolean {
    return this.config.loopSlides || this.currentIndex > 0;
  }

  // --------------------------------------------------------------------------
  // State Methods
  // --------------------------------------------------------------------------

  getState(): PresentationState {
    return {
      currentIndex: this.currentIndex,
      totalSlides: this.slides.length,
      isPlaying: this.isPlaying,
      isFullscreen: this.isFullscreen,
      isPaused: this.isPaused,
      progress: this.getProgress(),
    };
  }

  getProgress(): number {
    if (this.slides.length === 0) return 0;
    return (this.currentIndex / this.slides.length) * 100;
  }

  onStateChange(callback: (state: PresentationState) => void): () => void {
    this.stateListeners.push(callback);
    return () => {
      const idx = this.stateListeners.indexOf(callback);
      if (idx > -1) this.stateListeners.splice(idx, 1);
    };
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.stateListeners.forEach(cb => cb(state));
  }

  // --------------------------------------------------------------------------
  // Fullscreen Methods
  // --------------------------------------------------------------------------

  async enterFullscreen(element: HTMLElement): Promise<void> {
    try {
      await element.requestFullscreen();
      this.isFullscreen = true;
      this.notifyStateChange();
    } catch (e) {
      // Fullscreen may not be supported
    }
  }

  async exitFullscreen(): Promise<void> {
    try {
      await document.exitFullscreen();
      this.isFullscreen = false;
      this.notifyStateChange();
    } catch (e) {
      // May already be in normal mode
    }
  }

  toggleFullscreen(element: HTMLElement): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen(element);
    }
  }

  setFullscreenState(isFullscreen: boolean): void {
    this.isFullscreen = isFullscreen;
    this.notifyStateChange();
  }

  // --------------------------------------------------------------------------
  // Autoplay Methods
  // --------------------------------------------------------------------------

  startAutoplay(config: AutoplayConfig): void {
    this.autoplayConfig = config;
    this.isPlaying = true;
    this.isPaused = false;
    
    this.autoplayInterval = setInterval(() => {
      if (!this.isPaused) {
        this.next();
      }
    }, config.interval);
    
    this.playListeners.forEach(cb => cb());
    this.notifyStateChange();
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.notifyStateChange();
  }

  pauseAutoplay(): void {
    this.isPaused = true;
    this.pauseListeners.forEach(cb => cb());
    this.notifyStateChange();
  }

  resumeAutoplay(): void {
    this.isPaused = false;
    this.notifyStateChange();
  }

  toggleAutoplay(config?: AutoplayConfig): void {
    if (this.isPlaying) {
      this.stopAutoplay();
    } else {
      this.startAutoplay(config || { interval: 5000 });
    }
  }

  // --------------------------------------------------------------------------
  // Keyboard Methods
  // --------------------------------------------------------------------------

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.enableKeyboard) return;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.previous();
        break;
      case ' ':
        event.preventDefault();
        this.toggleAutoplay();
        break;
      case 'Escape':
        event.preventDefault();
        this.exit();
        break;
      case 'Home':
        event.preventDefault();
        this.goToFirst();
        break;
      case 'End':
        event.preventDefault();
        this.goToLast();
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Transition Methods
  // --------------------------------------------------------------------------

  getTransitionCSS(): string {
    const duration = this.config.transitionDuration;
    
    switch (this.config.transitionType) {
      case 'fade':
        return `opacity ${duration}ms ease-in-out`;
      case 'slide':
        return `transform ${duration}ms ease-in-out`;
      case 'zoom':
        return `transform ${duration}ms ease-in-out, scale ${duration}ms ease-in-out`;
      case 'flip':
        return `transform ${duration}ms ease-in-out`;
      default:
        return 'none';
    }
  }

  getTransitionClasses(direction: NavigationDirection): TransitionClasses {
    const type = this.config.transitionType;
    
    return {
      enter: `transition-${type}-enter-${direction}`,
      exit: `transition-${type}-exit-${direction}`,
    };
  }

  // --------------------------------------------------------------------------
  // Event Methods
  // --------------------------------------------------------------------------

  onSlideChange(callback: (slide: Slide, index: number, direction: NavigationDirection) => void): () => void {
    this.slideChangeListeners.push(callback);
    return () => {
      const idx = this.slideChangeListeners.indexOf(callback);
      if (idx > -1) this.slideChangeListeners.splice(idx, 1);
    };
  }

  private emitSlideChange(direction: NavigationDirection): void {
    const slide = this.getCurrentSlide();
    if (slide) {
      this.slideChangeListeners.forEach(cb => cb(slide, this.currentIndex, direction));
    }
  }

  onExit(callback: () => void): () => void {
    this.exitListeners.push(callback);
    return () => {
      const idx = this.exitListeners.indexOf(callback);
      if (idx > -1) this.exitListeners.splice(idx, 1);
    };
  }

  exit(): void {
    this.stopAutoplay();
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
    this.exitListeners.forEach(cb => cb());
  }

  onPlay(callback: () => void): () => void {
    this.playListeners.push(callback);
    return () => {
      const idx = this.playListeners.indexOf(callback);
      if (idx > -1) this.playListeners.splice(idx, 1);
    };
  }

  onPause(callback: () => void): () => void {
    this.pauseListeners.push(callback);
    return () => {
      const idx = this.pauseListeners.indexOf(callback);
      if (idx > -1) this.pauseListeners.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Error Handling Methods
  // --------------------------------------------------------------------------

  onError(callback: (error: PresentationError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const idx = this.errorListeners.indexOf(callback);
      if (idx > -1) this.errorListeners.splice(idx, 1);
    };
  }

  emitError(error: PresentationError): void {
    this.errorListeners.forEach(cb => cb(error));
  }
}

