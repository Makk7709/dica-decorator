/**
 * Tests TDD pour GeminiImageService
 * Service de génération d'images via Google Gemini 3 Pro Image Preview
 * 
 * Developed by KOREV AI for DICA France
 */

import {describe, it, expect, beforeEach} from 'vitest';

// Types pour le service
interface GeminiImageConfig {
  model: string;
  apiEndpoint: string;
  defaultAspectRatio: string;
  responseModalities: string[];
}

interface ImageGenerationRequest {
  prompt: string;
  sourceImages?: Array<{
    base64: string;
    mimeType: string;
  }>;
  aspectRatio?: string;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

interface ImageGenerationResponse {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  textResponse?: string;
  error?: string;
}

interface GeminiApiRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig: {
    responseModalities: string[];
    responseMimeType?: string;
  };
}

// Service à implémenter
class GeminiImageService {
  private readonly config: GeminiImageConfig;
  private readonly apiKey: string;

  constructor(apiKey: string, config?: Partial<GeminiImageConfig>) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.config = {
      model: config?.model || 'gemini-3-pro-image-preview',
      apiEndpoint: config?.apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models',
      defaultAspectRatio: config?.defaultAspectRatio || '1:1',
      responseModalities: config?.responseModalities || ['TEXT', 'IMAGE'],
    };
  }

  getConfig(): GeminiImageConfig {
    return { ...this.config };
  }

  getApiUrl(): string {
    return `${this.config.apiEndpoint}/${this.config.model}:generateContent?key=${this.apiKey}`;
  }

  getSupportedAspectRatios(): string[] {
    return ['1:1', '16:9', '9:16', '4:3', '3:4'];
  }

  validateAspectRatio(ratio: string): boolean {
    return this.getSupportedAspectRatios().includes(ratio);
  }

  normalizeAspectRatio(format: string): string {
    const formatMap: Record<string, string> = {
      'square': '1:1',
      'landscape': '16:9',
      'portrait': '9:16',
      'wide': '16:9',
      'tall': '9:16',
    };
    return formatMap[format.toLowerCase()] || format;
  }

  buildRequestPayload(request: ImageGenerationRequest): GeminiApiRequest {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    
    // Add text prompt
    parts.push({ text: request.prompt });
    
    // Add source images if provided
    if (request.sourceImages && request.sourceImages.length > 0) {
      for (const image of request.sourceImages) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        });
      }
    }

    return {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        responseModalities: this.config.responseModalities,
        responseMimeType: request.outputFormat ? `image/${request.outputFormat}` : undefined,
      },
    };
  }

  parseResponse(apiResponse: unknown): ImageGenerationResponse {
    try {
      const response = apiResponse as { candidates?: Array<{ content?: { parts?: Array<{ inline_data?: { data?: string; mime_type?: string }; text?: string }> } }> };
      const candidates = response?.candidates;
      
      if (!candidates || candidates.length === 0) {
        return {
          success: false,
          error: 'No candidates in response',
        };
      }

      const parts = candidates[0]?.content?.parts;

      
      if (!parts || parts.length === 0) {
        return {
          success: false,
          error: 'No parts in response',
        };
      }

      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      let textResponse: string | undefined;

      for (const part of parts) {
        // Check for inline_data (snake_case from API)
        if (part.inline_data?.data) {
          imageBase64 = part.inline_data.data;
          mimeType = part.inline_data.mime_type || 'image/png';
        }
        // Check for inlineData (camelCase)
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
        }
        // Check for text
        if (part.text) {
          textResponse = part.text;
        }
      }

      if (!imageBase64) {
        return {
          success: false,
          error: 'No image data in response',
          textResponse,
        };
      }

      return {
        success: true,
        imageBase64,
        mimeType,
        textResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
      };
    }
  }

  toDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
  }

  getErrorMessage(statusCode: number, errorBody?: string): string {
    const errorMessages: Record<number, string> = {
      400: 'Requête invalide. Vérifiez les paramètres.',
      401: 'Clé API invalide ou expirée.',
      403: 'Accès refusé. Vérifiez les permissions.',
      429: 'Quota API dépassé. Veuillez patienter.',
      500: 'Erreur serveur Google AI. Réessayez plus tard.',
      503: 'Service temporairement indisponible.',
    };
    
    return errorMessages[statusCode] || `Erreur API Google AI (${statusCode})`;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // This method would be tested with mocked fetch
    // For unit tests, we test the building blocks separately
    throw new Error('Not implemented - use integration tests');
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('GeminiImageService', () => {
  let service: GeminiImageService;
  const testApiKey = 'test-api-key-12345';

  beforeEach(() => {
    service = new GeminiImageService(testApiKey);
  });

  // -------------------------------------------------------------------------
  // Configuration Tests
  // -------------------------------------------------------------------------
  describe('Configuration', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new GeminiImageService('')).toThrow('API key is required');
    });

    it('should throw error if API key is whitespace', () => {
      expect(() => new GeminiImageService('   ')).toThrow('API key is required');
    });

    it('should use default model gemini-3-pro-image-preview', () => {
      const config = service.getConfig();
      expect(config.model).toBe('gemini-3-pro-image-preview');
    });

    it('should allow custom model configuration', () => {
      const customService = new GeminiImageService(testApiKey, {
        model: 'gemini-3-pro-image-preview',
      });
      expect(customService.getConfig().model).toBe('gemini-3-pro-image-preview');
    });

    it('should use default API endpoint', () => {
      const config = service.getConfig();
      expect(config.apiEndpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('should have default response modalities TEXT and IMAGE', () => {
      const config = service.getConfig();
      expect(config.responseModalities).toEqual(['TEXT', 'IMAGE']);
    });

    it('should have default aspect ratio 1:1', () => {
      const config = service.getConfig();
      expect(config.defaultAspectRatio).toBe('1:1');
    });

    it('should build correct API URL with key', () => {
      const url = service.getApiUrl();
      expect(url).toContain('generativelanguage.googleapis.com');
      expect(url).toContain('gemini-3-pro-image-preview');
      expect(url).toContain(':generateContent');
      expect(url).toContain(`key=${testApiKey}`);
    });
  });

  // -------------------------------------------------------------------------
  // Aspect Ratio Tests
  // -------------------------------------------------------------------------
  describe('Aspect Ratios', () => {
    it('should return list of supported aspect ratios', () => {
      const ratios = service.getSupportedAspectRatios();
      expect(ratios).toContain('1:1');
      expect(ratios).toContain('16:9');
      expect(ratios).toContain('9:16');
      expect(ratios).toContain('4:3');
      expect(ratios).toContain('3:4');
    });

    it('should validate correct aspect ratio', () => {
      expect(service.validateAspectRatio('1:1')).toBe(true);
      expect(service.validateAspectRatio('16:9')).toBe(true);
      expect(service.validateAspectRatio('9:16')).toBe(true);
    });

    it('should reject invalid aspect ratio', () => {
      expect(service.validateAspectRatio('2:1')).toBe(false);
      expect(service.validateAspectRatio('invalid')).toBe(false);
      expect(service.validateAspectRatio('')).toBe(false);
    });

    it('should normalize "square" to "1:1"', () => {
      expect(service.normalizeAspectRatio('square')).toBe('1:1');
    });

    it('should normalize "landscape" to "16:9"', () => {
      expect(service.normalizeAspectRatio('landscape')).toBe('16:9');
    });

    it('should normalize "portrait" to "9:16"', () => {
      expect(service.normalizeAspectRatio('portrait')).toBe('9:16');
    });

    it('should normalize "wide" to "16:9"', () => {
      expect(service.normalizeAspectRatio('wide')).toBe('16:9');
    });

    it('should normalize "tall" to "9:16"', () => {
      expect(service.normalizeAspectRatio('tall')).toBe('9:16');
    });

    it('should pass through valid ratio unchanged', () => {
      expect(service.normalizeAspectRatio('4:3')).toBe('4:3');
    });

    it('should be case-insensitive for normalization', () => {
      expect(service.normalizeAspectRatio('SQUARE')).toBe('1:1');
      expect(service.normalizeAspectRatio('Landscape')).toBe('16:9');
    });
  });

  // -------------------------------------------------------------------------
  // Request Payload Building Tests
  // -------------------------------------------------------------------------
  describe('Request Payload Building', () => {
    it('should build payload with text prompt only', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Generate a beautiful sunset',
      });

      expect(payload.contents).toHaveLength(1);
      expect(payload.contents[0].role).toBe('user');
      expect(payload.contents[0].parts).toHaveLength(1);
      expect(payload.contents[0].parts[0].text).toBe('Generate a beautiful sunset');
    });

    it('should include response modalities in generation config', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Test prompt',
      });

      expect(payload.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
    });

    it('should add source image to payload', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Edit this image',
        sourceImages: [
          {
            base64: 'base64encodedimage',
            mimeType: 'image/jpeg',
          },
        ],
      });

      expect(payload.contents[0].parts).toHaveLength(2);
      expect(payload.contents[0].parts[1].inlineData).toEqual({
        mimeType: 'image/jpeg',
        data: 'base64encodedimage',
      });
    });

    it('should add multiple source images to payload', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Combine these images',
        sourceImages: [
          { base64: 'image1', mimeType: 'image/jpeg' },
          { base64: 'image2', mimeType: 'image/png' },
        ],
      });

      expect(payload.contents[0].parts).toHaveLength(3);
      expect(payload.contents[0].parts[1].inlineData?.data).toBe('image1');
      expect(payload.contents[0].parts[2].inlineData?.data).toBe('image2');
    });

    it('should set output format in generation config', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Test',
        outputFormat: 'webp',
      });

      expect(payload.generationConfig.responseMimeType).toBe('image/webp');
    });

    it('should not include responseMimeType if no output format specified', () => {
      const payload = service.buildRequestPayload({
        prompt: 'Test',
      });

      expect(payload.generationConfig.responseMimeType).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Response Parsing Tests
  // -------------------------------------------------------------------------
  describe('Response Parsing', () => {
    it('should parse successful response with inline_data (snake_case)', () => {
      const apiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: 'base64imagedata',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = service.parseResponse(apiResponse);
      
      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('base64imagedata');
      expect(result.mimeType).toBe('image/png');
    });

    it('should parse successful response with inlineData (camelCase)', () => {
      const apiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'jpegimagedata',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = service.parseResponse(apiResponse);
      
      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('jpegimagedata');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should extract text response along with image', () => {
      const apiResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Here is your generated image' },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: 'imagedata',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = service.parseResponse(apiResponse);
      
      expect(result.success).toBe(true);
      expect(result.textResponse).toBe('Here is your generated image');
      expect(result.imageBase64).toBe('imagedata');
    });

    it('should return error if no candidates', () => {
      const result = service.parseResponse({ candidates: [] });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No candidates in response');
    });

    it('should return error if candidates is undefined', () => {
      const result = service.parseResponse({});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No candidates in response');
    });

    it('should return error if no parts in response', () => {
      const result = service.parseResponse({
        candidates: [{ content: { parts: [] } }],
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No parts in response');
    });

    it('should return error if no image data found', () => {
      const result = service.parseResponse({
        candidates: [
          {
            content: {
              parts: [{ text: 'Just text, no image' }],
            },
          },
        ],
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image data in response');
      expect(result.textResponse).toBe('Just text, no image');
    });

    it('should handle malformed response gracefully', () => {
      const result = service.parseResponse(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should default mime type to image/png if not specified', () => {
      const apiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inline_data: {
                    data: 'imagedata',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = service.parseResponse(apiResponse);
      
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });
  });

  // -------------------------------------------------------------------------
  // Data URL Conversion Tests
  // -------------------------------------------------------------------------
  describe('Data URL Conversion', () => {
    it('should convert base64 to PNG data URL by default', () => {
      const dataUrl = service.toDataUrl('abc123');
      expect(dataUrl).toBe('data:image/png;base64,abc123');
    });

    it('should convert base64 to JPEG data URL', () => {
      const dataUrl = service.toDataUrl('abc123', 'image/jpeg');
      expect(dataUrl).toBe('data:image/jpeg;base64,abc123');
    });

    it('should convert base64 to WebP data URL', () => {
      const dataUrl = service.toDataUrl('abc123', 'image/webp');
      expect(dataUrl).toBe('data:image/webp;base64,abc123');
    });
  });

  // -------------------------------------------------------------------------
  // Error Message Tests
  // -------------------------------------------------------------------------
  describe('Error Messages', () => {
    it('should return correct message for 400 error', () => {
      const message = service.getErrorMessage(400);
      expect(message).toContain('Requête invalide');
    });

    it('should return correct message for 401 error', () => {
      const message = service.getErrorMessage(401);
      expect(message).toContain('Clé API');
    });

    it('should return correct message for 403 error', () => {
      const message = service.getErrorMessage(403);
      expect(message).toContain('Accès refusé');
    });

    it('should return correct message for 429 error (quota)', () => {
      const message = service.getErrorMessage(429);
      expect(message).toContain('Quota');
    });

    it('should return correct message for 500 error', () => {
      const message = service.getErrorMessage(500);
      expect(message).toContain('Erreur serveur');
    });

    it('should return correct message for 503 error', () => {
      const message = service.getErrorMessage(503);
      expect(message).toContain('indisponible');
    });

    it('should return generic message for unknown error code', () => {
      const message = service.getErrorMessage(418);
      expect(message).toContain('418');
      expect(message).toContain('Erreur API Google AI');
    });
  });

  // -------------------------------------------------------------------------
  // Model Configuration Tests for gemini-3-pro-image-preview
  // -------------------------------------------------------------------------
  describe('Gemini 3 Pro Image Preview Model', () => {
    let gemini3Service: GeminiImageService;

    beforeEach(() => {
      gemini3Service = new GeminiImageService(testApiKey, {
        model: 'gemini-3-pro-image-preview',
      });
    });

    it('should use gemini-3-pro-image-preview model', () => {
      expect(gemini3Service.getConfig().model).toBe('gemini-3-pro-image-preview');
    });

    it('should build URL with gemini-3-pro-image-preview', () => {
      const url = gemini3Service.getApiUrl();
      expect(url).toContain('gemini-3-pro-image-preview');
    });

    it('should maintain same response modalities', () => {
      const config = gemini3Service.getConfig();
      expect(config.responseModalities).toContain('IMAGE');
      expect(config.responseModalities).toContain('TEXT');
    });
  });
});

// Export the service class for use in production
export { GeminiImageService };
export type { GeminiImageConfig, ImageGenerationRequest, ImageGenerationResponse, GeminiApiRequest };

