/**
 * @fileoverview Types pour la génération de plaquettes PDF DICA DÉCOR
 * avec support co-branding revendeurs
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

// ============================================================================
// Reseller Branding Types
// ============================================================================

/**
 * Configuration du branding revendeur pour le co-branding PDF
 */
export interface ResellerBranding {
  /** Indique si le co-branding est activé pour ce revendeur */
  enabled: boolean;
  
  /** Nom de la société revendeur */
  companyName: string;
  
  /** URL du logo revendeur (optionnel) */
  logoUrl?: string;
  
  /** Nom du contact principal */
  contactName?: string;
  
  /** Numéro de téléphone */
  phone?: string;
  
  /** Adresse email */
  email?: string;
  
  /** Site web */
  website?: string;
  
  /** Première ligne d'adresse */
  addressLine1?: string;
  
  /** Deuxième ligne d'adresse (optionnel) */
  addressLine2?: string;
  
  /** Ville */
  city?: string;
  
  /** Code postal */
  postalCode?: string;
  
  /** Pays */
  country?: string;
  
  /** Couleur d'accent personnalisée (hex) */
  accentColorHex?: string;
  
  /** Numéro SIRET (optionnel) */
  siret?: string;
  
  /** Slogan ou tagline du revendeur */
  tagline?: string;
}

/**
 * Résultat de validation du branding revendeur
 */
export interface ResellerBrandingValidation {
  isValid: boolean;
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
}

// ============================================================================
// App Settings Types
// ============================================================================

/**
 * Paramètres globaux de l'application pour le PDF
 */
export interface AppSettings {
  /** Active/désactive le co-branding revendeurs au niveau global */
  resellerBrandingEnabled: boolean;
  
  /** Qualité d'image par défaut (0-100) */
  defaultImageQuality: number;
  
  /** Résolution minimale des images (px) */
  minImageResolution: number;
  
  /** Afficher le disclaimer légal */
  showDisclaimer: boolean;
  
  /** Texte du disclaimer personnalisé */
  customDisclaimer?: string;
  
  /** Format de date préféré */
  dateFormat: 'short' | 'long' | 'full';
  
  /** Inclure QR code vers le projet */
  includeQRCode: boolean;
  
  /** Version du template PDF */
  templateVersion: string;
}

/**
 * Configuration par défaut des paramètres
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  resellerBrandingEnabled: false,
  defaultImageQuality: 90,
  minImageResolution: 1600,
  showDisclaimer: true,
  customDisclaimer: undefined,
  dateFormat: 'long',
  includeQRCode: false,
  templateVersion: '1.0.0',
};

// ============================================================================
// Project & Decor Types (pour le PDF)
// ============================================================================

/**
 * Informations projet pour la plaquette
 */
export interface PlaquetteProject {
  id: string;
  name: string;
  type: ProjectType;
  clientName?: string;
  clientRef?: string;
  createdAt: Date;
  updatedAt?: Date;
  description?: string;
  location?: string;
}

/**
 * Types de projets supportés
 */
export type ProjectType = 
  | 'ascenseur'
  | 'restaurant'
  | 'hotel'
  | 'ecole'
  | 'hopital'
  | 'bureau'
  | 'van'
  | 'cuisine'
  | 'salle_de_bain'
  | 'commerce'
  | 'autre';

/**
 * Labels français pour les types de projets
 */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  ascenseur: 'Ascenseur',
  restaurant: 'Restaurant',
  hotel: 'Hôtel',
  ecole: 'École',
  hopital: 'Hôpital',
  bureau: 'Bureau',
  van: 'Van aménagé',
  cuisine: 'Cuisine',
  salle_de_bain: 'Salle de bain',
  commerce: 'Commerce',
  autre: 'Autre',
};

/**
 * Informations décor pour la plaquette
 */
export interface PlaquetteDecor {
  id: string;
  name: string;
  referenceCode: string;
  collection?: string;
  finish?: string;
  category?: string;
  colorFamily?: string;
  textureUrl?: string;
  description?: string;
}

/**
 * Image de rendu pour la plaquette
 */
export interface PlaquetteImage {
  id: string;
  url: string;
  originalUrl?: string;
  decorId: string;
  decorName: string;
  decorCode: string;
  width?: number;
  height?: number;
  createdAt: Date;
  isHighResolution: boolean;
  isFavorite?: boolean;
}

