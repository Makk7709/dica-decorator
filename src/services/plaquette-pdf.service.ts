/**
 * @fileoverview PlaquettePdfService - Service de génération de plaquettes PDF DICA DÉCOR
 * 
 * Librairie PDF: jsPDF
 * Mode de rendu: Direct PDF generation avec support images base64
 * 
 * Fonctionnalités:
 * - Layout premium A4 portrait
 * - Co-branding revendeurs (toggle admin)
 * - Images haute résolution
 * - Multi-page support
 * - Comparaison avant/après
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import {
  ResellerBranding,
  ResellerBrandingValidation,
  AppSettings,
  PlaquetteProject,
  PlaquetteDecor,
  PlaquetteImage,
  PlaquetteGenerationOptions,
  PlaquetteGenerationResult,
  PlaquetteLayoutConfig,
  PlaquetteLayoutType,
  PlaquetteErrorCode,
  PlaquetteError,
  PlaquetteMetadata,
  PlaquetteProgressCallback,
  PlaquetteProgressEvent,
  DEFAULT_APP_SETTINGS,
  FULL_DICA_LAYOUT,
  CO_BRANDED_LAYOUT,
  DEFAULT_DICA_CONTACT,
  PROJECT_TYPE_LABELS,
  ProjectType,
} from '../types/plaquette.types';

// ============================================================================
// Types internes
// ============================================================================

interface ServiceConfig {
  pageSize: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  dicaBranding: {
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    website: string;
    tagline: string;
  };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

interface ImageResolutionCheck {
  isHighResolution: boolean;
  warning?: string;
  recommendedWidth?: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface PageDimensions {
  width: number;
  height: number;
}

interface HeaderContent {
  logoPosition: 'left' | 'center' | 'right';
  companyName: string;
  tagline: string;
  dicaStripText?: string;
  dicaStripHeight?: number;
}

interface FooterContent {
  companyInfo: string;
  website: string;
  disclaimer: string;
  showPageNumbers: boolean;
  coBrandingAttribution?: string;
}

interface ProjectBlockContent {
  title: string;
  type: string;
  date: string;
  clientName?: string;
  clientRef?: string;
  location?: string;
}

interface ImageBlockContent {
  imageUrl: string;
  decorName: string;
  decorCode: string;
  collection?: string;
  finish?: string;
  description?: string;
}

interface ResellerBlockContent {
  companyName: string;
  logoUrl?: string;
  showNameInsteadOfLogo: boolean;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  accentColor?: string;
  tagline?: string;
}

interface ComparisonBlockContent {
  originalImage: string;
  renderedImage: string;
  layout: 'side-by-side' | 'stacked';
}

// V2 Premium Types
interface ImageDimensionsWithPosition extends ImageDimensions {
  x: number;
  y?: number;
}

interface LoadedImageData {
  base64: string;
  width: number;
  height: number;
  aspectRatio: number;
}

interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

interface BorderConfig {
  width: number;
  color: string;
  radius: number;
}

interface ColorBadge {
  text: string;
  backgroundColor: string;
  textColor: string;
}

interface HeaderBannerConfig {
  height: number;
  primaryColor: string;
  gradientEnd: string;
}

interface ComparisonLayout {
  leftImage: { x: number; y: number; width: number; height: number };
  rightImage: { x: number; y: number; width: number; height: number };
  labels: { before: string; after: string };
  y: number;
  gap: number;
}

interface ComparisonPageContent {
  enabled: boolean;
  originalImage?: string;
  renderedImage?: string;
  decorReference?: string;
  decorName?: string;
}

interface CoverPageContent {
  title: string;
  projectType: string;
  decorCount: number;
  imageCount: number;
  clientName?: string;
  date: string;
}

interface EnhancedImageBlock extends ImageBlockContent {
  colorBadge?: ColorBadge;
  commercialComment?: string;
  showTextureSwatch: boolean;
}

interface EnhancedHeaderContent extends HeaderContent {
  hasBanner: boolean;
  bannerConfig?: HeaderBannerConfig;
}

interface EnhancedFooterContent extends FooterContent {
  premiumStyle: boolean;
  showDicaLogo: boolean;
}

interface GeneratedContentV2 {
  version: number;
  header: EnhancedHeaderContent;
  footer: EnhancedFooterContent;
  projectBlock: ProjectBlockContent;
  imageBlocks: EnhancedImageBlock[];
  resellerBlock?: ResellerBlockContent;
  comparisonPage?: ComparisonPageContent;
  coverPage?: CoverPageContent;
  totalPages: number;
}

interface GeneratedContent {
  header: HeaderContent;
  footer: FooterContent;
  projectBlock: ProjectBlockContent;
  imageBlocks: ImageBlockContent[];
  resellerBlock?: ResellerBlockContent;
  comparisonBlock?: ComparisonBlockContent;
  totalPages: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class PlaquettePdfService {
  private config: ServiceConfig;
  private errorListeners: Array<(error: PlaquetteError) => void> = [];

  // Page sizes in points (72 points = 1 inch)
  private static readonly PAGE_SIZES: Record<string, PageDimensions> = {
    A4: { width: 595.28, height: 841.89 },
    A3: { width: 841.89, height: 1190.55 },
    Letter: { width: 612, height: 792 },
  };

  constructor() {
    this.config = {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
      dicaBranding: {
        companyName: 'DICA France',
        primaryColor: '#E94E5D',
        secondaryColor: '#333333',
        website: 'www.dica-france.com',
        tagline: 'Projection de décors stratifiés',
      },
    };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): ServiceConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  // --------------------------------------------------------------------------
  // Reseller Branding Validation
  // --------------------------------------------------------------------------

  validateResellerBranding(branding: ResellerBranding | null): ResellerBrandingValidation {
    if (branding === null) {
      return {
        isValid: true,
        isComplete: false,
        missingFields: ['all'],
        warnings: [],
      };
    }

    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required field
    if (!branding.companyName || branding.companyName.trim() === '') {
      missingFields.push('companyName');
    }

    // Check optional fields
    if (!branding.logoUrl) missingFields.push('logoUrl');
    if (!branding.email) missingFields.push('email');
    if (!branding.phone) missingFields.push('phone');
    if (!branding.website) missingFields.push('website');
    if (!branding.contactName) missingFields.push('contactName');
    if (!branding.addressLine1) missingFields.push('addressLine1');
    if (!branding.city) missingFields.push('city');

    // Validate formats
    if (branding.accentColorHex && !this.isValidHexColor(branding.accentColorHex)) {
      warnings.push('invalid_accent_color');
    }

    if (branding.email && !this.isValidEmail(branding.email)) {
      warnings.push('invalid_email_format');
    }

    if (branding.phone && !this.isValidPhone(branding.phone)) {
      warnings.push('invalid_phone_format');
    }

    if (branding.website && !this.isValidWebsite(branding.website)) {
      warnings.push('invalid_website_format');
    }

    if (branding.enabled === false) {
      warnings.push('branding_disabled');
    }

    const isValid = !missingFields.includes('companyName');
    const isComplete = missingFields.length === 0;

    return { isValid, isComplete, missingFields, warnings };
  }

  private isValidHexColor(color: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    return /^[+\d\s()-]{6,}$/.test(phone);
  }

  private isValidWebsite(website: string): boolean {
    return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(website);
  }

  // --------------------------------------------------------------------------
  // Layout Determination
  // --------------------------------------------------------------------------

  determineLayout(options: PlaquetteGenerationOptions): PlaquetteLayoutConfig {
    const { appSettings, resellerBranding } = options;

    // Check if co-branding should be used
    const shouldUseCoBranding = 
      appSettings.resellerBrandingEnabled &&
      resellerBranding !== null &&
      resellerBranding !== undefined &&
      resellerBranding.enabled &&
      this.validateResellerBranding(resellerBranding).isValid;

    if (shouldUseCoBranding) {
      const layout = { ...CO_BRANDED_LAYOUT };
      
      // Use reseller accent color if provided and valid
      if (resellerBranding?.accentColorHex && this.isValidHexColor(resellerBranding.accentColorHex)) {
        layout.secondaryColor = resellerBranding.accentColorHex;
      }
      
      return layout;
    }

    return { ...FULL_DICA_LAYOUT };
  }

  // --------------------------------------------------------------------------
  // Validation Methods
  // --------------------------------------------------------------------------

  validateGenerationOptions(options: PlaquetteGenerationOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate project
    if (!options.project.name || options.project.name.trim() === '') {
      errors.push('project_name_required');
    }

    // Validate images
    if (!options.images || options.images.length === 0) {
      errors.push('images_required');
    }

    // Validate decors
    if (!options.decors || options.decors.length === 0) {
      errors.push('decors_required');
    }

    // Check image resolution
    options.images?.forEach((image) => {
      if (image.width && image.height) {
        const check = this.checkImageResolution(
          image.width,
          image.height,
          options.appSettings.minImageResolution
        );
        if (!check.isHighResolution) {
          warnings.push('low_resolution_image');
        }
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------------------------
  // Content Generation
  // --------------------------------------------------------------------------

  generateContent(options: PlaquetteGenerationOptions): GeneratedContent {
    const layout = this.determineLayout(options);
    const isCoBranded = layout.type === 'coBranded';

    // Header content
    const header: HeaderContent = {
      logoPosition: 'left',
      companyName: this.config.dicaBranding.companyName,
      tagline: this.config.dicaBranding.tagline,
    };

    if (isCoBranded) {
      header.dicaStripText = 'App DICA DÉCOR';
      header.dicaStripHeight = 10;
    }

    // Footer content
    const footer: FooterContent = {
      companyInfo: `${this.config.dicaBranding.companyName}`,
      website: this.config.dicaBranding.website,
      disclaimer: 'Visuel non contractuel',
      showPageNumbers: true,
    };

    if (isCoBranded && options.resellerBranding) {
      footer.coBrandingAttribution = `Plaquette générée par l'app DICA DÉCOR pour le compte de : ${options.resellerBranding.companyName}`;
    }

    // Project block
    const projectBlock: ProjectBlockContent = {
      title: options.project.name,
      type: this.getProjectTypeLabel(options.project.type),
      date: this.formatDateFr(options.project.createdAt, options.appSettings.dateFormat),
      clientName: options.project.clientName,
      clientRef: options.project.clientRef,
      location: options.project.location,
    };

    // Image blocks
    const imageBlocks: ImageBlockContent[] = options.images.map((image, index) => {
      const decor = options.decors.find(d => d.id === image.decorId) || options.decors[0];
      return {
        imageUrl: image.url,
        decorName: image.decorName || decor?.name || '',
        decorCode: image.decorCode || decor?.referenceCode || '',
        collection: decor?.collection,
        finish: decor?.finish,
        description: decor?.description,
      };
    });

    // Reseller block (only if co-branded)
    let resellerBlock: ResellerBlockContent | undefined;
    if (isCoBranded && options.resellerBranding) {
      const rb = options.resellerBranding;
      resellerBlock = {
        companyName: rb.companyName,
        logoUrl: rb.logoUrl,
        showNameInsteadOfLogo: !rb.logoUrl,
        email: rb.email,
        phone: rb.phone,
        website: rb.website,
        address: [rb.addressLine1, rb.addressLine2, rb.city, rb.postalCode, rb.country]
          .filter(Boolean)
          .join(', '),
        accentColor: rb.accentColorHex,
        tagline: rb.tagline,
      };
    }

    // Comparison block (if requested and original image provided)
    let comparisonBlock: ComparisonBlockContent | undefined;
    if (options.includeComparison && options.originalImage && options.images.length > 0) {
      comparisonBlock = {
        originalImage: options.originalImage,
        renderedImage: options.images[0].url,
        layout: 'side-by-side',
      };
    }

    // Calculate total pages
    const totalPages = Math.max(1, options.images.length);

    return {
      header,
      footer,
      projectBlock,
      imageBlocks,
      resellerBlock,
      comparisonBlock,
      totalPages,
    };
  }

  // --------------------------------------------------------------------------
  // Image Handling
  // --------------------------------------------------------------------------

  calculateImageDimensions(
    imageWidth: number,
    imageHeight: number,
    pageSize: 'A4' | 'A3' | 'Letter',
    widthRatio: number
  ): ImageDimensions {
    const pageDims = this.getPageDimensionsPt(pageSize, 'portrait');
    const marginsPt = this.mmToPoints(this.config.margins.left + this.config.margins.right);
    const maxWidth = (pageDims.width - marginsPt) * widthRatio;
    
    // Calculate scaling factor
    const aspectRatio = imageWidth / imageHeight;
    let width = maxWidth;
    let height = width / aspectRatio;
    
    // Check if height exceeds available space (roughly 60% of page height for image)
    const maxHeight = pageDims.height * 0.5;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width, height };
  }

  checkImageResolution(
    width: number,
    height: number,
    minResolution: number
  ): ImageResolutionCheck {
    const maxDimension = Math.max(width, height);
    const isHighResolution = maxDimension >= minResolution;

    if (!isHighResolution) {
      return {
        isHighResolution: false,
        warning: 'image_below_minimum_resolution',
        recommendedWidth: minResolution,
      };
    }

    return { isHighResolution: true };
  }

  getContentWidth(pageSize: 'A4' | 'A3' | 'Letter', layout: PlaquetteLayoutConfig): number {
    const dims = this.getPageDimensionsPt(pageSize, 'portrait');
    const leftMarginPt = this.mmToPoints(layout.margins.left);
    const rightMarginPt = this.mmToPoints(layout.margins.right);
    return dims.width - leftMarginPt - rightMarginPt;
  }

  // --------------------------------------------------------------------------
  // PDF Generation
  // --------------------------------------------------------------------------

  async generatePlaquette(
    options: PlaquetteGenerationOptions,
    onProgress?: PlaquetteProgressCallback
  ): Promise<PlaquetteGenerationResult> {
    try {
      // Stage 1: Validation
      this.emitProgress(onProgress, 'validating', 10, 'Validation des données...');
      
      const validation = this.validateGenerationOptions(options);
      if (!validation.valid) {
        const error = new PlaquetteError(
          `Validation failed: ${validation.errors.join(', ')}`,
          validation.errors.includes('images_required') 
            ? PlaquetteErrorCode.NO_IMAGES 
            : validation.errors.includes('decors_required')
              ? PlaquetteErrorCode.INVALID_DECOR
              : PlaquetteErrorCode.INVALID_PROJECT
        );
        this.emitError(error);
        throw error;
      }

      // Stage 2: Load images
      this.emitProgress(onProgress, 'loading_images', 30, 'Chargement des images...');
      
      const imageData: string[] = [];
      for (const image of options.images) {
        try {
          const base64 = await this.loadImageAsBase64(image.url);
          imageData.push(base64);
        } catch (imgError) {
          const error = new PlaquetteError(
            'Failed to load image',
            PlaquetteErrorCode.IMAGE_LOAD_FAILED
          );
          this.emitError(error);
          return {
            success: false,
            error: 'Failed to load image',
          };
        }
      }

      // Stage 3: Generate content
      this.emitProgress(onProgress, 'generating', 60, 'Génération du PDF...');
      
      const content = this.generateContent(options);
      const layout = this.determineLayout(options);

      // Stage 4: Create PDF
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: this.config.orientation,
        unit: 'pt',
        format: this.config.pageSize.toLowerCase() as any,
      });

      const dims = this.getPageDimensionsPt(this.config.pageSize, this.config.orientation);
      const marginTop = this.mmToPoints(layout.margins.top);
      const marginBottom = this.mmToPoints(layout.margins.bottom);
      const marginLeft = this.mmToPoints(layout.margins.left);
      const marginRight = this.mmToPoints(layout.margins.right);

      // Generate each page
      for (let pageIndex = 0; pageIndex < content.imageBlocks.length; pageIndex++) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        let currentY = marginTop;

        // DICA strip (co-branded only)
        if (content.header.dicaStripText) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(content.header.dicaStripText, dims.width / 2, currentY, { align: 'center' });
          currentY += 15;
        }

        // Reseller block (co-branded only)
        if (content.resellerBlock && pageIndex === 0) {
          currentY = this.renderResellerBlock(doc, content.resellerBlock, currentY, dims, marginLeft);
        }

        // Header (first page only)
        if (pageIndex === 0) {
          doc.setFontSize(18);
          this.setTextColorFromHex(doc, this.config.dicaBranding.primaryColor);
          doc.text(content.header.companyName, marginLeft, currentY);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(content.header.tagline, dims.width - marginRight, currentY, { align: 'right' });
          currentY += 25;

          // Divider
          doc.setDrawColor(220, 220, 220);
          doc.line(marginLeft, currentY, dims.width - marginRight, currentY);
          currentY += 20;

          // Project info
          doc.setFontSize(20);
          doc.setTextColor(0, 0, 0);
          doc.text(content.projectBlock.title, marginLeft, currentY);
          currentY += 25;

          doc.setFontSize(12);
          doc.setTextColor(80, 80, 80);
          doc.text(`${content.projectBlock.type} — ${content.projectBlock.date}`, marginLeft, currentY);
          currentY += 15;

          if (content.projectBlock.clientName) {
            doc.text(`Client: ${content.projectBlock.clientName}`, marginLeft, currentY);
            currentY += 15;
          }

          currentY += 20;
        }

        // Image
        const imageBlock = content.imageBlocks[pageIndex];
        const imgBase64 = imageData[pageIndex];
        
        if (imgBase64) {
          const imgWidth = dims.width - marginLeft - marginRight;
          const imgHeight = imgWidth * 0.6; // Approximate aspect ratio
          
          doc.addImage(imgBase64, 'JPEG', marginLeft, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 20;
        }

        // Decor info
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(imageBlock.decorName, marginLeft, currentY);
        currentY += 18;

        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Réf: ${imageBlock.decorCode}`, marginLeft, currentY);
        currentY += 15;

        if (imageBlock.collection) {
          doc.text(`Collection: ${imageBlock.collection}`, marginLeft, currentY);
          currentY += 15;
        }

        if (imageBlock.finish) {
          doc.text(`Finition: ${imageBlock.finish}`, marginLeft, currentY);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        const footerY = dims.height - marginBottom;
        
        doc.text(content.footer.disclaimer, marginLeft, footerY);
        doc.text(`${content.footer.companyInfo} — ${content.footer.website}`, dims.width / 2, footerY, { align: 'center' });
        
        if (content.footer.showPageNumbers) {
          doc.text(`Page ${pageIndex + 1} / ${content.totalPages}`, dims.width - marginRight, footerY, { align: 'right' });
        }

        if (content.footer.coBrandingAttribution && pageIndex === content.totalPages - 1) {
          doc.text(content.footer.coBrandingAttribution, dims.width / 2, footerY + 12, { align: 'center' });
        }
      }

      // Stage 5: Finalize
      this.emitProgress(onProgress, 'finalizing', 90, 'Finalisation...');

      const blob = doc.output('blob');
      const filename = this.generateFilename(options);

      const metadata: PlaquetteMetadata = {
        title: `Plaquette - ${options.project.name}`,
        author: this.config.dicaBranding.companyName,
        subject: `Projection décor ${options.decors[0]?.name || ''}`,
        creator: 'DICA DÉCOR App',
        createdAt: new Date(),
        templateVersion: options.appSettings.templateVersion,
        isCoBranded: layout.type === 'coBranded',
        resellerName: options.resellerBranding?.companyName,
      };

      this.emitProgress(onProgress, 'finalizing', 100, 'PDF généré avec succès');

      return {
        success: true,
        blob,
        filename,
        pageCount: content.totalPages,
        warnings: validation.warnings,
        metadata,
      };
    } catch (error) {
      if (error instanceof PlaquetteError) {
        throw error;
      }
      const plaquetteError = new PlaquetteError(
        (error as Error).message || 'PDF generation failed',
        PlaquetteErrorCode.PDF_GENERATION_FAILED
      );
      this.emitError(plaquetteError);
      throw plaquetteError;
    }
  }

  private renderResellerBlock(
    doc: any,
    block: ResellerBlockContent,
    startY: number,
    dims: PageDimensions,
    marginLeft: number
  ): number {
    let y = startY;

    // Company name or logo placeholder
    if (block.showNameInsteadOfLogo) {
      doc.setFontSize(16);
      this.setTextColorFromHex(doc, block.accentColor || '#333333');
      doc.text(block.companyName, marginLeft, y);
    } else {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(block.companyName, marginLeft, y);
    }
    y += 20;

    // Contact info
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const contactParts: string[] = [];
    if (block.phone) contactParts.push(block.phone);
    if (block.email) contactParts.push(block.email);
    if (block.website) contactParts.push(block.website);
    
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' • '), marginLeft, y);
      y += 12;
    }

    if (block.tagline) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(block.tagline, marginLeft, y);
      y += 10;
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y, dims.width - marginLeft, y);
    y += 15;

    return y;
  }

  private async loadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Charge une image et retourne ses données avec dimensions réelles
   * Corrige automatiquement l'orientation EXIF via canvas
   */
  private async loadImageWithDimensions(url: string): Promise<LoadedImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Utiliser un canvas pour "cuire" l'orientation correcte
        // Le navigateur moderne corrige automatiquement l'orientation EXIF
        // quand on dessine sur un canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Définir les dimensions du canvas selon l'image chargée
        // (le navigateur aura déjà corrigé l'orientation)
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Dessiner l'image sur le canvas (orientation corrigée)
        ctx.drawImage(img, 0, 0);
        
        // Convertir en base64 avec orientation correcte
        const correctedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        
        resolve({
          base64: correctedBase64,
          width: canvas.width,
          height: canvas.height,
          aspectRatio: canvas.width / canvas.height,
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * Calcule les dimensions optimales pour une image dans le PDF
   * en préservant le ratio original
   */
  calculateOptimalImageDimensions(
    imageWidth: number,
    imageHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = imageWidth / imageHeight;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    // Si la hauteur dépasse le max, on recalcule par la hauteur
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  }

  // --------------------------------------------------------------------------
  // Filename Generation
  // --------------------------------------------------------------------------

  generateFilename(options: PlaquetteGenerationOptions): string {
    const parts: string[] = ['dica', 'plaquette'];
    
    // Add project name (sanitized)
    const sanitizedProject = this.sanitizeFilename(options.project.name);
    if (sanitizedProject) {
      parts.push(sanitizedProject);
    }

    // Add reseller name if co-branded
    if (
      options.appSettings.resellerBrandingEnabled &&
      options.resellerBranding?.companyName
    ) {
      const sanitizedReseller = this.sanitizeFilename(options.resellerBranding.companyName);
      if (sanitizedReseller) {
        parts.push(sanitizedReseller);
      }
    }

    // Add date
    parts.push(new Date().toISOString().split('T')[0]);

    return `${parts.join('-')}.pdf`;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  formatDateFr(date: Date, format: 'short' | 'long' | 'full'): string {
    const options: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    };
    
    return date.toLocaleDateString('fr-FR', options[format]);
  }

  getProjectTypeLabel(type: ProjectType | string): string {
    return PROJECT_TYPE_LABELS[type as ProjectType] || type;
  }

  mmToPoints(mm: number): number {
    return mm * 2.834645669;
  }

  getPageDimensionsPt(
    size: 'A4' | 'A3' | 'Letter',
    orientation: 'portrait' | 'landscape'
  ): PageDimensions {
    const dims = PlaquettePdfService.PAGE_SIZES[size];
    
    if (orientation === 'landscape') {
      return { width: dims.height, height: dims.width };
    }
    
    return { ...dims };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
  
  private setTextColorFromHex(doc: any, hex: string): void {
    const rgb = this.hexToRgb(hex);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
  }

  // --------------------------------------------------------------------------
  // Progress & Error Handling
  // --------------------------------------------------------------------------

  private emitProgress(
    callback: PlaquetteProgressCallback | undefined,
    stage: PlaquetteProgressEvent['stage'],
    progress: number,
    message: string
  ): void {
    if (callback) {
      callback({ stage, progress, message });
    }
  }

  onError(callback: (error: PlaquetteError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  emitError(error: PlaquetteError): void {
    this.errorListeners.forEach(listener => listener(error));
  }

  // ==========================================================================
  // V2 Premium Methods - Image Handling
  // ==========================================================================

  calculateImageDimensionsPreserved(
    imageWidth: number,
    imageHeight: number,
    pageSize: 'A4' | 'A3' | 'Letter'
  ): ImageDimensionsWithPosition {
    const pageDims = this.getPageDimensionsPt(pageSize, 'portrait');
    const marginLeft = this.mmToPoints(this.config.margins.left);
    const marginRight = this.mmToPoints(this.config.margins.right);
    const maxContentWidth = pageDims.width - marginLeft - marginRight;
    const maxImageHeight = pageDims.height * 0.55; // 55% of page height for image

    const aspectRatio = imageWidth / imageHeight;
    let width: number;
    let height: number;

    // Start with max width
    width = maxContentWidth * 0.9; // 90% of content width for aesthetics
    height = width / aspectRatio;

    // Check if height exceeds limit
    if (height > maxImageHeight) {
      height = maxImageHeight;
      width = height * aspectRatio;
    }

    // Center horizontally
    const x = marginLeft + (maxContentWidth - width) / 2;

    return { width, height, x };
  }

  // ==========================================================================
  // V2 Premium Methods - Visual Design
  // ==========================================================================

  getImageShadowConfig(): ShadowConfig {
    return {
      offsetX: 3,
      offsetY: 4,
      blur: 8,
      color: 'rgba(0, 0, 0, 0.15)',
    };
  }

  getImageBorderConfig(): BorderConfig {
    return {
      width: 1,
      color: '#E5E5E5',
      radius: 4,
    };
  }

  generateColorBadge(decor: PlaquetteDecor): ColorBadge {
    const categoryColors: Record<string, { bg: string; text: string }> = {
      'bois': { bg: '#8B4513', text: '#FFFFFF' },
      'metal': { bg: '#6B7280', text: '#FFFFFF' },
      'marbre': { bg: '#9CA3AF', text: '#1F2937' },
      'unis': { bg: '#3B82F6', text: '#FFFFFF' },
      'deco': { bg: '#8B5CF6', text: '#FFFFFF' },
    };

    const category = decor.category?.toLowerCase() || 'unis';
    const colors = categoryColors[category] || categoryColors['unis'];

    return {
      text: `${decor.name} • ${decor.referenceCode}`,
      backgroundColor: colors.bg,
      textColor: colors.text,
    };
  }

  getHeaderBannerConfig(): HeaderBannerConfig {
    return {
      height: 45,
      primaryColor: '#E94E5D',
      gradientEnd: '#C43D4A',
    };
  }

  // ==========================================================================
  // V2 Premium Methods - Comparison Layout
  // ==========================================================================

  calculateComparisonLayout(
    pageSize: 'A4' | 'A3' | 'Letter',
    layout: 'side-by-side' | 'stacked'
  ): ComparisonLayout {
    const pageDims = this.getPageDimensionsPt(pageSize, 'portrait');
    const marginLeft = this.mmToPoints(this.config.margins.left);
    const marginRight = this.mmToPoints(this.config.margins.right);
    const contentWidth = pageDims.width - marginLeft - marginRight;

    const gap = 20;
    const imageWidth = (contentWidth - gap) / 2;
    const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio
    const startY = 150; // Below header

    return {
      leftImage: {
        x: marginLeft,
        y: startY,
        width: imageWidth,
        height: imageHeight,
      },
      rightImage: {
        x: marginLeft + imageWidth + gap,
        y: startY,
        width: imageWidth,
        height: imageHeight,
      },
      labels: {
        before: 'AVANT',
        after: 'APRÈS',
      },
      y: startY,
      gap,
    };
  }

  // ==========================================================================
  // V2 Premium Methods - AI Commercial Commentary
  // ==========================================================================

  generateCommercialComment(decor: PlaquetteDecor, project: PlaquetteProject): string {
    const category = decor.category?.toLowerCase() || '';
    const projectType = project.type?.toLowerCase() || '';
    const decorName = decor.name || '';

    // Base comments by category
    const categoryComments: Record<string, string[]> = {
      'bois': [
        `Le décor ${decorName} apporte une touche de chaleur naturelle et d'authenticité à votre espace.`,
        `Avec ses veinures authentiques, ${decorName} crée une atmosphère accueillante et intemporelle.`,
        `La texture bois ${decorName} sublime votre intérieur avec élégance et raffinement naturel.`,
      ],
      'metal': [
        `Le décor ${decorName} confère un style moderne et contemporain à votre aménagement.`,
        `Avec son aspect métallique élégant, ${decorName} apporte sophistication et durabilité.`,
        `La finition inox ${decorName} allie esthétique moderne et facilité d'entretien.`,
      ],
      'marbre': [
        `Le décor ${decorName} évoque le luxe et la noblesse des matériaux naturels.`,
        `Avec ses veinures caractéristiques, ${decorName} crée une atmosphère prestigieuse.`,
        `La texture marbre ${decorName} sublime votre espace avec élégance intemporelle.`,
      ],
      'unis': [
        `Le décor ${decorName} offre une surface épurée pour un design minimaliste et élégant.`,
        `Avec sa teinte harmonieuse, ${decorName} s'intègre parfaitement à tous les styles.`,
        `La finition unie ${decorName} crée une base raffinée pour votre aménagement.`,
      ],
      'deco': [
        `Le décor ${decorName} apporte une touche originale et distinctive à votre projet.`,
        `Avec son motif unique, ${decorName} personnalise votre espace avec caractère.`,
        `La finition décorative ${decorName} révèle votre style et votre personnalité.`,
      ],
    };

    // Project-specific additions
    const projectAdditions: Record<string, string> = {
      'ascenseur': ' Idéal pour transformer votre cabine d\'ascenseur en un espace accueillant et moderne.',
      'van': ' Parfait pour l\'aménagement de véhicule, alliant esthétique et praticité pour votre vie mobile.',
      'cuisine': ' Un choix parfait pour créer un espace culinaire inspirant où gastronomie rime avec élégance.',
      'salle_de_bain': ' Résistant à l\'humidité, ce décor sublime votre espace bien-être avec style.',
      'bureau': ' Créez un environnement de travail professionnel et inspirant pour booster votre productivité.',
      'hotel': ' Offrez à vos clients une expérience visuelle premium qui reflète l\'excellence de votre établissement.',
      'restaurant': ' Créez une ambiance mémorable qui sublime l\'expérience gastronomique de vos convives.',
      'commerce': ' Attirez et fidélisez votre clientèle avec un aménagement qui reflète votre identité de marque.',
    };

    // Select base comment
    const comments = categoryComments[category] || categoryComments['unis'];
    const baseComment = comments[Math.floor(Math.random() * comments.length)];

    // Add project-specific addition
    const addition = projectAdditions[projectType] || '';

    return baseComment + addition;
  }

  // ==========================================================================
  // V2 Premium Methods - Content Generation
  // ==========================================================================

  generateContentV2(options: PlaquetteGenerationOptions): GeneratedContentV2 {
    const layout = this.determineLayout(options);
    const isCoBranded = layout.type === 'coBranded';
    const hasMultipleImages = options.images.length > 1;

    // Enhanced Header
    const header: EnhancedHeaderContent = {
      logoPosition: 'left',
      companyName: this.config.dicaBranding.companyName,
      tagline: this.config.dicaBranding.tagline,
      hasBanner: true,
      bannerConfig: this.getHeaderBannerConfig(),
    };

    if (isCoBranded) {
      header.dicaStripText = 'App DICA DÉCOR';
      header.dicaStripHeight = 10;
    }

    // Enhanced Footer
    const footer: EnhancedFooterContent = {
      companyInfo: this.config.dicaBranding.companyName,
      website: this.config.dicaBranding.website,
      disclaimer: 'Visuel non contractuel',
      showPageNumbers: true,
      premiumStyle: true,
      showDicaLogo: true,
    };

    if (isCoBranded && options.resellerBranding) {
      footer.coBrandingAttribution = `Plaquette générée par l'app DICA DÉCOR pour le compte de : ${options.resellerBranding.companyName}`;
    }

    // Project block
    const projectBlock: ProjectBlockContent = {
      title: options.project.name,
      type: this.getProjectTypeLabel(options.project.type),
      date: this.formatDateFr(options.project.createdAt, options.appSettings.dateFormat),
      clientName: options.project.clientName,
      clientRef: options.project.clientRef,
      location: options.project.location,
    };

    // Enhanced Image blocks with commercial comments
    const imageBlocks: EnhancedImageBlock[] = options.images.map((image) => {
      const decor = options.decors.find(d => d.id === image.decorId) || options.decors[0];
      const colorBadge = decor ? this.generateColorBadge(decor) : undefined;
      const commercialComment = decor 
        ? this.generateCommercialComment(decor, options.project) 
        : undefined;

      return {
        imageUrl: image.url,
        decorName: image.decorName || decor?.name || '',
        decorCode: image.decorCode || decor?.referenceCode || '',
        collection: decor?.collection,
        finish: decor?.finish,
        description: decor?.description,
        colorBadge,
        commercialComment,
        showTextureSwatch: true,
      };
    });

    // Reseller block (only if co-branded)
    let resellerBlock: ResellerBlockContent | undefined;
    if (isCoBranded && options.resellerBranding) {
      const rb = options.resellerBranding;
      resellerBlock = {
        companyName: rb.companyName,
        logoUrl: rb.logoUrl,
        showNameInsteadOfLogo: !rb.logoUrl,
        email: rb.email,
        phone: rb.phone,
        website: rb.website,
        address: [rb.addressLine1, rb.addressLine2, rb.city, rb.postalCode, rb.country]
          .filter(Boolean)
          .join(', '),
        accentColor: rb.accentColorHex,
        tagline: rb.tagline,
      };
    }

    // Comparison page
    let comparisonPage: ComparisonPageContent = { enabled: false };
    if (options.includeComparison && options.originalImage && options.images.length > 0) {
      const decor = options.decors[0];
      comparisonPage = {
        enabled: true,
        originalImage: options.originalImage,
        renderedImage: options.images[0].url,
        decorReference: decor ? `${decor.name} (${decor.referenceCode})` : undefined,
        decorName: decor?.name,
      };
    }

    // Cover page (for multi-image projects)
    let coverPage: CoverPageContent | undefined;
    if (hasMultipleImages) {
      coverPage = {
        title: options.project.name,
        projectType: this.getProjectTypeLabel(options.project.type),
        decorCount: options.decors.length,
        imageCount: options.images.length,
        clientName: options.project.clientName,
        date: this.formatDateFr(options.project.createdAt, options.appSettings.dateFormat),
      };
    }

    // Calculate total pages
    let totalPages = options.images.length;
    if (comparisonPage.enabled) totalPages += 1;
    if (coverPage) totalPages += 1;

    return {
      version: 2,
      header,
      footer,
      projectBlock,
      imageBlocks,
      resellerBlock,
      comparisonPage,
      coverPage,
      totalPages,
    };
  }

  // ==========================================================================
  // V2 Premium Methods - PDF Generation
  // ==========================================================================

  async generatePlaquettePremium(
    options: PlaquetteGenerationOptions,
    onProgress?: PlaquetteProgressCallback
  ): Promise<PlaquetteGenerationResult> {
    try {
      // Stage 1: Validation
      this.emitProgress(onProgress, 'validating', 10, 'Validation des données...');
      
      const validation = this.validateGenerationOptions(options);
      if (!validation.valid) {
        const error = new PlaquetteError(
          `Validation failed: ${validation.errors.join(', ')}`,
          validation.errors.includes('images_required') 
            ? PlaquetteErrorCode.NO_IMAGES 
            : validation.errors.includes('decors_required')
              ? PlaquetteErrorCode.INVALID_DECOR
              : PlaquetteErrorCode.INVALID_PROJECT
        );
        this.emitError(error);
        throw error;
      }

      // Stage 2: Load images with REAL dimensions
      this.emitProgress(onProgress, 'loading_images', 20, 'Chargement des images HD...');
      
      const loadedImages: Map<string, LoadedImageData> = new Map();
      const totalImages = options.images.length + (options.originalImage ? 1 : 0);
      let loadedCount = 0;
      
      for (const image of options.images) {
        try {
          const imgData = await this.loadImageWithDimensions(image.url);
          loadedImages.set(image.url, imgData);
          loadedCount++;
          this.emitProgress(
            onProgress, 
            'loading_images', 
            20 + Math.floor((loadedCount / totalImages) * 20),
            `Chargement image ${loadedCount}/${totalImages}...`
          );
        } catch (imgError) {
          console.warn('Failed to load image:', image.url);
        }
      }

      // Load original image if comparison enabled
      if (options.includeComparison && options.originalImage) {
        try {
          const imgData = await this.loadImageWithDimensions(options.originalImage);
          loadedImages.set(options.originalImage, imgData);
        } catch (imgError) {
          console.warn('Failed to load original image');
        }
      }

      // Stage 3: Generate content
      this.emitProgress(onProgress, 'generating', 45, 'Préparation du contenu...');
      
      const content = this.generateContentV2(options);
      const layout = this.determineLayout(options);

      // Stage 4: Create PDF
      this.emitProgress(onProgress, 'generating', 50, 'Création du PDF premium...');
      
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: this.config.orientation,
        unit: 'pt',
        format: this.config.pageSize.toLowerCase() as any,
      });

      const dims = this.getPageDimensionsPt(this.config.pageSize, this.config.orientation);
      const marginTop = this.mmToPoints(layout.margins.top);
      const marginBottom = this.mmToPoints(layout.margins.bottom);
      const marginLeft = this.mmToPoints(layout.margins.left);
      const marginRight = this.mmToPoints(layout.margins.right);

      let pageNumber = 0;

      // Cover page (if multiple images)
      if (content.coverPage) {
        pageNumber++;
        this.renderCoverPagePremium(doc, content, dims, marginLeft, marginTop, marginBottom);
        if (content.imageBlocks.length > 0) {
          doc.addPage();
        }
      }

      // Render each image page with REAL dimensions
      for (let i = 0; i < content.imageBlocks.length; i++) {
        if (i > 0 || content.coverPage) {
          if (i > 0) doc.addPage();
        }
        pageNumber++;

        const imageBlock = content.imageBlocks[i];
        const imgData = loadedImages.get(options.images[i].url);
        
        this.emitProgress(
          onProgress,
          'generating',
          50 + Math.floor((i / content.imageBlocks.length) * 35),
          `Rendu page ${pageNumber}/${content.totalPages}...`
        );
        
        this.renderImagePagePremium(
          doc, 
          content, 
          imageBlock, 
          imgData,
          dims, 
          marginLeft, 
          marginTop, 
          marginBottom,
          marginRight,
          pageNumber,
          content.totalPages,
          i === 0 && !content.coverPage
        );
      }

      // Comparison page
      if (content.comparisonPage?.enabled) {
        doc.addPage();
        pageNumber++;
        
        const originalData = options.originalImage ? loadedImages.get(options.originalImage) : undefined;
        const renderedData = options.images[0] ? loadedImages.get(options.images[0].url) : undefined;
        
        this.renderComparisonPagePremium(
          doc,
          content,
          originalData,
          renderedData,
          dims,
          marginLeft,
          marginTop,
          marginBottom,
          marginRight,
          pageNumber,
          content.totalPages
        );
      }

      // Stage 5: Finalize
      this.emitProgress(onProgress, 'finalizing', 95, 'Finalisation...');

      const blob = doc.output('blob');
      const filename = this.generateFilename(options);

      const metadata: PlaquetteMetadata & { premiumLayout: boolean } = {
        title: `Plaquette Premium - ${options.project.name}`,
        author: this.config.dicaBranding.companyName,
        subject: `Projection décor ${options.decors[0]?.name || ''}`,
        creator: 'DICA DÉCOR App v2',
        createdAt: new Date(),
        templateVersion: 'premium-2.0',
        isCoBranded: layout.type === 'coBranded',
        resellerName: options.resellerBranding?.companyName,
        premiumLayout: true,
      };

      this.emitProgress(onProgress, 'finalizing', 100, 'PDF premium généré avec succès');

      return {
        success: true,
        blob,
        filename,
        pageCount: content.totalPages,
        warnings: validation.warnings,
        metadata,
      };
    } catch (error) {
      if (error instanceof PlaquetteError) {
        throw error;
      }
      const plaquetteError = new PlaquetteError(
        (error as Error).message || 'PDF generation failed',
        PlaquetteErrorCode.PDF_GENERATION_FAILED
      );
      this.emitError(plaquetteError);
      throw plaquetteError;
    }
  }

  // ==========================================================================
  // V2 Premium Methods - Page Renderers
  // ==========================================================================

  private renderCoverPagePremium(
    doc: any,
    content: GeneratedContentV2,
    dims: PageDimensions,
    marginLeft: number,
    marginTop: number,
    marginBottom: number
  ): void {
    const marginRight = marginLeft;
    
    // Header banner with gradient effect
    const banner = content.header.bannerConfig!;
    this.setFillColorFromHex(doc, banner.primaryColor);
    doc.rect(0, 0, dims.width, 60, 'F');

    // DICA logo text
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text('DICA', marginLeft + 15, 38);
    
    // DÉCOR in lighter weight
    doc.setFontSize(28);
    doc.text('DÉCOR', marginLeft + 80, 38);

    // Tagline
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255, 200);
    doc.text('Projection de décors stratifiés', dims.width - marginRight - 15, 38, { align: 'right' });

    // Central content area
    const centerY = dims.height / 2 - 80;
    
    // Decorative line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(dims.width / 2 - 100, centerY - 40, dims.width / 2 + 100, centerY - 40);

    // Main title
    doc.setFontSize(36);
    doc.setTextColor(30, 30, 30);
    const titleLines = doc.splitTextToSize(content.coverPage!.title, dims.width - marginLeft * 2 - 40);
    doc.text(titleLines, dims.width / 2, centerY, { align: 'center' });

    // Decorative line after title
    const afterTitleY = centerY + (titleLines.length * 40) + 20;
    doc.line(dims.width / 2 - 100, afterTitleY, dims.width / 2 + 100, afterTitleY);

    // Project type badge
    const badgeY = afterTitleY + 40;
    const typeText = content.coverPage!.projectType.toUpperCase();
    const typeWidth = doc.getTextWidth(typeText) + 40;
    
    this.setFillColorFromHex(doc, '#F3F4F6');
    doc.roundedRect(dims.width / 2 - typeWidth / 2, badgeY - 12, typeWidth, 28, 14, 14, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(typeText, dims.width / 2, badgeY + 5, { align: 'center' });

    // Client and date info
    let infoY = badgeY + 50;
    doc.setFontSize(13);
    doc.setTextColor(100, 100, 100);
    
    if (content.coverPage!.clientName) {
      doc.text(content.coverPage!.clientName, dims.width / 2, infoY, { align: 'center' });
      infoY += 25;
    }

    doc.setFontSize(12);
    doc.text(content.coverPage!.date, dims.width / 2, infoY, { align: 'center' });

    // Stats section
    const statsY = dims.height - marginBottom - 150;
    
    // Stats background
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(marginLeft + 30, statsY - 20, dims.width - marginLeft * 2 - 60, 100, 8, 8, 'F');
    
    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(dims.width / 2, statsY, dims.width / 2, statsY + 60);

    // Left stat: Rendus
    doc.setFontSize(42);
    this.setTextColorFromHex(doc, this.config.dicaBranding.primaryColor);
    doc.text(String(content.coverPage!.imageCount), dims.width / 4 + 15, statsY + 35, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text('RENDUS', dims.width / 4 + 15, statsY + 55, { align: 'center' });

    // Right stat: Décors
    doc.setFontSize(42);
    this.setTextColorFromHex(doc, this.config.dicaBranding.primaryColor);
    doc.text(String(content.coverPage!.decorCount), (dims.width * 3) / 4 - 15, statsY + 35, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    doc.text(content.coverPage!.decorCount > 1 ? 'DÉCORS' : 'DÉCOR', (dims.width * 3) / 4 - 15, statsY + 55, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('www.dica-france.com', dims.width / 2, dims.height - marginBottom + 10, { align: 'center' });
  }

  private renderImagePagePremium(
    doc: any,
    content: GeneratedContentV2,
    imageBlock: EnhancedImageBlock,
    imgData: LoadedImageData | undefined,
    dims: PageDimensions,
    marginLeft: number,
    marginTop: number,
    marginBottom: number,
    marginRight: number,
    pageNumber: number,
    totalPages: number,
    showHeader: boolean
  ): void {
    let currentY = marginTop;

    // Header banner
    const banner = content.header.bannerConfig!;
    this.setFillColorFromHex(doc, banner.primaryColor);
    doc.rect(0, 0, dims.width, 50, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('DICA DÉCOR', marginLeft + 10, 32);

    doc.setFontSize(10);
    doc.text(content.header.tagline, dims.width - marginRight - 10, 32, { align: 'right' });

    currentY = 70;

    // Project title (first page only)
    if (showHeader) {
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      const titleLines = doc.splitTextToSize(content.projectBlock.title, dims.width - marginLeft - marginRight);
      doc.text(titleLines, marginLeft, currentY);
      currentY += titleLines.length * 24 + 8;

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`${content.projectBlock.type} — ${content.projectBlock.date}`, marginLeft, currentY);
      currentY += 25;
    } else {
      currentY += 10;
    }

    // === IMAGE WITH TRUE ASPECT RATIO ===
    if (imgData) {
      const contentWidth = dims.width - marginLeft - marginRight;
      const maxImageHeight = dims.height - currentY - marginBottom - 180; // Space for decor info + footer
      
      // Calculate dimensions using REAL aspect ratio
      const imgDims = this.calculateOptimalImageDimensions(
        imgData.width,
        imgData.height,
        contentWidth - 20, // Small margin
        maxImageHeight
      );
      
      // Center image horizontally
      const imgX = marginLeft + (contentWidth - imgDims.width) / 2;
      
      // Shadow effect (subtle, offset)
      doc.setFillColor(0, 0, 0, 15);
      doc.roundedRect(imgX + 6, currentY + 6, imgDims.width, imgDims.height, 6, 6, 'F');

      // White background for image
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(imgX - 2, currentY - 2, imgDims.width + 4, imgDims.height + 4, 6, 6, 'F');
      
      // Image border
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(1);
      doc.roundedRect(imgX - 2, currentY - 2, imgDims.width + 4, imgDims.height + 4, 6, 6, 'S');
      
      // Add image with TRUE dimensions
      doc.addImage(imgData.base64, 'JPEG', imgX, currentY, imgDims.width, imgDims.height);

      currentY += imgDims.height + 25;
    }

    // === DECOR INFO SECTION ===
    // Color badge with reference
    const badgeText = `${imageBlock.decorName} • Réf: ${imageBlock.decorCode}`;
    const badgeWidth = Math.min(doc.getTextWidth(badgeText) * 1.2 + 30, dims.width - marginLeft - marginRight);
    const badgeHeight = 28;
    const badgeX = marginLeft;

    if (imageBlock.colorBadge) {
      this.setFillColorFromHex(doc, imageBlock.colorBadge.backgroundColor);
      doc.roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 6, 6, 'F');

      doc.setFontSize(11);
      this.setTextColorFromHex(doc, imageBlock.colorBadge.textColor);
      doc.text(badgeText, badgeX + 12, currentY + 18);
    } else {
      // Default badge
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 6, 6, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(badgeText, badgeX + 12, currentY + 18);
    }

    currentY += badgeHeight + 15;

    // Collection and finish
    if (imageBlock.collection || imageBlock.finish) {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const details = [
        imageBlock.collection ? `Collection: ${imageBlock.collection}` : '',
        imageBlock.finish ? `Finition: ${imageBlock.finish}` : '',
      ].filter(Boolean).join(' • ');
      doc.text(details, marginLeft, currentY);
      currentY += 18;
    }

    // Commercial comment (AI generated) - styled quote
    if (imageBlock.commercialComment) {
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      
      const maxWidth = dims.width - marginLeft - marginRight - 30;
      const lines = doc.splitTextToSize(`« ${imageBlock.commercialComment} »`, maxWidth);
      
      // Quote bar
      this.setFillColorFromHex(doc, this.config.dicaBranding.primaryColor);
      doc.rect(marginLeft, currentY - 3, 3, lines.length * 13 + 6, 'F');
      
      doc.text(lines, marginLeft + 15, currentY + 10);
    }

    // Premium footer
    this.renderPremiumFooter(doc, content.footer, dims, marginLeft, marginRight, marginBottom, pageNumber, totalPages);
  }

  private renderComparisonPagePremium(
    doc: any,
    content: GeneratedContentV2,
    originalData: LoadedImageData | undefined,
    renderedData: LoadedImageData | undefined,
    dims: PageDimensions,
    marginLeft: number,
    marginTop: number,
    marginBottom: number,
    marginRight: number,
    pageNumber: number,
    totalPages: number
  ): void {
    // Header banner
    this.setFillColorFromHex(doc, this.config.dicaBranding.primaryColor);
    doc.rect(0, 0, dims.width, 55, 'F');

    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('TRANSFORMATION', dims.width / 2, 35, { align: 'center' });

    // Main content area
    const contentWidth = dims.width - marginLeft - marginRight;
    const startY = 90;
    
    // Title section
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text('Visualisez l\'impact de votre décor DICA', dims.width / 2, startY, { align: 'center' });

    // Calculate image dimensions based on ACTUAL aspect ratios of EACH image
    const imageY = startY + 50;
    const gap = 30;
    const singleImageMaxWidth = (contentWidth - gap) / 2;
    const maxImageHeight = dims.height - imageY - marginBottom - 140;

    // Calculate dimensions for ORIGINAL image (AVANT) with its OWN ratio
    const originalRatio = originalData 
      ? originalData.width / originalData.height 
      : 16/9;
    
    let originalImgWidth = singleImageMaxWidth;
    let originalImgHeight = originalImgWidth / originalRatio;
    
    if (originalImgHeight > maxImageHeight) {
      originalImgHeight = maxImageHeight;
      originalImgWidth = originalImgHeight * originalRatio;
    }

    // Calculate dimensions for RENDERED image (APRÈS) with its OWN ratio
    const renderedRatio = renderedData 
      ? renderedData.width / renderedData.height 
      : 16/9;
    
    let renderedImgWidth = singleImageMaxWidth;
    let renderedImgHeight = renderedImgWidth / renderedRatio;
    
    if (renderedImgHeight > maxImageHeight) {
      renderedImgHeight = maxImageHeight;
      renderedImgWidth = renderedImgHeight * renderedRatio;
    }

    // Align both images vertically at the same baseline
    const maxHeight = Math.max(originalImgHeight, renderedImgHeight);
    const originalOffsetY = (maxHeight - originalImgHeight) / 2;
    const renderedOffsetY = (maxHeight - renderedImgHeight) / 2;

    // Positions - center each image in its half
    const leftX = marginLeft + (singleImageMaxWidth - originalImgWidth) / 2;
    const rightX = marginLeft + singleImageMaxWidth + gap + (singleImageMaxWidth - renderedImgWidth) / 2;

    // === AVANT SECTION ===
    // Label
    doc.setFontSize(13);
    doc.setTextColor(120, 120, 120);
    doc.text('AVANT', marginLeft + singleImageMaxWidth / 2, imageY - 15, { align: 'center' });

    const originalY = imageY + originalOffsetY;

    if (originalData) {
      // Shadow
      doc.setFillColor(0, 0, 0, 20);
      doc.roundedRect(leftX + 5, originalY + 5, originalImgWidth, originalImgHeight, 8, 8, 'F');
      
      // White frame
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(leftX - 4, originalY - 4, originalImgWidth + 8, originalImgHeight + 8, 8, 8, 'F');
      
      // Border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.roundedRect(leftX - 4, originalY - 4, originalImgWidth + 8, originalImgHeight + 8, 8, 8, 'S');
      
      // Image with CORRECT dimensions
      doc.addImage(originalData.base64, 'JPEG', leftX, originalY, originalImgWidth, originalImgHeight);
    } else {
      // Placeholder
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(leftX, originalY, originalImgWidth, originalImgHeight, 8, 8, 'F');
      doc.setFontSize(12);
      doc.setTextColor(180, 180, 180);
      doc.text('Image originale', leftX + originalImgWidth / 2, originalY + originalImgHeight / 2, { align: 'center' });
    }

    // === ARROW INDICATOR ===
    const arrowY = imageY + maxHeight / 2;
    const arrowX = dims.width / 2;
    
    // Arrow circle
    this.setFillColorFromHex(doc, this.config.dicaBranding.primaryColor);
    doc.circle(arrowX, arrowY, 18, 'F');
    
    // Arrow text
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('→', arrowX, arrowY + 5, { align: 'center' });

    // === APRÈS SECTION ===
    // Label with decor name
    doc.setFontSize(13);
    this.setTextColorFromHex(doc, this.config.dicaBranding.primaryColor);
    doc.text('APRÈS', marginLeft + singleImageMaxWidth + gap + singleImageMaxWidth / 2, imageY - 15, { align: 'center' });

    const renderedY = imageY + renderedOffsetY;

    if (renderedData) {
      // Shadow (more prominent)
      doc.setFillColor(0, 0, 0, 25);
      doc.roundedRect(rightX + 6, renderedY + 6, renderedImgWidth, renderedImgHeight, 8, 8, 'F');
      
      // White frame
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(rightX - 4, renderedY - 4, renderedImgWidth + 8, renderedImgHeight + 8, 8, 8, 'F');
      
      // Highlighted border (DICA red)
      this.setDrawColorFromHex(doc, this.config.dicaBranding.primaryColor);
      doc.setLineWidth(3);
      doc.roundedRect(rightX - 4, renderedY - 4, renderedImgWidth + 8, renderedImgHeight + 8, 8, 8, 'S');
      
      // Image with CORRECT dimensions
      doc.addImage(renderedData.base64, 'JPEG', rightX, renderedY, renderedImgWidth, renderedImgHeight);
    }

    // === DECOR REFERENCE BADGE ===
    const badgeBaseY = imageY + maxHeight;
    if (content.comparisonPage?.decorReference) {
      const badgeY = badgeBaseY + 20;
      const badgeText = content.comparisonPage.decorReference;
      const badgeWidth = Math.min(renderedImgWidth + 20, doc.getTextWidth(badgeText) * 1.3 + 40);
      const badgeX = rightX + (renderedImgWidth - badgeWidth) / 2;
      
      this.setFillColorFromHex(doc, this.config.dicaBranding.primaryColor);
      doc.roundedRect(badgeX, badgeY, badgeWidth, 32, 8, 8, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeText, badgeX + badgeWidth / 2, badgeY + 20, { align: 'center' });
    }

    // === BOTTOM MESSAGE ===
    const messageY = dims.height - marginBottom - 50;
    doc.setFontSize(11);
    doc.setTextColor(130, 130, 130);
    doc.text(
      'Projection réalisée avec l\'application DICA DÉCOR • Visuel non contractuel',
      dims.width / 2,
      messageY,
      { align: 'center' }
    );

    // Premium footer
    this.renderPremiumFooter(doc, content.footer, dims, marginLeft, marginRight, marginBottom, pageNumber, totalPages);
  }

  private renderPremiumFooter(
    doc: any,
    footer: EnhancedFooterContent,
    dims: PageDimensions,
    marginLeft: number,
    marginRight: number,
    marginBottom: number,
    pageNumber: number,
    totalPages: number
  ): void {
    const footerY = dims.height - marginBottom;

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, footerY - 15, dims.width - marginRight, footerY - 15);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    // Left: Disclaimer
    doc.text(footer.disclaimer, marginLeft, footerY);

    // Center: Company info
    doc.text(`${footer.companyInfo} — ${footer.website}`, dims.width / 2, footerY, { align: 'center' });

    // Right: Page number
    if (footer.showPageNumbers) {
      doc.text(`Page ${pageNumber} / ${totalPages}`, dims.width - marginRight, footerY, { align: 'right' });
    }

    // Co-branding attribution (last page)
    if (footer.coBrandingAttribution && pageNumber === totalPages) {
      doc.setFontSize(7);
      doc.text(footer.coBrandingAttribution, dims.width / 2, footerY + 10, { align: 'center' });
    }
  }

  // ==========================================================================
  // V2 Helper Methods
  // ==========================================================================

  private setFillColorFromHex(doc: any, hex: string): void {
    const rgb = this.hexToRgb(hex);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
  }

  private setDrawColorFromHex(doc: any, hex: string): void {
    const rgb = this.hexToRgb(hex);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  }
}

