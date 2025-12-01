/**
 * @fileoverview Types pour le générateur de Magazine DICA
 * Structure éditoriale complète d'un magazine déco haut de gamme
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

// ============================================================================
// Types de base - Entrées
// ============================================================================

/**
 * Métadonnées d'un rendu IA pour la génération de magazine
 */
export interface RenderMetadata {
  id_image: string;
  usage: 'ascenseur' | 'van' | 'terrasse' | 'showroom' | 'bureau' | 'autre';
  ambiances: string[]; // e.g. ['urbaine', 'naturelle', 'industrielle', 'luxe']
  decors: DecorInfo[];
  image_url?: string; // URL de l'image pour affichage
  created_at?: string;
}

/**
 * Informations d'un décor DICA utilisé dans un rendu
 */
export interface DecorInfo {
  id: string;
  nom: string;
  code: string; // Référence catalogue exacte
  famille: 'bois' | 'metal' | 'pierre' | 'uni' | 'deco';
  effet?: string; // 'brossé', 'brillant', 'mat', 'texturé', etc.
  texture_image_url?: string;
}

/**
 * Description d'échantillon pour un décor
 */
export interface EchantillonDescription {
  decor_id: string;
  decor_nom: string;
  decor_code: string;
  description_courte: string; // Max 8 mots, style "Sauge boisée, mate, chaleureuse."
}

// ============================================================================
// Types de pages du magazine
// ============================================================================

export type PageType = 
  | 'cover'
  | 'editorial_intro'
  | 'zoom_product'
  | 'avant_apres'
  | 'story_use_case'
  | 'closing';

/**
 * Bloc références décors obligatoire sur toutes les pages
 */
export interface DecorsBloc {
  titre: 'Décors DICA utilisés' | 'Décors à l\'honneur dans ce numéro';
  decors: Array<{
    nom: string;
    code: string;
    famille: string;
    effet?: string;
  }>;
}

/**
 * Bloc échantillons avec descriptions courtes
 */
export interface EchantillonsBloc {
  echantillons: EchantillonDescription[];
}

/**
 * Page de type Cover
 */
export interface CoverPage {
  type_page: 'cover';
  id_image_principale: string | null;
  titre: string;
  sous_titre?: string;
  phrase_calligraphie?: string;
  texte_court?: string;
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Editorial Intro
 */
export interface EditorialIntroPage {
  type_page: 'editorial_intro';
  id_image_principale: string | null;
  titre: string;
  sous_titre?: string;
  texte_court: string; // 3-5 phrases
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Zoom Produit
 */
export interface ZoomProductPage {
  type_page: 'zoom_product';
  id_image_principale: string; // OBLIGATOIRE, image en pleine page
  phrase_calligraphie: string; // OBLIGATOIRE, max 12 mots, style ivoire calligraphie
  texte_court?: string; // 3-5 phrases optionnelles
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Avant/Après
 */
export interface AvantApresPage {
  type_page: 'avant_apres';
  id_image_avant: string;
  id_image_apres: string;
  titre: string;
  sous_titre?: string;
  texte_court: string;
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Story Use Case
 */
export interface StoryUseCasePage {
  type_page: 'story_use_case';
  id_image_principale: string | null;
  titre: string;
  sous_titre?: string;
  texte_court: string;
  usage_metier: string; // 'revendeur', 'chantier', 'van', etc.
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Closing
 */
export interface ClosingPage {
  type_page: 'closing';
  id_image_principale: string | null;
  titre: string;
  texte_court: string;
  call_to_action?: string;
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Union type pour toutes les pages possibles
 */
export type MagazinePage = 
  | CoverPage
  | EditorialIntroPage
  | ZoomProductPage
  | AvantApresPage
  | StoryUseCasePage
  | ClosingPage;

// ============================================================================
// Structure complète du magazine
// ============================================================================

/**
 * Structure complète d'un magazine DICA généré
 */
export interface MagazineDICA {
  titre_magazine: string;
  numero?: string;
  date_publication: string;
  pages: MagazinePage[];
  decors_utilises_total: DecorInfo[]; // Tous les décors utilisés dans le magazine
}

// ============================================================================
// Options de génération
// ============================================================================

/**
 * Options pour la génération du magazine
 */
export interface MagazineGenerationOptions {
  renders: RenderMetadata[];
  min_zoom_pages?: number; // Minimum de pages Zoom Produit (défaut: 2)
  max_zoom_pages?: number; // Maximum de pages Zoom Produit (défaut: 6)
  inclure_avant_apres?: boolean; // Inclure des pages avant/après si disponibles
  inclure_story_use_case?: boolean; // Inclure des pages story use case
  style_editorial?: 'luxe' | 'contemporain' | 'nature' | 'industriel';
}

// ============================================================================
// Résultat de génération
// ============================================================================

/**
 * Résultat de la génération du magazine
 */
export interface MagazineGenerationResult {
  success: boolean;
  magazine?: MagazineDICA;
  error?: string;
  warnings?: string[]; // Avertissements (ex: pas assez de rendus, etc.)
}

