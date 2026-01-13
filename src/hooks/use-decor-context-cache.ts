/**
 * @fileoverview useDecorContextCache - Cache du contexte des décors
 * Quick Win QW3: Évite la reconstruction inutile du contexte à chaque message
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import { useState, useMemo, useCallback, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  usage_contexts: string[];
  texture_image_url: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple hash from decors array for change detection
 */
function createDecorsHash(decors: Decor[]): string {
  if (decors.length === 0) return '';
  return decors.map(d => `${d.id}:${d.name}`).join('|');
}

/**
 * Build the decor context string with strict catalog enforcement
 */
function buildDecorContext(decors: Decor[]): string | null {
  if (decors.length === 0) return null;

  const decorsByCategory = decors.reduce((acc, decor) => {
    if (!acc[decor.category]) {
      acc[decor.category] = [];
    }
    acc[decor.category].push(decor);
    return acc;
  }, {} as Record<string, Decor[]>);

  // Build JSON list for validation
  const validRefsJson = decors.map(d => ({
    ref: d.reference_code,
    name: d.name,
    cat: d.category
  }));

  // Collect all valid reference codes
  const allReferences = decors.map(d => d.reference_code);

  let context = `════════════════════════════════════════════════════════════════════
🚨 CATALOGUE DICA - LISTE STRICTE (${decors.length} décors)
════════════════════════════════════════════════════════════════════

📋 RÉFÉRENCES VALIDES (copie exactement):
${allReferences.join('\n')}

📊 JSON:
${JSON.stringify(validRefsJson, null, 2)}

════════════════════════════════════════════════════════════════════
`;

  for (const [category, categoryDecors] of Object.entries(decorsByCategory)) {
    context += `📂 ${category}:\n`;
    for (const decor of categoryDecors) {
      context += `  • "${decor.reference_code}" = ${decor.name}\n`;
    }
    context += '\n';
  }

  context += `⛔ COPIE les références EXACTEMENT. Ne modifie PAS.\n`;

  return context;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDecorContextCache(decors: Decor[]) {
  const [cacheState, setCacheState] = useState<'initial' | 'cached' | 'invalidated'>('initial');
  const lastHashRef = useRef<string>('');

  // Compute hash for change detection
  const currentHash = useMemo(() => createDecorsHash(decors), [decors]);

  // Build context with memoization
  const context = useMemo(() => {
    if (decors.length === 0) return null;
    
    // Update last hash on rebuild
    lastHashRef.current = currentHash;
    
    return buildDecorContext(decors);
  }, [decors, currentHash]);

  // After context is built successfully, mark as cached (only on mount/update, not on invalidate)
  useMemo(() => {
    if (context !== null && cacheState === 'initial') {
      setCacheState('cached');
    }
  }, [context, cacheState]);

  // Cached = state is 'cached'
  const isCached = cacheState === 'cached' && context !== null;

  /**
   * Invalidate the cache to force rebuild
   */
  const invalidate = useCallback(() => {
    lastHashRef.current = '';
    setCacheState('invalidated');
  }, []);

  /**
   * Get context or fallback message
   */
  const getContextOrFallback = useCallback((): string => {
    if (context) return context;
    return 'Aucun décor DICA disponible actuellement.';
  }, [context]);

  return {
    context,
    isCached,
    hash: currentHash,
    invalidate,
    getContextOrFallback,
  };
}

