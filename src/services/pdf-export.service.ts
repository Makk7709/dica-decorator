/**
 * @fileoverview PDFExportService - Service d'export PDF
 * Génération de plaquettes commerciales et devis professionnels
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PageSize = 'A4' | 'A3' | 'Letter';
export type PageOrientation = 'portrait' | 'landscape';
export type PDFTemplate = 'plaquette' | 'devis' | 'comparison';
export type DateFormat = 'short' | 'long' | 'full';

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FontSizes {
  title: number;
  subtitle: number;
  body: number;
  small: number;
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor?: string;
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  website?: string;
}

export interface HeaderConfig {
  showLogo?: boolean;
  logoPosition?: 'left' | 'center' | 'right';
  title?: string;
  showDate?: boolean;
  customText?: string;
}

export interface FooterConfig {
  showPageNumbers?: boolean;
  pageNumberFormat?: string;
  showCompanyInfo?: boolean;
  customText?: string;
}

export interface PDFConfig {
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: Margins;
  defaultFont: string;
  fontSize: FontSizes;
  branding: BrandingConfig;
  header: HeaderConfig;
  footer: FooterConfig;
}

export interface RenderInfo {
  imageUrl: string;
  decorName: string;
  decorCode: string;
  description?: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface PlaquetteData {
  projectTitle: string;
  clientName: string;
  clientRef?: string;
  date: Date;
  renders: RenderInfo[];
  contactInfo?: ContactInfo;
  includeComparison?: boolean;
  notes?: string;
}

export interface ClientInfo {
  name: string;
  address: string;
  contact: string;
  email: string;
}

export interface DevisItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

export interface DevisData {
  reference: string;
  date: Date;
  validUntil: Date;
  client: ClientInfo;
  items: DevisItem[];
  conditions?: string;
  notes?: string;
}

export interface ComparisonData {
  title: string;
  originalImage: string;
  renders: RenderInfo[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DevisTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export interface ContentElement {
  type: 'text' | 'image' | 'table' | 'divider' | 'spacer' | 'qrcode';
  content?: string;
  src?: string;
  data?: string;
  headers?: string[];
  rows?: string[][];
  height?: number;
  size?: number;
  label?: string;
  style: Record<string, any>;
}

export interface PageContent {
  type: 'cover' | 'content' | 'render' | 'comparison';
  elements: ContentElement[];
}

export interface PDFContent {
  pages: PageContent[];
  metadata: Record<string, any>;
}

export interface PageDimensions {
  width: number;
  height: number;
}

export interface ContentArea {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface GridLayout {
  columns: number;
  rows: number;
}

export interface ColorPalette {
  primary: string;
  light: string;
  dark: string;
}

// ============================================================================
// Error Class
// ============================================================================

export class PDFExportError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PDFExportError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PDFConfig = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 40, bottom: 40, left: 40, right: 40 },
  defaultFont: 'Helvetica',
  fontSize: { title: 24, subtitle: 18, body: 12, small: 10 },
  branding: {
    primaryColor: '#E94E5D',
    secondaryColor: '#333333',
    companyName: 'DICA France',
    tagline: 'Expert en stratifiés HPL',
  },
  header: {
    showLogo: true,
    logoPosition: 'left',
    showDate: true,
  },
  footer: {
    showPageNumbers: true,
    pageNumberFormat: 'Page {current} / {total}',
    showCompanyInfo: true,
  },
};

const PRESETS: Record<string, Partial<PDFConfig>> = {
  'dica-commercial': {
    branding: {
      primaryColor: '#E94E5D',
      secondaryColor: '#333333',
      companyName: 'DICA France',
      tagline: 'Expert en stratifiés HPL',
      website: 'www.dica-france.com',
    },
    header: {
      showLogo: true,
      logoPosition: 'left',
    },
  },
  'minimal': {
    header: {
      showLogo: false,
    },
    footer: {
      showPageNumbers: true,
      showCompanyInfo: false,
    },
  },
};

// Page sizes in points (72 points = 1 inch)
const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 },
};

// ============================================================================
// Service Implementation
// ============================================================================

export class PDFExportService {
  private config: PDFConfig;
  private errorListeners: Array<(error: PDFExportError) => void> = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): PDFConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  configure(options: Partial<PDFConfig>): void {
    if (options.margins) {
      this.validateMargins(options.margins);
    }
    if (options.fontSize) {
      this.validateFontSizes(options.fontSize);
    }
    
    this.config = this.mergeConfig(this.config, options);
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  applyPreset(presetName: string): void {
    const preset = PRESETS[presetName];
    if (preset) {
      this.config = this.mergeConfig(this.config, preset);
    }
  }

  private mergeConfig(base: PDFConfig, overrides: Partial<PDFConfig>): PDFConfig {
    return {
      ...base,
      ...overrides,
      margins: { ...base.margins, ...(overrides.margins || {}) },
      fontSize: { ...base.fontSize, ...(overrides.fontSize || {}) },
      branding: { ...base.branding, ...(overrides.branding || {}) },
      header: { ...base.header, ...(overrides.header || {}) },
      footer: { ...base.footer, ...(overrides.footer || {}) },
    };
  }

  private validateMargins(margins: Partial<Margins>): void {
    const values = Object.values(margins);
    if (values.some(v => v !== undefined && v < 0)) {
      throw new PDFExportError('Margins must be non-negative', 'INVALID_CONFIG');
    }
  }

  private validateFontSizes(sizes: Partial<FontSizes>): void {
    const values = Object.values(sizes);
    if (values.some(v => v !== undefined && v <= 0)) {
      throw new PDFExportError('Font sizes must be positive', 'INVALID_CONFIG');
    }
  }

  // --------------------------------------------------------------------------
  // Branding Methods
  // --------------------------------------------------------------------------

  setBranding(branding: Partial<BrandingConfig>): void {
    if (branding.primaryColor && !this.isValidColor(branding.primaryColor)) {
      throw new PDFExportError('Invalid primary color format', 'INVALID_COLOR');
    }
    if (branding.secondaryColor && !this.isValidColor(branding.secondaryColor)) {
      throw new PDFExportError('Invalid secondary color format', 'INVALID_COLOR');
    }
    
    this.config.branding = { ...this.config.branding, ...branding };
  }

  private isValidColor(color: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  }

  getColorPalette(): ColorPalette {
    const primary = this.config.branding.primaryColor;
    return {
      primary,
      light: this.lightenColor(primary, 30),
      dark: this.darkenColor(primary, 30),
    };
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  // --------------------------------------------------------------------------
  // Header & Footer Methods
  // --------------------------------------------------------------------------

  setHeader(header: HeaderConfig): void {
    this.config.header = { ...this.config.header, ...header };
  }

  setFooter(footer: FooterConfig): void {
    this.config.footer = { ...this.config.footer, ...footer };
  }

  formatPageNumber(current: number, total: number): string {
    const format = this.config.footer.pageNumberFormat || 'Page {current} / {total}';
    return format.replace('{current}', String(current)).replace('{total}', String(total));
  }

  generateHeaderContent(): { elements: ContentElement[] } {
    const elements: ContentElement[] = [];
    
    if (this.config.header.showLogo && this.config.branding.logoUrl) {
      elements.push(this.createImageElement(this.config.branding.logoUrl, {
        width: 100,
        height: 40,
      }));
    }
    
    if (this.config.header.title) {
      elements.push(this.createTextElement(this.config.header.title, {
        fontSize: this.config.fontSize.subtitle,
        fontWeight: 'bold',
      }));
    }
    
    return { elements };
  }

  // --------------------------------------------------------------------------
  // Validation Methods
  // --------------------------------------------------------------------------

  validatePlaquetteData(data: PlaquetteData): ValidationResult {
    const errors: string[] = [];
    
    if (!data.projectTitle || data.projectTitle.trim() === '') {
      errors.push('project_title_required');
    }
    if (!data.renders || data.renders.length === 0) {
      errors.push('renders_required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  validateDevisData(data: DevisData): ValidationResult {
    const errors: string[] = [];
    
    if (!data.reference || data.reference.trim() === '') {
      errors.push('reference_required');
    }
    if (!data.items || data.items.length === 0) {
      errors.push('items_required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  validateComparisonData(data: ComparisonData): ValidationResult {
    const errors: string[] = [];
    
    if (!data.renders || data.renders.length < 2) {
      errors.push('min_two_renders_required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // --------------------------------------------------------------------------
  // Content Generation Methods
  // --------------------------------------------------------------------------

  generateContent(template: PDFTemplate, data: any): PDFContent {
    switch (template) {
      case 'plaquette':
        return this.generatePlaquetteContent(data as PlaquetteData);
      case 'devis':
        return this.generateDevisContent(data as DevisData);
      case 'comparison':
        return this.generateComparisonContent(data as ComparisonData);
      default:
        throw new PDFExportError(`Unknown template: ${template}`, 'INVALID_TEMPLATE');
    }
  }

  generatePlaquetteContent(data: PlaquetteData): PDFContent {
    const pages: PageContent[] = [];
    
    // Cover page
    pages.push({
      type: 'cover',
      elements: [
        this.createTextElement(data.projectTitle, {
          fontSize: this.config.fontSize.title,
          fontWeight: 'bold',
          color: this.config.branding.primaryColor,
        }),
        this.createSpacerElement(20),
        this.createTextElement(data.clientName, {
          fontSize: this.config.fontSize.subtitle,
        }),
        this.createSpacerElement(10),
        this.createTextElement(this.formatDate(data.date, 'long'), {
          fontSize: this.config.fontSize.body,
          color: '#666666',
        }),
      ],
    });
    
    // Render pages
    data.renders.forEach((render, index) => {
      pages.push({
        type: 'render',
        elements: [
          this.createImageElement(render.imageUrl, {
            width: 400,
            height: 300,
            fit: 'contain',
          }),
          this.createSpacerElement(20),
          this.createTextElement(render.decorName, {
            fontSize: this.config.fontSize.subtitle,
            fontWeight: 'bold',
          }),
          this.createTextElement(`Réf: ${render.decorCode}`, {
            fontSize: this.config.fontSize.body,
            color: '#666666',
          }),
          render.description ? this.createTextElement(render.description, {
            fontSize: this.config.fontSize.body,
          }) : this.createSpacerElement(0),
        ],
      });
    });
    
    // Comparison page (if multiple renders)
    if (data.includeComparison && data.renders.length >= 2) {
      pages.push({
        type: 'comparison',
        elements: [
          this.createTextElement('Comparaison des finitions', {
            fontSize: this.config.fontSize.subtitle,
            fontWeight: 'bold',
          }),
        ],
      });
    }
    
    return {
      pages,
      metadata: {
        title: `Plaquette - ${data.projectTitle}`,
        author: this.config.branding.companyName,
        created: new Date().toISOString(),
      },
    };
  }

  generateDevisContent(data: DevisData): PDFContent {
    const totals = this.calculateDevisTotals(data.items);
    
    const pages: PageContent[] = [{
      type: 'content',
      elements: [
        this.createTextElement('DEVIS', {
          fontSize: this.config.fontSize.title,
          fontWeight: 'bold',
          color: this.config.branding.primaryColor,
        }),
        this.createTextElement(`Référence: ${data.reference}`, {
          fontSize: this.config.fontSize.body,
        }),
        this.createTextElement(`Date: ${this.formatDate(data.date, 'long')}`, {
          fontSize: this.config.fontSize.body,
        }),
        this.createTextElement(`Valide jusqu'au: ${this.formatDate(data.validUntil, 'long')}`, {
          fontSize: this.config.fontSize.body,
        }),
        this.createSpacerElement(30),
        this.createTextElement('Client', {
          fontSize: this.config.fontSize.subtitle,
          fontWeight: 'bold',
        }),
        this.createTextElement(data.client.name, {
          fontSize: this.config.fontSize.body,
        }),
        this.createTextElement(data.client.address, {
          fontSize: this.config.fontSize.body,
        }),
        this.createSpacerElement(30),
        this.createTableElement({
          headers: ['Description', 'Qté', 'Prix unit.', 'Total'],
          rows: data.items.map(item => [
            item.description,
            `${item.quantity} ${item.unit || ''}`,
            this.formatCurrency(item.unitPrice),
            this.formatCurrency(item.quantity * item.unitPrice),
          ]),
        }),
        this.createSpacerElement(20),
        this.createTextElement(`Sous-total HT: ${this.formatCurrency(totals.subtotal)}`, {
          fontSize: this.config.fontSize.body,
        }),
        this.createTextElement(`TVA (20%): ${this.formatCurrency(totals.tax)}`, {
          fontSize: this.config.fontSize.body,
        }),
        this.createTextElement(`Total TTC: ${this.formatCurrency(totals.total)}`, {
          fontSize: this.config.fontSize.subtitle,
          fontWeight: 'bold',
          color: this.config.branding.primaryColor,
        }),
      ],
    }];
    
    return {
      pages,
      metadata: {
        title: `Devis ${data.reference}`,
        author: this.config.branding.companyName,
      },
    };
  }

  generateComparisonContent(data: ComparisonData): PDFContent {
    const layout = this.calculateComparisonLayout(data.renders.length);
    
    return {
      pages: [{
        type: 'comparison',
        elements: [
          this.createTextElement(data.title, {
            fontSize: this.config.fontSize.title,
            fontWeight: 'bold',
          }),
        ],
      }],
      metadata: {
        title: data.title,
        layout,
      },
    };
  }

  calculateDevisTotals(items: DevisItem[], taxRate: number = 20): DevisTotals {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  }

  calculateComparisonLayout(renderCount: number): GridLayout {
    if (renderCount <= 2) return { columns: 2, rows: 1 };
    if (renderCount <= 4) return { columns: 2, rows: 2 };
    return { columns: 3, rows: Math.ceil(renderCount / 3) };
  }

  // --------------------------------------------------------------------------
  // Element Creation Methods
  // --------------------------------------------------------------------------

  createTextElement(content: string, style: Record<string, any> = {}): ContentElement {
    return {
      type: 'text',
      content,
      style: {
        fontSize: this.config.fontSize.body,
        color: '#000000',
        ...style,
      },
    };
  }

  createImageElement(src: string, style: Record<string, any> = {}): ContentElement {
    return {
      type: 'image',
      src,
      style: {
        fit: 'contain',
        ...style,
      },
    };
  }

  createTableElement(data: { headers: string[]; rows: string[][] }): ContentElement {
    return {
      type: 'table',
      headers: data.headers,
      rows: data.rows,
      style: {},
    };
  }

  createDividerElement(style: Record<string, any> = {}): ContentElement {
    return {
      type: 'divider',
      style: {
        color: '#CCCCCC',
        thickness: 1,
        margin: 10,
        ...style,
      },
    };
  }

  createSpacerElement(height: number): ContentElement {
    return {
      type: 'spacer',
      height,
      style: {},
    };
  }

  createQRCodeElement(data: string, options: { size?: number; label?: string } = {}): ContentElement {
    return {
      type: 'qrcode',
      data,
      size: options.size || 100,
      label: options.label,
      style: {},
    };
  }

  // --------------------------------------------------------------------------
  // Export Methods
  // --------------------------------------------------------------------------

  async generatePDFBlob(content: PDFContent): Promise<Blob> {
    // This would use jsPDF or similar library in actual implementation
    // For now, return a mock blob
    const pdfContent = JSON.stringify(content);
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  async generateDataUrl(content: PDFContent): Promise<string> {
    const blob = await this.generatePDFBlob(content);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  generateFilename(options: {
    template: PDFTemplate;
    projectTitle?: string;
    date: Date;
  }): string {
    const sanitizedTitle = options.projectTitle
      ? this.sanitizeFilename(options.projectTitle)
      : '';
    const dateStr = options.date.toISOString().split('T')[0];
    
    const parts = [
      'dica',
      options.template,
      sanitizedTitle,
      dateStr,
    ].filter(Boolean);
    
    return `${parts.join('-')}.pdf`;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  async downloadPDF(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  formatDate(date: Date, format: DateFormat): string {
    const options: Intl.DateTimeFormatOptions = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    }[format];
    
    return date.toLocaleDateString('fr-FR', options);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).replace('€', '').trim() + ' €';
  }

  mmToPoints(mm: number): number {
    return mm * 2.834645669;
  }

  getPageDimensions(size: PageSize, orientation: PageOrientation): PageDimensions {
    const dims = PAGE_SIZES[size];
    if (orientation === 'landscape') {
      return { width: dims.height, height: dims.width };
    }
    return { ...dims };
  }

  getContentArea(): ContentArea {
    const dims = this.getPageDimensions(this.config.pageSize, this.config.orientation);
    const { margins } = this.config;
    
    return {
      x: margins.left,
      y: margins.top,
      width: dims.width - margins.left - margins.right,
      height: dims.height - margins.top - margins.bottom,
    };
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const avgCharWidth = fontSize * 0.5;
    const charsPerLine = Math.floor(maxWidth / avgCharWidth);
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  onError(callback: (error: PDFExportError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) this.errorListeners.splice(index, 1);
    };
  }

  emitError(error: PDFExportError): void {
    this.errorListeners.forEach(listener => listener(error));
  }
}

