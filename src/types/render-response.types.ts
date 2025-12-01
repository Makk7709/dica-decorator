/**
 * @fileoverview Types et utilitaires pour les réponses de génération de rendu
 * Quick Win QW4: Inclut renderIds pour l'état optimiste
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

// ============================================================================
// Types
// ============================================================================

export interface RenderGenerationResponse {
  success: boolean;
  resultUrls: string[];
  renderIds: string[];
  error?: string;
}

export interface OptimisticRenderData {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate if an object is a valid RenderGenerationResponse
 */
export function isValidRenderResponse(obj: unknown): obj is RenderGenerationResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const response = obj as Record<string, unknown>;
  
  // Must have success boolean
  if (typeof response.success !== 'boolean') return false;
  
  // Must have resultUrls array
  if (!Array.isArray(response.resultUrls)) return false;
  
  // renderIds is optional but must be array if present
  if (response.renderIds !== undefined && !Array.isArray(response.renderIds)) return false;
  
  return true;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a raw response into RenderGenerationResponse
 * Handles legacy responses without renderIds
 */
export function parseRenderResponse(raw: unknown): RenderGenerationResponse | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  
  const obj = raw as Record<string, unknown>;
  
  // Check required success field
  if (typeof obj.success !== 'boolean') return null;
  
  // Check required resultUrls
  if (!Array.isArray(obj.resultUrls)) return null;
  
  return {
    success: obj.success,
    resultUrls: obj.resultUrls as string[],
    renderIds: Array.isArray(obj.renderIds) ? obj.renderIds as string[] : [],
    error: typeof obj.error === 'string' ? obj.error : undefined,
  };
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract render IDs from a response
 */
export function extractRenderIds(response: RenderGenerationResponse): string[] {
  if (!response.success) return [];
  return response.renderIds || [];
}

// ============================================================================
// Optimistic Data Creation
// ============================================================================

/**
 * Create optimistic render data from API response
 * Handles mismatched arrays by generating temp IDs
 */
export function createOptimisticFromResponse(
  response: RenderGenerationResponse,
  _photoId: string,
  decorId: string
): OptimisticRenderData[] {
  if (!response.success) return [];
  
  const { resultUrls, renderIds } = response;
  const now = new Date().toISOString();
  
  return resultUrls.map((url, index) => {
    // Use provided ID or generate temp ID
    const id = renderIds[index] || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      result_image_url: url,
      decor_id: decorId,
      created_at: now,
    };
  });
}

