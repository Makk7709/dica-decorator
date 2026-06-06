/**
 * @fileoverview Tests TDD pour ParallelFetchService
 * Service d'optimisation des fetches d'images en parallèle
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * TDD STRICT: Ces tests ont été écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {ParallelFetchService} from '../parallel-fetch.service';

describe('ParallelFetchService', () => {
  let service: ParallelFetchService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ParallelFetchService();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance with default options', () => {
      expect(service).toBeInstanceOf(ParallelFetchService);
    });

    it('should accept custom timeout option', () => {
      const customService = new ParallelFetchService({ timeout: 60000 });
      expect(customService.getOptions().timeout).toBe(60000);
    });

    it('should have default timeout of 30000ms', () => {
      expect(service.getOptions().timeout).toBe(30000);
    });

    it('should accept custom maxRetries option', () => {
      const customService = new ParallelFetchService({ maxRetries: 5 });
      expect(customService.getOptions().maxRetries).toBe(5);
    });

    it('should have default maxRetries of 2', () => {
      expect(service.getOptions().maxRetries).toBe(2);
    });
  });

  // ============================================================================
  // SINGLE FETCH TESTS
  // ============================================================================

  describe('fetchWithTimeout', () => {
    it('should fetch a URL successfully', async () => {
      const mockResponse = new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchWithTimeout('https://example.com/image.jpg');
      
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should return error result on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchWithTimeout('https://example.com/image.jpg');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should abort fetch after timeout', async () => {
      // Simulate AbortError which is thrown when fetch is aborted
      mockFetch.mockImplementationOnce((_url: string, options?: RequestInit) => {
        return new Promise((_, reject) => {
          // Check if signal exists and simulate abort behavior
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
          // Never resolve naturally - wait for abort
        });
      });

      const result = await service.fetchWithTimeout('https://example.com/image.jpg', 50); // 50ms timeout
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 2000); // Test timeout of 2s

    it('should handle HTTP error status codes', async () => {
      const mockResponse = new Response(null, { status: 404 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchWithTimeout('https://example.com/notfound.jpg');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should handle 500 server errors', async () => {
      const mockResponse = new Response(null, { status: 500 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchWithTimeout('https://example.com/error.jpg');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
    });
  });

  // ============================================================================
  // PARALLEL FETCH TESTS
  // ============================================================================

  describe('fetchAllParallel', () => {
    it('should fetch multiple URLs in parallel', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      mockFetch.mockImplementation((url: string) => {
        return Promise.resolve(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }));
      });

      const results = await service.fetchAllParallel(urls);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should return results in the same order as input URLs', async () => {
      const urls = [
        'https://example.com/first.jpg',
        'https://example.com/second.jpg',
      ];

      mockFetch.mockImplementation((url: string) => {
        const delay = url.includes('first') ? 100 : 10; // First URL is slower
        return new Promise(resolve => 
          setTimeout(() => resolve(new Response(new ArrayBuffer(100), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })), delay)
        );
      });

      const results = await service.fetchAllParallel(urls);
      
      expect(results[0].url).toBe(urls[0]);
      expect(results[1].url).toBe(urls[1]);
    });

    it('should handle partial failures gracefully', async () => {
      const urls = [
        'https://example.com/success.jpg',
        'https://example.com/failure.jpg',
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('failure')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }));
      });

      const results = await service.fetchAllParallel(urls);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should handle empty URL array', async () => {
      const results = await service.fetchAllParallel([]);
      
      expect(results).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should be faster than sequential fetch for multiple URLs', async () => {
      const urls = new Array(5).fill(null).map((_, i) => `https://example.com/image${i}.jpg`);
      const fetchDelay = 50; // 50ms per fetch

      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(new Response(new ArrayBuffer(100), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })), fetchDelay)
        )
      );

      const startTime = Date.now();
      await service.fetchAllParallel(urls);
      const duration = Date.now() - startTime;

      // Parallel should be significantly faster than 5 * 50ms = 250ms
      // Allow some overhead, but should be under 150ms
      expect(duration).toBeLessThan(150);
    });
  });

  // ============================================================================
  // IMAGE CONVERSION TESTS
  // ============================================================================

  describe('fetchImageAsBase64', () => {
    it('should convert fetched image to base64', async () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes
      const mockResponse = new Response(imageData.buffer, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchImageAsBase64('https://example.com/image.png');
      
      expect(result.success).toBe(true);
      expect(result.base64).toBeDefined();
      expect(result.mimeType).toBe('image/png');
    });

    it('should return correct mime type for JPEG', async () => {
      const mockResponse = new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchImageAsBase64('https://example.com/image.jpg');
      
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should default to image/jpeg if no content-type header', async () => {
      const mockResponse = new Response(new ArrayBuffer(100), {
        status: 200,
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchImageAsBase64('https://example.com/image.jpg');
      
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should handle fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchImageAsBase64('https://example.com/image.jpg');
      
      expect(result.success).toBe(false);
      expect(result.base64).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should validate image size against max limit', async () => {
      const largeImage = new ArrayBuffer(15 * 1024 * 1024); // 15MB
      const mockResponse = new Response(largeImage, {
        status: 200,
        headers: { 
          'content-type': 'image/jpeg',
          'content-length': String(15 * 1024 * 1024),
        },
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await service.fetchImageAsBase64('https://example.com/large.jpg', {
        maxSize: 12 * 1024 * 1024, // 12MB limit
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('size');
    });
  });

  // ============================================================================
  // PARALLEL IMAGE FETCH WITH BASE64 CONVERSION
  // ============================================================================

  describe('fetchImagesAsBase64Parallel', () => {
    it('should fetch and convert multiple images in parallel', async () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/texture.png',
      ];

      mockFetch.mockImplementation((url: string) => {
        const mimeType = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return Promise.resolve(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': mimeType },
        }));
      });

      const results = await service.fetchImagesAsBase64Parallel(urls);
      
      expect(results).toHaveLength(2);
      expect(results[0].base64).toBeDefined();
      expect(results[0].mimeType).toBe('image/jpeg');
      expect(results[1].mimeType).toBe('image/png');
    });

    it('should include URL in each result', async () => {
      const urls = ['https://example.com/image.jpg'];
      
      mockFetch.mockResolvedValueOnce(new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }));

      const results = await service.fetchImagesAsBase64Parallel(urls);
      
      expect(results[0].url).toBe(urls[0]);
    });

    it('should handle mixed success and failure', async () => {
      const urls = [
        'https://example.com/good.jpg',
        'https://example.com/bad.jpg',
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('bad')) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }));
      });

      const results = await service.fetchImagesAsBase64Parallel(urls);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  // ============================================================================
  // RETRY LOGIC TESTS
  // ============================================================================

  describe('Retry Logic', () => {
    it('should retry on failure up to maxRetries', async () => {
      const serviceWithRetry = new ParallelFetchService({ maxRetries: 3 });
      
      mockFetch
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }));

      const result = await serviceWithRetry.fetchWithRetry('https://example.com/image.jpg');
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting all retries', async () => {
      const serviceWithRetry = new ParallelFetchService({ maxRetries: 2 });
      
      mockFetch.mockRejectedValue(new Error('Always fails'));

      const result = await serviceWithRetry.fetchWithRetry('https://example.com/image.jpg');
      
      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on 4xx errors', async () => {
      const serviceWithRetry = new ParallelFetchService({ maxRetries: 3 });
      
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

      const result = await serviceWithRetry.fetchWithRetry('https://example.com/notfound.jpg');
      
      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry on 4xx
    });

    it('should retry on 5xx errors', async () => {
      const serviceWithRetry = new ParallelFetchService({ maxRetries: 2 });
      
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }));

      const result = await serviceWithRetry.fetchWithRetry('https://example.com/image.jpg');
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // PERFORMANCE METRICS TESTS
  // ============================================================================

  describe('Performance Metrics', () => {
    it('should track latency for each fetch', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(new Response(new ArrayBuffer(100), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })), 50)
        )
      );

      const result = await service.fetchWithTimeout('https://example.com/image.jpg');
      
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
    });

    it('should include latency in parallel results', async () => {
      mockFetch.mockResolvedValue(new Response(new ArrayBuffer(100), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }));

      const results = await service.fetchAllParallel([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]);
      
      results.forEach(result => {
        expect(result.latencyMs).toBeDefined();
        expect(typeof result.latencyMs).toBe('number');
      });
    });

    it('should calculate total parallel fetch time', async () => {
      const fetchDelay = 50;
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(new Response(new ArrayBuffer(100), {
            status: 200,
            headers: { 'content-type': 'image/jpeg' },
          })), fetchDelay)
        )
      );

      const result = await service.fetchAllParallelWithMetrics([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ]);
      
      expect(result.totalLatencyMs).toBeDefined();
      expect(result.totalLatencyMs).toBeLessThan(fetchDelay * 3); // Parallel should be faster
    });
  });

  // ============================================================================
  // BASE64 CHUNKED CONVERSION TESTS
  // ============================================================================

  describe('Base64 Chunked Conversion', () => {
    it('should convert ArrayBuffer to base64 correctly', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = service.arrayBufferToBase64(data.buffer);
      
      expect(base64).toBe(btoa('Hello'));
    });

    it('should handle large buffers without memory issues', () => {
      // Create a 1MB buffer
      const largeBuffer = new ArrayBuffer(1024 * 1024);
      const view = new Uint8Array(largeBuffer);
      view.fill(65); // Fill with 'A'
      
      const base64 = service.arrayBufferToBase64(largeBuffer);
      
      expect(base64).toBeDefined();
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should use chunked conversion for performance', () => {
      const spy = vi.spyOn(service, 'arrayBufferToBase64Chunked');
      const buffer = new ArrayBuffer(100000); // 100KB
      
      service.arrayBufferToBase64(buffer);
      
      expect(spy).toHaveBeenCalled();
    });
  });
});

