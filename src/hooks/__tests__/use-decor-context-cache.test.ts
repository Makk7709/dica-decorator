/**
 * @fileoverview Tests TDD pour useDecorContextCache hook
 * Cache du contexte des décors pour éviter les reconstructions inutiles
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * TDD STRICT: Ces tests ont été écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecorContextCache, Decor } from '../use-decor-context-cache';

describe('useDecorContextCache', () => {
  const mockDecors: Decor[] = [
    { id: '1', name: 'Inox Brossé', reference_code: '3020_BN', category: 'metal', usage_contexts: ['ascenseur'], texture_image_url: 'url1' },
    { id: '2', name: 'Chêne Clair', reference_code: '2001_WD', category: 'bois', usage_contexts: ['van'], texture_image_url: 'url2' },
    { id: '3', name: 'Uni Rouge', reference_code: '3178_RD', category: 'unis', usage_contexts: ['ascenseur'], texture_image_url: 'url3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with null context when no decors provided', () => {
      const { result } = renderHook(() => useDecorContextCache([]));
      
      expect(result.current.context).toBeNull();
    });

    it('should build context when decors are provided', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(result.current.context).not.toBeNull();
      expect(typeof result.current.context).toBe('string');
    });
  });

  // ============================================================================
  // CONTEXT BUILDING TESTS
  // ============================================================================

  describe('Context Building', () => {
    it('should include all decor names in context', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(result.current.context).toContain('Inox Brossé');
      expect(result.current.context).toContain('Chêne Clair');
      expect(result.current.context).toContain('Uni Rouge');
    });

    it('should include reference codes in context', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(result.current.context).toContain('3020_BN');
      expect(result.current.context).toContain('2001_WD');
      expect(result.current.context).toContain('3178_RD');
    });

    it('should group decors by category', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(result.current.context).toContain('metal');
      expect(result.current.context).toContain('bois');
      expect(result.current.context).toContain('unis');
    });

    // Note: les `usage_contexts` ont été délibérément exclus du contexte IA
    // (Quick Win QW3 — économie de tokens) car ils sont redondants avec
    // l'instruction métier déjà injectée côté Edge Function.
    it('should NOT include usage_contexts in IA context (token economy QW3)', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));

      expect(result.current.context).not.toContain('ascenseur');
      expect(result.current.context).not.toContain('van');
    });
  });

  // ============================================================================
  // CACHING TESTS
  // ============================================================================

  describe('Caching Behavior', () => {
    it('should not rebuild context when decors reference is the same', () => {
      const buildSpy = vi.fn();
      const { result, rerender } = renderHook(
        ({ decors }) => {
          const hook = useDecorContextCache(decors);
          if (hook.context) buildSpy();
          return hook;
        },
        { initialProps: { decors: mockDecors } }
      );

      const firstContext = result.current.context;
      buildSpy.mockClear();
      
      rerender({ decors: mockDecors });
      
      expect(result.current.context).toBe(firstContext);
    });

    it('should rebuild context when decors change', () => {
      const { result, rerender } = renderHook(
        ({ decors }) => useDecorContextCache(decors),
        { initialProps: { decors: mockDecors } }
      );

      const firstContext = result.current.context;
      
      const newDecors = [...mockDecors, {
        id: '4',
        name: 'Marbre Blanc',
        reference_code: '4001_MB',
        category: 'marbre',
        usage_contexts: ['terrasse'],
        texture_image_url: 'url4'
      }];
      
      rerender({ decors: newDecors });
      
      expect(result.current.context).not.toBe(firstContext);
      expect(result.current.context).toContain('Marbre Blanc');
    });

    it('should provide isCached flag', () => {
      const { result, rerender } = renderHook(
        ({ decors }) => useDecorContextCache(decors),
        { initialProps: { decors: mockDecors } }
      );

      // First render builds the cache
      expect(result.current.isCached).toBe(true);
      
      // Same decors - still cached
      rerender({ decors: mockDecors });
      expect(result.current.isCached).toBe(true);
    });
  });

  // ============================================================================
  // INVALIDATION TESTS
  // ============================================================================

  describe('Cache Invalidation', () => {
    it('should provide invalidate function', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(typeof result.current.invalidate).toBe('function');
    });

    it('should clear cache when invalidate is called', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      const originalContext = result.current.context;
      expect(originalContext).not.toBeNull();
      
      act(() => {
        result.current.invalidate();
      });
      
      // After invalidation, context should be rebuilt
      expect(result.current.isCached).toBe(false);
    });

    it('should rebuild context after invalidation on next access', () => {
      const { result, rerender } = renderHook(
        ({ decors }) => useDecorContextCache(decors),
        { initialProps: { decors: mockDecors } }
      );
      
      act(() => {
        result.current.invalidate();
      });
      
      // Trigger rebuild by rerendering
      rerender({ decors: mockDecors });
      
      expect(result.current.context).not.toBeNull();
    });
  });

  // ============================================================================
  // EMPTY DECORS TESTS
  // ============================================================================

  describe('Empty Decors Handling', () => {
    it('should handle empty array gracefully', () => {
      const { result } = renderHook(() => useDecorContextCache([]));
      
      expect(result.current.context).toBeNull();
      expect(result.current.isCached).toBe(false);
    });

    it('should return fallback message for empty decors', () => {
      const { result } = renderHook(() => useDecorContextCache([]));
      
      expect(result.current.getContextOrFallback()).toContain('Aucun décor');
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should return same reference for cached context', () => {
      const { result, rerender } = renderHook(
        ({ decors }) => useDecorContextCache(decors),
        { initialProps: { decors: mockDecors } }
      );

      const firstRef = result.current.context;
      rerender({ decors: mockDecors });
      const secondRef = result.current.context;
      
      // Same reference = no rebuild
      expect(firstRef).toBe(secondRef);
    });

    it('should compute hash of decors for change detection', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));
      
      expect(result.current.hash).toBeDefined();
      expect(typeof result.current.hash).toBe('string');
    });
  });

  // ============================================================================
  // CONTEXT FORMAT TESTS
  // ============================================================================

  describe('Context Format', () => {
    it('should format context in a structured way (emoji-prefixed sections)', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));

      // Le format actuel utilise des marqueurs emoji pour économiser les
      // tokens et améliorer la robustesse du parsing IA. Les sections
      // attendues sont : références, JSON, catégories.
      expect(result.current.context).toMatch(/RÉFÉRENCES VALIDES/);
      expect(result.current.context).toMatch(/📊 JSON/);
      expect(result.current.context).toMatch(/📂/);
      // CATALOGUE DICA présent en en-tête
      expect(result.current.context).toMatch(/CATALOGUE DICA/);
    });

    // Note: les `texture_image_url` ont été délibérément exclus du contexte IA
    // (Quick Win QW3 — économie de tokens). Les URLs sont passées séparément
    // au modèle de génération d'images, pas au LLM d'orchestration texte.
    it('should NOT include texture URLs in IA context (token economy QW3)', () => {
      const { result } = renderHook(() => useDecorContextCache(mockDecors));

      expect(result.current.context).not.toContain('url1');
      expect(result.current.context).not.toContain('url2');
      expect(result.current.context).not.toContain('url3');
    });
  });
});

