/**
 * Types pour l'export PDF Magazine DECO
 * Style éditorial premium pour DICA DÉCOR
 */

import { PlaquetteProject, PlaquetteDecor, PlaquetteImage } from './plaquette.types';

/**
 * Texte AI généré par l'orchestrateur DICA
 */
export interface MagazineAICaption {
  /** Headline principal couverture (5-12 mots, 2 lignes max) */
  headline: string;
  
  /** Sub-headline éditorial (15-25 mots) */
  subheadline: string;
  
  /** Accroche courte (3-6 mots) style handwritten script */
  slugline: string;
  
  /** Légende éditoriale (10-15 mots) style magazine */
  caption: string;
}

/**
 * Options de génération Magazine DECO
 */
export interface MagazineDecoOptions {
  /** Projet source */
  project: PlaquetteProject;
  
  /** Décor appliqué */
  decor: PlaquetteDecor;
  
  /** Images de rendu */
  images: PlaquetteImage[];
  
  /** Textes AI générés */
  aiCaptions?: MagazineAICaption;
  
  /** Générer les captions AI automatiquement si non fournis */
  generateAICaptions?: boolean;
}

/**
 * Résultat génération Magazine DECO
 */
export interface MagazineDecoResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  pageCount?: number;
  error?: string;
  aiCaptions?: MagazineAICaption;
}

/**
 * Configuration typographie Magazine
 */
export interface MagazineTypography {
  slugline: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  title: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  caption: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    color: string;
  };
  body: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
}

/**
 * Configuration par défaut Magazine DECO
 */
export const MAGAZINE_DECO_CONFIG = {
  typography: {
    slugline: {
      fontFamily: 'Allura',
      fontSize: 24,
      color: '#2C3E50'
    },
    title: {
      fontFamily: 'Playfair Display',
      fontSize: 28,
      color: '#1A1A1A'
    },
    caption: {
      fontFamily: 'Playfair Display',
      fontSize: 11,
      lineHeight: 1.6,
      color: '#4A4A4A'
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 9,
      color: '#666666'
    }
  },
  colors: {
    dicaRed: '#E94E5D',
    accentLine: '#E94E5D',
    textPrimary: '#1A1A1A',
    textSecondary: '#4A4A4A',
    textLight: '#666666'
  },
  margins: {
    top: 22,
    bottom: 22,
    left: 20,
    right: 20
  },
  dpi: 300
} as const;
