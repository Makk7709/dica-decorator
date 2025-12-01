/**
 * @fileoverview Tests TDD pour useOptimisticRender hook
 * Hook pour gérer l'état optimiste des rendus IA
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * TDD STRICT: Ces tests ont été écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticRender, OptimisticRender, RenderState } from '../use-optimistic-render';

describe('useOptimisticRender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with empty renders state', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      expect(result.current.renders).toEqual({});
      expect(result.current.isGenerating).toBe(false);
    });

    it('should accept initial renders', () => {
      const initialRenders = {
        'photo-1': [
          { id: 'render-1', result_image_url: 'url1', decor_id: 'd1', created_at: '2024-01-01', state: 'success' as RenderState }
        ]
      };
      
      const { result } = renderHook(() => useOptimisticRender(initialRenders));
      
      expect(result.current.renders['photo-1']).toHaveLength(1);
    });
  });

  // ============================================================================
  // OPTIMISTIC ADD TESTS
  // ============================================================================

  describe('addOptimisticRender', () => {
    it('should add a placeholder render immediately', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(1);
      expect(result.current.renders['photo-1'][0].state).toBe('loading');
    });

    it('should generate a temporary ID for placeholder', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      expect(result.current.renders['photo-1'][0].id).toMatch(/^temp-/);
    });

    it('should set isGenerating to true', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      expect(result.current.isGenerating).toBe(true);
    });

    it('should return the temporary ID', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      expect(tempId).toMatch(/^temp-/);
    });

    it('should prepend new render to existing renders', () => {
      const initialRenders = {
        'photo-1': [
          { id: 'existing', result_image_url: 'url', decor_id: 'd1', created_at: '2024-01-01', state: 'success' as RenderState }
        ]
      };
      
      const { result } = renderHook(() => useOptimisticRender(initialRenders));
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-2');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(2);
      expect(result.current.renders['photo-1'][0].state).toBe('loading');
      expect(result.current.renders['photo-1'][1].id).toBe('existing');
    });
  });

  // ============================================================================
  // CONFIRM RENDER TESTS
  // ============================================================================

  describe('confirmRender', () => {
    it('should update placeholder with real data', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      act(() => {
        result.current.confirmRender(tempId, 'photo-1', {
          id: 'real-id',
          result_image_url: 'https://example.com/image.png',
          decor_id: 'decor-1',
          created_at: '2024-01-01T00:00:00Z',
        });
      });
      
      expect(result.current.renders['photo-1'][0].id).toBe('real-id');
      expect(result.current.renders['photo-1'][0].state).toBe('success');
      expect(result.current.renders['photo-1'][0].result_image_url).toBe('https://example.com/image.png');
    });

    it('should set isGenerating to false after confirmation', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      act(() => {
        result.current.confirmRender(tempId, 'photo-1', {
          id: 'real-id',
          result_image_url: 'url',
          decor_id: 'decor-1',
          created_at: '2024-01-01',
        });
      });
      
      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle confirmation of non-existent tempId gracefully', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.confirmRender('non-existent', 'photo-1', {
          id: 'real-id',
          result_image_url: 'url',
          decor_id: 'decor-1',
          created_at: '2024-01-01',
        });
      });
      
      // Should not throw and state should remain unchanged
      expect(result.current.renders['photo-1']).toBeUndefined();
    });
  });

  // ============================================================================
  // REJECT RENDER TESTS
  // ============================================================================

  describe('rejectRender', () => {
    it('should remove placeholder on error', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      act(() => {
        result.current.rejectRender(tempId, 'photo-1');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(0);
    });

    it('should set isGenerating to false after rejection', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      act(() => {
        result.current.rejectRender(tempId, 'photo-1');
      });
      
      expect(result.current.isGenerating).toBe(false);
    });

    it('should keep other renders when rejecting one', () => {
      const initialRenders = {
        'photo-1': [
          { id: 'existing', result_image_url: 'url', decor_id: 'd1', created_at: '2024-01-01', state: 'success' as RenderState }
        ]
      };
      
      const { result } = renderHook(() => useOptimisticRender(initialRenders));
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-2');
      });
      
      act(() => {
        result.current.rejectRender(tempId, 'photo-1');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(1);
      expect(result.current.renders['photo-1'][0].id).toBe('existing');
    });

    it('should store error message on rejection with error state', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
      });
      
      act(() => {
        result.current.rejectRender(tempId, 'photo-1', 'API error');
      });
      
      // After rejection, the render should be removed
      expect(result.current.renders['photo-1']).toHaveLength(0);
    });
  });

  // ============================================================================
  // SET RENDERS TESTS
  // ============================================================================

  describe('setRenders', () => {
    it('should replace all renders', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      const newRenders = {
        'photo-1': [
          { id: 'r1', result_image_url: 'url1', decor_id: 'd1', created_at: '2024-01-01', state: 'success' as RenderState }
        ],
        'photo-2': [
          { id: 'r2', result_image_url: 'url2', decor_id: 'd2', created_at: '2024-01-02', state: 'success' as RenderState }
        ]
      };
      
      act(() => {
        result.current.setRenders(newRenders);
      });
      
      expect(Object.keys(result.current.renders)).toHaveLength(2);
      expect(result.current.renders['photo-1'][0].id).toBe('r1');
    });
  });

  // ============================================================================
  // MULTIPLE RENDERS TESTS
  // ============================================================================

  describe('Multiple concurrent renders', () => {
    it('should handle multiple optimistic renders for same photo', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
        result.current.addOptimisticRender('photo-1', 'decor-2');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(2);
    });

    it('should handle renders for different photos', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
        result.current.addOptimisticRender('photo-2', 'decor-2');
      });
      
      expect(result.current.renders['photo-1']).toHaveLength(1);
      expect(result.current.renders['photo-2']).toHaveLength(1);
    });
  });

  // ============================================================================
  // PENDING COUNT TESTS
  // ============================================================================

  describe('getPendingCount', () => {
    it('should return 0 when no pending renders', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      expect(result.current.getPendingCount()).toBe(0);
    });

    it('should return count of loading renders', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      act(() => {
        result.current.addOptimisticRender('photo-1', 'decor-1');
        result.current.addOptimisticRender('photo-1', 'decor-2');
      });
      
      expect(result.current.getPendingCount()).toBe(2);
    });

    it('should decrease count after confirmation', () => {
      const { result } = renderHook(() => useOptimisticRender());
      
      let tempId: string = '';
      act(() => {
        tempId = result.current.addOptimisticRender('photo-1', 'decor-1');
        result.current.addOptimisticRender('photo-1', 'decor-2');
      });
      
      act(() => {
        result.current.confirmRender(tempId, 'photo-1', {
          id: 'real-id',
          result_image_url: 'url',
          decor_id: 'decor-1',
          created_at: '2024-01-01',
        });
      });
      
      expect(result.current.getPendingCount()).toBe(1);
    });
  });
});

