/**
 * @fileoverview useOptimisticRender - Hook pour gérer l'état optimiste des rendus IA
 * Quick Win QW2: Améliore le feedback utilisateur avec des placeholders immédiats
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type RenderState = 'loading' | 'success' | 'error';

export interface OptimisticRender {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
  state: RenderState;
  error?: string;
}

export type RendersByPhoto = {
  [photoId: string]: OptimisticRender[];
};

export interface ConfirmRenderData {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useOptimisticRender(initialRenders: RendersByPhoto = {}) {
  const [renders, setRendersState] = useState<RendersByPhoto>(initialRenders);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Add an optimistic placeholder render
   * Returns the temporary ID for tracking
   */
  const addOptimisticRender = useCallback((photoId: string, decorId: string): string => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const placeholder: OptimisticRender = {
      id: tempId,
      result_image_url: '', // Empty for loading state
      decor_id: decorId,
      created_at: new Date().toISOString(),
      state: 'loading',
    };

    setRendersState(prev => ({
      ...prev,
      [photoId]: [placeholder, ...(prev[photoId] || [])],
    }));

    setIsGenerating(true);
    return tempId;
  }, []);

  /**
   * Confirm render with real data from API
   */
  const confirmRender = useCallback((
    tempId: string,
    photoId: string,
    data: ConfirmRenderData
  ) => {
    setRendersState(prev => {
      const photoRenders = prev[photoId];
      if (!photoRenders) return prev;

      return {
        ...prev,
        [photoId]: photoRenders.map(render =>
          render.id === tempId
            ? {
                ...render,
                id: data.id,
                result_image_url: data.result_image_url,
                decor_id: data.decor_id,
                created_at: data.created_at,
                state: 'success' as RenderState,
              }
            : render
        ),
      };
    });

    setIsGenerating(false);
  }, []);

  /**
   * Reject/remove render on error
   */
  const rejectRender = useCallback((
    tempId: string,
    photoId: string,
    _errorMessage?: string
  ) => {
    setRendersState(prev => {
      const photoRenders = prev[photoId];
      if (!photoRenders) return prev;

      return {
        ...prev,
        [photoId]: photoRenders.filter(render => render.id !== tempId),
      };
    });

    setIsGenerating(false);
  }, []);

  /**
   * Replace all renders (for full reload)
   */
  const setRenders = useCallback((newRenders: RendersByPhoto) => {
    setRendersState(newRenders);
  }, []);

  /**
   * Get count of pending (loading) renders
   */
  const getPendingCount = useCallback((): number => {
    return Object.values(renders).flat().filter(r => r.state === 'loading').length;
  }, [renders]);

  return {
    renders,
    isGenerating,
    addOptimisticRender,
    confirmRender,
    rejectRender,
    setRenders,
    getPendingCount,
  };
}