// ============================================================================
// PDF Generation Types
// ============================================================================

/**
 * Options de génération de la plaquette
 */
export interface PlaquetteGenerationOptions {
  /** Projet source */
  project: PlaquetteProject;
  
  /** Décor(s) appliqué(s) */
  decors: PlaquetteDecor[];
  
  /** Images de rendu */
  images: PlaquetteImage[];
  
  /** Branding revendeur (optionnel) */
  resellerBranding?: ResellerBranding | null;
  
  /** Paramètres de l'application */
  appSettings: AppSettings;
  
  /** Image originale (avant décor) pour comparaison */
  originalImage?: string;
  
  /** Inclure la comparaison avant/après */
  includeComparison?: boolean;
  
  /** Notes personnalisées */
  notes?: string;
  
  /** Coordonnées de contact DICA */
  dicaContact?: DicaContactInfo;
}

/**
 * Coordonnées DICA France
 */
export interface DicaContactInfo {
  companyName: string;
  website: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Configuration DICA par défaut
 */
export const DEFAULT_DICA_CONTACT: DicaContactInfo = {
  companyName: 'DICA France',
  website: 'www.dica-france.com',
  email: 'contact@dica-france.com',
};

/**
 * Résultat de génération du PDF
 */
export interface PlaquetteGenerationResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  pageCount?: number;
  error?: string;
  warnings?: string[];
  metadata?: PlaquetteMetadata;
}

/**
 * Métadonnées du PDF généré
 */
export interface PlaquetteMetadata {
  title: string;
  author: string;
  subject: string;
  creator: string;
  createdAt: Date;
  templateVersion: string;
  isCoBranded: boolean;
  resellerName?: string;
}

// ============================================================================
// Layout Types
// ============================================================================

/**
 * Type de layout du PDF
 */
export type PlaquetteLayoutType = 'fullDica' | 'coBranded';

/**
 * Configuration du layout
 */
export interface PlaquetteLayoutConfig {
  type: PlaquetteLayoutType;
  
  /** Marges en mm */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  /** Hauteur du header en mm */
  headerHeight: number;
  
  /** Hauteur du footer en mm */
  footerHeight: number;
  
  /** Espace pour le bloc revendeur en mm (si coBranded) */
  resellerBlockHeight: number;
  
  /** Ratio d'image principal (largeur / zone contenu) */
  imageWidthRatio: number;
  
  /** Couleur primaire */
  primaryColor: string;
  
  /** Couleur secondaire */
  secondaryColor: string;
}

/**
 * Layout par défaut Full DICA
 */
export const FULL_DICA_LAYOUT: PlaquetteLayoutConfig = {
  type: 'fullDica',
  margins: { top: 15, bottom: 15, left: 15, right: 15 },
  headerHeight: 25,
  footerHeight: 20,
  resellerBlockHeight: 0,
  imageWidthRatio: 0.8,
  primaryColor: '#E94E5D',
  secondaryColor: '#333333',
};

/**
 * Layout par défaut Co-Branded
 */
export const CO_BRANDED_LAYOUT: PlaquetteLayoutConfig = {
  type: 'coBranded',
  margins: { top: 10, bottom: 15, left: 15, right: 15 },
  headerHeight: 15,
  footerHeight: 25,
  resellerBlockHeight: 35,
  imageWidthRatio: 0.75,
  primaryColor: '#E94E5D',
  secondaryColor: '#333333',
};

// ============================================================================
// Validation & Error Types
// ============================================================================

/**
 * Codes d'erreur pour la génération de plaquette
 */
export enum PlaquetteErrorCode {
  INVALID_PROJECT = 'INVALID_PROJECT',
  INVALID_DECOR = 'INVALID_DECOR',
  NO_IMAGES = 'NO_IMAGES',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL',
  INVALID_RESELLER_BRANDING = 'INVALID_RESELLER_BRANDING',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  INCOMPLETE_DATA = 'INCOMPLETE_DATA',
}

/**
 * Erreur de génération de plaquette
 */
export class PlaquetteError extends Error {
  constructor(
    message: string,
    public code: PlaquetteErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlaquetteError';
  }
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Événements de progression de génération
 */
export interface PlaquetteProgressEvent {
  stage: 'validating' | 'loading_images' | 'generating' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

/**
 * Callback de progression
 */
export type PlaquetteProgressCallback = (event: PlaquetteProgressEvent) => void;

