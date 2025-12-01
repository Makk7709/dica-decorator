/**
 * @fileoverview Types pour le générateur de Magazine DICA (Version refondue)
 * Structure éditoriale complète d'un magazine déco haut de gamme
 * avec thème personnalisé et sélection d'images
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

// ============================================================================
// Types de base - Entrées
// ============================================================================

/**
 * Image sélectionnée pour le magazine (projet ou rendu IA)
 */
export interface SelectedImage {
  id: string;
  url: string; // URL de l'image
  type: 'project_photo' | 'render' | 'creative'; // Type d'image
  projectId?: string; // ID du projet si applicable
  projectName?: string; // Nom du projet
  decorId?: string; // ID du décor si c'est un rendu
  decorName?: string; // Nom du décor
  decorCode?: string; // Code du décor
  decorTextureUrl?: string; // URL de la texture du décor
  usage?: string; // Usage (van, ascenseur, etc.)
}

/**
 * Décors utilisés dans le magazine avec informations complètes
 */
export interface DecorInfo {
  id: string;
  nom: string;
  code: string; // Référence catalogue exacte
  famille: 'bois' | 'metal' | 'pierre' | 'uni' | 'deco';
  effet?: string; // 'brossé', 'brillant', 'mat', 'texturé', etc.
  texture_image_url?: string;
  color_hex?: string; // Couleur hexadécimale pour affichage RAL
}

/**
 * Options de génération du magazine
 */
export interface MagazineGenerationOptions {
  theme: string; // Thème personnalisé (ex: "les escapades en van", "la remontée luxe d'ascenseur")
  coverImage: SelectedImage; // Image de couverture
  zoomImages: SelectedImage[]; // Images pour pages Zoom Produit (2-3 images)
  decors: DecorInfo[]; // Tous les décors utilisés dans le magazine
  min_zoom_pages?: number; // Minimum de pages Zoom Produit
  max_zoom_pages?: number; // Maximum de pages Zoom Produit
}

/**
 * Description d'échantillon pour un décor
 */
export interface EchantillonDescription {
  decor_id: string;
  decor_nom: string;
  decor_code: string;
  description_courte: string; // Max 8 mots
  color_hex?: string; // Couleur pour affichage RAL
}

// ============================================================================
// Types de pages du magazine
// ============================================================================

export type PageType = 
  | 'cover'
  | 'editorial_intro'
  | 'zoom_product'
  | 'closing';

/**
 * Bloc références décors avec décors utilisés
 */
export interface DecorsBloc {
  titre: 'Décors DICA utilisés' | 'Palette DICA';
  decors: Array<{
    id: string;
    nom: string;
    code: string;
    famille: string;
    effet?: string;
    color_hex?: string;
    texture_image_url?: string;
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
  id_image_principale: string;
  titre: string;
  sous_titre?: string;
  phrase_calligraphie?: string;
  theme: string; // Thème du magazine
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Editorial Intro avec texte IA basé sur le thème
 */
export interface EditorialIntroPage {
  type_page: 'editorial_intro';
  id_image_principale: string | null;
  titre: string;
  sous_titre?: string;
  texte_court: string; // Texte généré par IA basé sur le thème (expert stratifié/storytelling)
  theme: string; // Thème du magazine
  decors_utilises: DecorsBloc;
  echantillons: EchantillonsBloc;
}

/**
 * Page de type Zoom Produit
 */
export interface ZoomProductPage {
  type_page: 'zoom_product';
  id_image_principale: string;
  phrase_calligraphie: string; // Commentaire court généré par IA
  texte_court?: string; // Texte éditorial optionnel
  theme: string; // Thème du magazine
  projectInfo?: {
    projectId?: string;
    projectName?: string;
  };
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
  theme: string; // Thème du magazine
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
  | ClosingPage;

// ============================================================================
// Structure complète du magazine
// ============================================================================

/**
 * Structure complète d'un magazine DICA généré
 */
export interface MagazineDICA {
  titre_magazine: string;
  theme: string; // Thème personnalisé du magazine
  numero?: string;
  date_publication: string;
  pages: MagazinePage[];
  decors_utilises_total: DecorInfo[]; // Tous les décors utilisés dans le magazine
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
  warnings?: string[]; // Avertissements (ex: pas assez d'images, etc.)
}
