/**
 * @fileoverview Tests TDD pour les types de réponse de génération de rendu
 * Validation des types et parsing des réponses API
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * TDD STRICT: Ces tests ont été écrits AVANT l'implémentation
 */

import { describe, it, expect } from 'vitest';
import {
  RenderGenerationResponse,
  parseRenderResponse,
  isValidRenderResponse,
  extractRenderIds,
  createOptimisticFromResponse,
} from '../render-response.types';

describe('Render Response Types', () => {
  // ============================================================================
  // TYPE VALIDATION TESTS
  // ============================================================================

  describe('isValidRenderResponse', () => {
    it('should validate a complete success response', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['data:image/png;base64,abc123'],
        renderIds: ['uuid-1'],
      };
      
      expect(isValidRenderResponse(response)).toBe(true);
    });

    it('should invalidate response without success field', () => {
      const response = {
        resultUrls: ['url'],
        renderIds: ['id'],
      };
      
      expect(isValidRenderResponse(response as any)).toBe(false);
    });

    it('should validate error response', () => {
      const response: RenderGenerationResponse = {
        success: false,
        error: 'API error',
        resultUrls: [],
        renderIds: [],
      };
      
      expect(isValidRenderResponse(response)).toBe(true);
    });

    it('should invalidate response without resultUrls', () => {
      const response = {
        success: true,
        renderIds: ['id'],
      };
      
      expect(isValidRenderResponse(response as any)).toBe(false);
    });

    it('should validate response with multiple renders', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1', 'url2'],
        renderIds: ['id1', 'id2'],
      };
      
      expect(isValidRenderResponse(response)).toBe(true);
    });
  });

  // ============================================================================
  // PARSING TESTS
  // ============================================================================

  describe('parseRenderResponse', () => {
    it('should parse valid JSON response', () => {
      const json = {
        success: true,
        resultUrls: ['url1'],
        renderIds: ['id1'],
      };
      
      const result = parseRenderResponse(json);
      
      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.renderIds).toContain('id1');
    });

    it('should handle legacy response without renderIds', () => {
      const legacyJson = {
        success: true,
        resultUrls: ['url1'],
        // No renderIds - legacy format
      };
      
      const result = parseRenderResponse(legacyJson);
      
      expect(result).not.toBeNull();
      expect(result?.renderIds).toEqual([]);
    });

    it('should return null for invalid response', () => {
      const invalid = { foo: 'bar' };
      
      const result = parseRenderResponse(invalid);
      
      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = parseRenderResponse(null);
      
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = parseRenderResponse(undefined);
      
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // EXTRACT IDS TESTS
  // ============================================================================

  describe('extractRenderIds', () => {
    it('should extract IDs from valid response', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1', 'url2'],
        renderIds: ['id1', 'id2'],
      };
      
      const ids = extractRenderIds(response);
      
      expect(ids).toEqual(['id1', 'id2']);
    });

    it('should return empty array for error response', () => {
      const response: RenderGenerationResponse = {
        success: false,
        error: 'Failed',
        resultUrls: [],
        renderIds: [],
      };
      
      const ids = extractRenderIds(response);
      
      expect(ids).toEqual([]);
    });

    it('should handle response with single ID', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1'],
        renderIds: ['single-id'],
      };
      
      const ids = extractRenderIds(response);
      
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe('single-id');
    });
  });

  // ============================================================================
  // CREATE OPTIMISTIC FROM RESPONSE TESTS
  // ============================================================================

  describe('createOptimisticFromResponse', () => {
    it('should create optimistic render data from response', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1'],
        renderIds: ['id1'],
      };
      
      const renders = createOptimisticFromResponse(response, 'photo-1', 'decor-1');
      
      expect(renders).toHaveLength(1);
      expect(renders[0].id).toBe('id1');
      expect(renders[0].result_image_url).toBe('url1');
      expect(renders[0].decor_id).toBe('decor-1');
    });

    it('should handle multiple renders', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1', 'url2'],
        renderIds: ['id1', 'id2'],
      };
      
      const renders = createOptimisticFromResponse(response, 'photo-1', 'decor-1');
      
      expect(renders).toHaveLength(2);
      expect(renders[0].id).toBe('id1');
      expect(renders[1].id).toBe('id2');
    });

    it('should return empty array for failed response', () => {
      const response: RenderGenerationResponse = {
        success: false,
        error: 'Failed',
        resultUrls: [],
        renderIds: [],
      };
      
      const renders = createOptimisticFromResponse(response, 'photo-1', 'decor-1');
      
      expect(renders).toEqual([]);
    });

    it('should include created_at timestamp', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1'],
        renderIds: ['id1'],
      };
      
      const beforeCreate = new Date().toISOString();
      const renders = createOptimisticFromResponse(response, 'photo-1', 'decor-1');
      const afterCreate = new Date().toISOString();
      
      expect(renders[0].created_at).toBeDefined();
      expect(renders[0].created_at >= beforeCreate).toBe(true);
      expect(renders[0].created_at <= afterCreate).toBe(true);
    });

    it('should handle mismatched urls and ids arrays gracefully', () => {
      const response: RenderGenerationResponse = {
        success: true,
        resultUrls: ['url1', 'url2', 'url3'],
        renderIds: ['id1'], // Only one ID
      };
      
      const renders = createOptimisticFromResponse(response, 'photo-1', 'decor-1');
      
      // Should create renders for all URLs, generating temp IDs where needed
      expect(renders.length).toBe(3);
      expect(renders[0].id).toBe('id1');
      expect(renders[1].id).toMatch(/^temp-/);
      expect(renders[2].id).toMatch(/^temp-/);
    });
  });
});

