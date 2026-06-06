/**
 * Types partagés de la page ProjectDetail et de ses sous-composants.
 * Extraits de `src/pages/ProjectDetail.tsx` (LOT 4 — réduction de complexité).
 * Le comportement et les formes de données restent inchangés.
 */

export interface Project {
  id: string;
  title: string;
  use_case: string;
  client_reference: string | null;
}

export interface ProjectPhoto {
  id: string;
  original_image_url: string;
  created_at: string;
}

export interface Decor {
  id: string;
  name: string;
  reference_code: string;
  texture_image_url: string;
  usage_contexts: string[];
  category: string;
}

export interface RenderResult {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
}

/** Création de l'assistant IA (sans décor associé). */
export interface CreativeImport {
  id: string;
  result_image_url: string;
  created_at: string;
  photoId: string;
}

/** Map des rendus indexés par identifiant de photo. */
export type RendersByPhoto = Record<string, RenderResult[]>;

/** Ligne brute renvoyée par la table `render_results`. */
export interface RenderResultRow {
  id: string;
  result_image_url: string;
  decor_id: string | null;
  created_at: string;
  project_photo_id: string;
}

/** Description du mode de comparaison avant/après. */
export interface ComparisonState {
  before: string;
  after: string;
  decorName?: string;
  decorCode?: string;
}

export type RenderFormat = "square" | "portrait" | "landscape" | "original";
