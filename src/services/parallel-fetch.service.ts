/**
 * @fileoverview ParallelFetchService - Optimisation des fetches d'images en parallèle
 * Quick Win QW1: Améliore les performances de chargement des images
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FetchResult {
  success: boolean;
  status?: number;
  error?: string;
  url?: string;
  latencyMs?: number;
}

export interface ImageFetchResult extends FetchResult {
  base64: string | null;
  mimeType: string;
}

export interface ParallelFetchOptions {
  timeout?: number;
  maxRetries?: number;
  maxSize?: number;
}

export interface ParallelFetchMetrics {
  results: FetchResult[];
  totalLatencyMs: number;
  successCount: number;
  failureCount: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<ParallelFetchOptions> = {
  timeout: 30000,
  maxRetries: 2,
  maxSize: 12 * 1024 * 1024, // 12MB
};

// ============================================================================
// ParallelFetchService
// ============================================================================

export class ParallelFetchService {
  private options: Required<ParallelFetchOptions>;

  constructor(options: ParallelFetchOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): Required<ParallelFetchOptions> {
    return { ...this.options };
  }

  /**
   * Convert ArrayBuffer to base64 in chunks (memory efficient)
   */
  arrayBufferToBase64Chunked(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 32768; // 32KB chunks
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }

  /**
   * Convert ArrayBuffer to base64 (uses chunked for large buffers)
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    return this.arrayBufferToBase64Chunked(buffer);
  }

  /**
   * Fetch with timeout support
   */
  async fetchWithTimeout(
    url: string,
    timeout: number = this.options.timeout
  ): Promise<FetchResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          url,
          latencyMs,
        };
      }

      return {
        success: true,
        status: response.status,
        url,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          url,
          latencyMs,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
        latencyMs,
      };
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(
    url: string,
    maxRetries: number = this.options.maxRetries
  ): Promise<FetchResult> {
    let lastResult: FetchResult = { success: false, error: 'No attempts made' };
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startTime;

        // Don't retry on 4xx errors
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}`,
            url,
            latencyMs,
          };
        }

        // Retry on 5xx errors
        if (response.status >= 500) {
          lastResult = {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}`,
            url,
            latencyMs,
          };
          continue;
        }

        return {
          success: true,
          status: response.status,
          url,
          latencyMs,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        lastResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          url,
          latencyMs,
        };
      }
    }

    return lastResult;
  }

  /**
   * Fetch multiple URLs in parallel
   */
  async fetchAllParallel(urls: string[]): Promise<FetchResult[]> {
    if (urls.length === 0) return [];

    const promises = urls.map(async (url) => {
      const result = await this.fetchWithTimeout(url);
      return { ...result, url };
    });

    return Promise.all(promises);
  }

  /**
   * Fetch image and convert to base64
   */
  async fetchImageAsBase64(
    url: string,
    options: { maxSize?: number } = {}
  ): Promise<ImageFetchResult> {
    const maxSize = options.maxSize ?? this.options.maxSize;
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          base64: null,
          mimeType: 'image/jpeg',
          url,
          latencyMs,
        };
      }

      // Check content-length header for size validation
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxSize) {
        return {
          success: false,
          error: `Image size ${contentLength} exceeds max size ${maxSize}`,
          base64: null,
          mimeType: response.headers.get('content-type') ?? 'image/jpeg',
          url,
          latencyMs,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Check actual size
      if (arrayBuffer.byteLength > maxSize) {
        return {
          success: false,
          error: `Image size ${arrayBuffer.byteLength} exceeds max size ${maxSize}`,
          base64: null,
          mimeType: response.headers.get('content-type') ?? 'image/jpeg',
          url,
          latencyMs,
        };
      }

      const base64 = this.arrayBufferToBase64(arrayBuffer);
      const mimeType = response.headers.get('content-type') ?? 'image/jpeg';

      return {
        success: true,
        status: response.status,
        base64,
        mimeType,
        url,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        base64: null,
        mimeType: 'image/jpeg',
        url,
        latencyMs,
      };
    }
  }

  /**
   * Fetch multiple images in parallel and convert to base64
   */
  async fetchImagesAsBase64Parallel(urls: string[]): Promise<ImageFetchResult[]> {
    if (urls.length === 0) return [];

    const promises = urls.map((url) => this.fetchImageAsBase64(url));
    return Promise.all(promises);
  }

  /**
   * Fetch all with metrics tracking
   */
  async fetchAllParallelWithMetrics(urls: string[]): Promise<ParallelFetchMetrics> {
    const startTime = Date.now();
    const results = await this.fetchAllParallel(urls);
    const totalLatencyMs = Date.now() - startTime;

    return {
      results,
      totalLatencyMs,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    };
  }
}

// Export default instance
export const parallelFetchService = new ParallelFetchService();

