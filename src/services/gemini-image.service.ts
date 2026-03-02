/**
 * GeminiImageService - Service de génération d'images via Google Gemini
 * 
 * Ce service encapsule la configuration et les utilitaires pour interagir
 * avec l'API Google Gemini pour la génération d'images.
 * 
 * Modèle recommandé: gemini-3-pro-image-preview
 * 
 * Developed by KOREV AI for DICA France
 */

// ============================================================================
// Types
// ============================================================================

export interface GeminiImageConfig {
  model: string;
  apiEndpoint: string;
  defaultAspectRatio: string;
  responseModalities: string[];
}

export interface ImageGenerationRequest {
  prompt: string;
  sourceImages?: Array<{
    base64: string;
    mimeType: string;
  }>;
  aspectRatio?: string;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

export interface ImageGenerationResponse {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  textResponse?: string;
  error?: string;
}

export interface GeminiApiRequest {
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

// ============================================================================
// Constants
// ============================================================================

/** Modèle par défaut pour la génération d'images - Gemini 3.1 Flash Image (Nano Banana 2) */
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

/** Modèle Gemini 3.1 Flash Image pour génération d'images haute qualité à vitesse Flash */
export const GEMINI_3_PRO_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

/** Endpoint de base de l'API Google AI */
export const GOOGLE_AI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Ratios d'aspect supportés */
export const SUPPORTED_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

/** Mapping des formats vers les ratios */
export const FORMAT_TO_RATIO_MAP: Record<string, string> = {
  'square': '1:1',
  'landscape': '16:9',
  'portrait': '9:16',
  'wide': '16:9',
  'tall': '9:16',
};

// ============================================================================
// Service Class
// ============================================================================

export class GeminiImageService {
  private config: GeminiImageConfig;
  private apiKey: string;

  constructor(apiKey: string, config?: Partial<GeminiImageConfig>) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.config = {
      model: config?.model || DEFAULT_IMAGE_MODEL,
      apiEndpoint: config?.apiEndpoint || GOOGLE_AI_ENDPOINT,
      defaultAspectRatio: config?.defaultAspectRatio || '1:1',
      responseModalities: config?.responseModalities || ['TEXT', 'IMAGE'],
    };
  }

  /**
   * Retourne la configuration actuelle du service
   */
  getConfig(): GeminiImageConfig {
    return { ...this.config };
  }

  /**
   * Construit l'URL complète de l'API avec la clé
   */
  getApiUrl(): string {
    return `${this.config.apiEndpoint}/${this.config.model}:generateContent?key=${this.apiKey}`;
  }

  /**
   * Retourne la liste des ratios d'aspect supportés
   */
  getSupportedAspectRatios(): string[] {
    return SUPPORTED_ASPECT_RATIOS;
  }

  /**
   * Valide si un ratio d'aspect est supporté
   */
  validateAspectRatio(ratio: string): boolean {
    return SUPPORTED_ASPECT_RATIOS.includes(ratio);
  }

  /**
   * Normalise un format textuel en ratio d'aspect
   * @param format - Format textuel (square, landscape, portrait, etc.) ou ratio direct
   */
  normalizeAspectRatio(format: string): string {
    return FORMAT_TO_RATIO_MAP[format.toLowerCase()] || format;
  }

  /**
   * Construit le payload de requête pour l'API Gemini
   */
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

  /**
   * Parse la réponse de l'API Gemini et extrait l'image
   */
  parseResponse(apiResponse: any): ImageGenerationResponse {
    try {
      const candidates = apiResponse?.candidates;
      
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

  /**
   * Convertit une image base64 en data URL
   */
  toDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Retourne un message d'erreur approprié selon le code HTTP
   */
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
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Crée un service configuré pour Gemini 3 Pro Image Preview
 */
export function createGemini3ProService(apiKey: string): GeminiImageService {
  return new GeminiImageService(apiKey, {
    model: GEMINI_3_PRO_IMAGE_MODEL,
  });
}

/**
 * Crée un service avec la configuration par défaut
 */
export function createDefaultService(apiKey: string): GeminiImageService {
  return new GeminiImageService(apiKey);
}

