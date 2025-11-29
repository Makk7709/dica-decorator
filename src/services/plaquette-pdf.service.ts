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
}

