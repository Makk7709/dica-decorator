/**
 * @fileoverview Tests TDD pour PlaquettePdfService
 * Génération de plaquettes PDF DICA DÉCOR avec co-branding revendeurs
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * Total: 70+ tests couvrant tous les cas d'usage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlaquettePdfService } from '../plaquette-pdf.service';
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
  DEFAULT_APP_SETTINGS,
  FULL_DICA_LAYOUT,
  CO_BRANDED_LAYOUT,
  DEFAULT_DICA_CONTACT,
  PROJECT_TYPE_LABELS,
} from '../../types/plaquette.types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockProject = (overrides?: Partial<PlaquetteProject>): PlaquetteProject => ({
  id: 'project-123',
  name: 'Ascenseur - Résidence Les Tilleuls',
  type: 'ascenseur',
  clientName: 'Groupe Immobilier XYZ',
  clientRef: 'CLI-2024-001',
  createdAt: new Date('2024-01-15'),
  description: 'Rénovation des cabines d\'ascenseur',
  location: 'Paris 15e',
  ...overrides,
});

const createMockDecor = (overrides?: Partial<PlaquetteDecor>): PlaquetteDecor => ({
  id: 'decor-456',
  name: 'Chêne Naturel',
  referenceCode: 'CHN-2150',
  collection: 'Bois Premium',
  finish: 'Mat',
  category: 'Bois',
  colorFamily: 'Naturel',
  description: 'Texture bois chêne avec grain naturel',
  ...overrides,
});

const createMockImage = (overrides?: Partial<PlaquetteImage>): PlaquetteImage => ({
  id: 'img-789',
  url: 'https://storage.example.com/renders/render-001.jpg',
  originalUrl: 'https://storage.example.com/originals/original-001.jpg',
  decorId: 'decor-456',
  decorName: 'Chêne Naturel',
  decorCode: 'CHN-2150',
  width: 1920,
  height: 1080,
  createdAt: new Date('2024-01-15'),
  isHighResolution: true,
  ...overrides,
});

const createMockResellerBranding = (overrides?: Partial<ResellerBranding>): ResellerBranding => ({
  enabled: true,
  companyName: 'Décors Pro Paris',
  logoUrl: 'https://example.com/logo.png',
  contactName: 'Jean Dupont',
  phone: '+33 1 23 45 67 89',
  email: 'contact@decorspro.fr',
  website: 'www.decorspro.fr',
  addressLine1: '123 Avenue des Décors',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  accentColorHex: '#2563EB',
  siret: '123 456 789 00010',
  tagline: 'Votre partenaire décoration',
  ...overrides,
});

const createMockAppSettings = (overrides?: Partial<AppSettings>): AppSettings => ({
  ...DEFAULT_APP_SETTINGS,
  ...overrides,
});

const createMockGenerationOptions = (
  overrides?: Partial<PlaquetteGenerationOptions>
): PlaquetteGenerationOptions => ({
  project: createMockProject(),
  decors: [createMockDecor()],
  images: [createMockImage()],
  resellerBranding: null,
  appSettings: createMockAppSettings(),
  dicaContact: DEFAULT_DICA_CONTACT,
  ...overrides,
});

// ============================================================================
// Tests: Service Initialization
// ============================================================================

describe('PlaquettePdfService', () => {
  let service: PlaquettePdfService;

  beforeEach(() => {
    service = new PlaquettePdfService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(PlaquettePdfService);
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.pageSize).toBe('A4');
      expect(config.orientation).toBe('portrait');
    });

    it('should have default DICA branding', () => {
      const config = service.getConfig();
      expect(config.dicaBranding.companyName).toBe('DICA France');
      expect(config.dicaBranding.primaryColor).toBe('#E94E5D');
    });

    it('should have DICA website configured', () => {
      const config = service.getConfig();
      expect(config.dicaBranding.website).toBe('www.dica-france.com');
    });

    it('should have default margins in mm', () => {
      const config = service.getConfig();
      expect(config.margins.top).toBeGreaterThanOrEqual(10);
      expect(config.margins.bottom).toBeGreaterThanOrEqual(10);
      expect(config.margins.left).toBeGreaterThanOrEqual(10);
      expect(config.margins.right).toBeGreaterThanOrEqual(10);
    });
  });

  // ============================================================================
  // Tests: Reseller Branding Validation
  // ============================================================================

  describe('Reseller Branding Validation', () => {
    it('should validate complete reseller branding as valid', () => {
      const branding = createMockResellerBranding();
      const result = service.validateResellerBranding(branding);
      
      expect(result.isValid).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing company name as invalid', () => {
      const branding = createMockResellerBranding({ companyName: '' });
      const result = service.validateResellerBranding(branding);
      
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('companyName');
    });

    it('should validate branding with minimum required fields', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Company',
      };
      const result = service.validateResellerBranding(branding);
      
      expect(result.isValid).toBe(true);
      expect(result.isComplete).toBe(false);
    });

    it('should list all missing optional fields', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Company',
      };
      const result = service.validateResellerBranding(branding);
      
      expect(result.missingFields).toContain('logoUrl');
      expect(result.missingFields).toContain('email');
      expect(result.missingFields).toContain('phone');
    });

    it('should warn about invalid color format', () => {
      const branding = createMockResellerBranding({ accentColorHex: 'invalid' });
      const result = service.validateResellerBranding(branding);
      
      expect(result.warnings).toContain('invalid_accent_color');
    });

    it('should accept valid hex color formats', () => {
      const branding3 = createMockResellerBranding({ accentColorHex: '#ABC' });
      const branding6 = createMockResellerBranding({ accentColorHex: '#AABBCC' });
      
      expect(service.validateResellerBranding(branding3).warnings).not.toContain('invalid_accent_color');
      expect(service.validateResellerBranding(branding6).warnings).not.toContain('invalid_accent_color');
    });

    it('should validate email format when provided', () => {
      const invalidEmail = createMockResellerBranding({ email: 'not-an-email' });
      const result = service.validateResellerBranding(invalidEmail);
      
      expect(result.warnings).toContain('invalid_email_format');
    });

    it('should validate phone format when provided', () => {
      const invalidPhone = createMockResellerBranding({ phone: 'abc' });
      const result = service.validateResellerBranding(invalidPhone);
      
      expect(result.warnings).toContain('invalid_phone_format');
    });

    it('should validate website format when provided', () => {
      const invalidWebsite = createMockResellerBranding({ website: 'not a url' });
      const result = service.validateResellerBranding(invalidWebsite);
      
      expect(result.warnings).toContain('invalid_website_format');
    });

    it('should return null validation for null branding', () => {
      const result = service.validateResellerBranding(null);
      
      expect(result.isValid).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('all');
    });

    it('should handle disabled branding', () => {
      const branding = createMockResellerBranding({ enabled: false });
      const result = service.validateResellerBranding(branding);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('branding_disabled');
    });
  });

  // ============================================================================
  // Tests: Layout Determination
  // ============================================================================

  describe('Layout Determination', () => {
    it('should return fullDica layout when co-branding disabled globally', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: false }),
        resellerBranding: createMockResellerBranding(),
      });
      
      const layout = service.determineLayout(options);
      expect(layout.type).toBe('fullDica');
    });

    it('should return fullDica layout when no reseller branding', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: null,
      });
      
      const layout = service.determineLayout(options);
      expect(layout.type).toBe('fullDica');
    });

    it('should return coBranded layout when co-branding enabled with valid reseller', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      
      const layout = service.determineLayout(options);
      expect(layout.type).toBe('coBranded');
    });

    it('should fallback to fullDica when reseller branding incomplete', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: { enabled: true, companyName: '' },
      });
      
      const layout = service.determineLayout(options);
      expect(layout.type).toBe('fullDica');
    });

    it('should use reseller accent color when co-branded', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding({ accentColorHex: '#FF5500' }),
      });
      
      const layout = service.determineLayout(options);
      expect(layout.secondaryColor).toBe('#FF5500');
    });

    it('should preserve DICA primary color in co-branded layout', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      
      const layout = service.determineLayout(options);
      expect(layout.primaryColor).toBe('#E94E5D');
    });

    it('should have appropriate margins for fullDica', () => {
      const options = createMockGenerationOptions();
      const layout = service.determineLayout(options);
      
      expect(layout.margins.top).toBe(15);
      expect(layout.margins.bottom).toBe(15);
    });

    it('should have reduced top margin for co-branded to fit reseller block', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      
      const layout = service.determineLayout(options);
      expect(layout.margins.top).toBe(10);
      expect(layout.resellerBlockHeight).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Tests: Project Data Validation
  // ============================================================================

  describe('Project Data Validation', () => {
    it('should validate complete project data', () => {
      const options = createMockGenerationOptions();
      const result = service.validateGenerationOptions(options);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require project name', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ name: '' }),
      });
      const result = service.validateGenerationOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project_name_required');
    });

    it('should require at least one image', () => {
      const options = createMockGenerationOptions({ images: [] });
      const result = service.validateGenerationOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('images_required');
    });

    it('should require at least one decor', () => {
      const options = createMockGenerationOptions({ decors: [] });
      const result = service.validateGenerationOptions(options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('decors_required');
    });

    it('should warn about low resolution images', () => {
      const options = createMockGenerationOptions({
        images: [createMockImage({ width: 800, height: 600, isHighResolution: false })],
      });
      const result = service.validateGenerationOptions(options);
      
      expect(result.warnings).toContain('low_resolution_image');
    });

    it('should validate project type', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ type: 'ascenseur' }),
      });
      const result = service.validateGenerationOptions(options);
      
      expect(result.valid).toBe(true);
    });

    it('should accept all valid project types', () => {
      const types: Array<PlaquetteProject['type']> = [
        'ascenseur', 'restaurant', 'hotel', 'ecole', 'hopital',
        'bureau', 'van', 'cuisine', 'salle_de_bain', 'commerce', 'autre'
      ];
      
      types.forEach(type => {
        const options = createMockGenerationOptions({
          project: createMockProject({ type }),
        });
        const result = service.validateGenerationOptions(options);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ============================================================================
  // Tests: PDF Content Generation - Full DICA
  // ============================================================================

  describe('PDF Content Generation - Full DICA', () => {
    it('should generate header with DICA logo position left', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      const header = content.header;
      expect(header.logoPosition).toBe('left');
      expect(header.companyName).toBe('DICA France');
    });

    it('should include DICA tagline in header', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.header.tagline).toBe('Projection de décors stratifiés');
    });

    it('should generate project title block', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.projectBlock.title).toBe('Ascenseur - Résidence Les Tilleuls');
      expect(content.projectBlock.type).toBe('Ascenseur');
    });

    it('should format project date correctly', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ createdAt: new Date('2024-03-15') }),
      });
      const content = service.generateContent(options);
      
      expect(content.projectBlock.date).toMatch(/mars 2024/i);
    });

    it('should include client name when provided', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ clientName: 'Client Test' }),
      });
      const content = service.generateContent(options);
      
      expect(content.projectBlock.clientName).toBe('Client Test');
    });

    it('should generate image block with correct dimensions', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.imageBlocks).toHaveLength(1);
      expect(content.imageBlocks[0].imageUrl).toBe('https://storage.example.com/renders/render-001.jpg');
    });

    it('should include decor information below image', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.imageBlocks[0].decorName).toBe('Chêne Naturel');
      expect(content.imageBlocks[0].decorCode).toBe('CHN-2150');
    });

    it('should include decor collection and finish', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.imageBlocks[0].collection).toBe('Bois Premium');
      expect(content.imageBlocks[0].finish).toBe('Mat');
    });

    it('should generate DICA footer', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.footer.companyInfo).toContain('DICA France');
      expect(content.footer.website).toBe('www.dica-france.com');
    });

    it('should include disclaimer in footer', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.footer.disclaimer).toContain('non contractuel');
    });

    it('should include page numbers', () => {
      const options = createMockGenerationOptions();
      const content = service.generateContent(options);
      
      expect(content.footer.showPageNumbers).toBe(true);
    });
  });

  // ============================================================================
  // Tests: PDF Content Generation - Co-Branded
  // ============================================================================

  describe('PDF Content Generation - Co-Branded', () => {
    it('should include reseller block at top when co-branded', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock).toBeDefined();
      expect(content.resellerBlock?.companyName).toBe('Décors Pro Paris');
    });

    it('should include reseller logo when provided', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock?.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should fallback to company name when logo missing', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding({ logoUrl: undefined }),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock?.logoUrl).toBeUndefined();
      expect(content.resellerBlock?.showNameInsteadOfLogo).toBe(true);
    });

    it('should include reseller contact info', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock?.email).toBe('contact@decorspro.fr');
      expect(content.resellerBlock?.phone).toBe('+33 1 23 45 67 89');
    });

    it('should include reseller website', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock?.website).toBe('www.decorspro.fr');
    });

    it('should add small DICA strip at very top in co-branded mode', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.header.dicaStripText).toBe('App DICA DÉCOR');
      expect(content.header.dicaStripHeight).toBeLessThan(15);
    });

    it('should maintain DICA visibility in footer for co-branded', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.footer.companyInfo).toContain('DICA');
    });

    it('should add co-branding attribution in footer', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.footer.coBrandingAttribution).toContain('Décors Pro Paris');
      expect(content.footer.coBrandingAttribution).toContain('DICA DÉCOR');
    });

    it('should use reseller accent color for titles when defined', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding({ accentColorHex: '#0066CC' }),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock?.accentColor).toBe('#0066CC');
    });

    it('should not have reseller block when co-branding disabled', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: false }),
        resellerBranding: createMockResellerBranding(),
      });
      const content = service.generateContent(options);
      
      expect(content.resellerBlock).toBeUndefined();
    });
  });

  // ============================================================================
  // Tests: Image Handling
  // ============================================================================

  describe('Image Handling', () => {
    it('should calculate optimal image dimensions for A4', () => {
      const dims = service.calculateImageDimensions(1920, 1080, 'A4', 0.8);
      
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
      expect(dims.width / dims.height).toBeCloseTo(1920 / 1080, 1);
    });

    it('should maintain aspect ratio', () => {
      const dims = service.calculateImageDimensions(800, 600, 'A4', 0.8);
      const originalRatio = 800 / 600;
      const calculatedRatio = dims.width / dims.height;
      
      expect(calculatedRatio).toBeCloseTo(originalRatio, 2);
    });

    it('should fit image within content area', () => {
      const contentWidth = service.getContentWidth('A4', FULL_DICA_LAYOUT);
      const dims = service.calculateImageDimensions(3000, 2000, 'A4', 0.8);
      
      expect(dims.width).toBeLessThanOrEqual(contentWidth * 0.8);
    });

    it('should flag low resolution images', () => {
      const result = service.checkImageResolution(800, 600, 1600);
      
      expect(result.isHighResolution).toBe(false);
      expect(result.warning).toBe('image_below_minimum_resolution');
    });

    it('should accept high resolution images', () => {
      const result = service.checkImageResolution(1920, 1080, 1600);
      
      expect(result.isHighResolution).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should recommend optimal resolution', () => {
      const result = service.checkImageResolution(800, 600, 1600);
      
      expect(result.recommendedWidth).toBeGreaterThanOrEqual(1600);
    });

    it('should handle portrait images', () => {
      const dims = service.calculateImageDimensions(1080, 1920, 'A4', 0.8);
      
      expect(dims.height).toBeGreaterThan(dims.width);
    });

    it('should handle square images', () => {
      const dims = service.calculateImageDimensions(1000, 1000, 'A4', 0.8);
      
      expect(dims.width).toBeCloseTo(dims.height, 0);
    });
  });

  // ============================================================================
  // Tests: PDF Generation
  // ============================================================================

  describe('PDF Generation', () => {
    it('should generate PDF blob', async () => {
      const options = createMockGenerationOptions();
      
      // Mock fetch for image loading
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      const result = await service.generatePlaquette(options);
      
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should generate correct filename', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ name: 'Test Project 2024' }),
      });
      
      const filename = service.generateFilename(options);
      
      expect(filename).toMatch(/^dica-plaquette-test-project-2024-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should sanitize special characters in filename', () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ name: 'Café & Résidence "Les Tilleuls"' }),
      });
      
      const filename = service.generateFilename(options);
      
      expect(filename).not.toMatch(/[&"']/);
      expect(filename).toMatch(/cafe/i);
    });

    it('should include reseller in filename when co-branded', () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      
      const filename = service.generateFilename(options);
      
      expect(filename).toContain('decors-pro-paris');
    });

    it('should return page count in result', async () => {
      const options = createMockGenerationOptions({
        images: [createMockImage(), createMockImage({ id: 'img-2' })],
      });
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      const result = await service.generatePlaquette(options);
      
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('should return metadata in result', async () => {
      const options = createMockGenerationOptions();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      const result = await service.generatePlaquette(options);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toContain('Ascenseur');
      expect(result.metadata?.author).toBe('DICA France');
    });

    it('should set isCoBranded in metadata', async () => {
      const options = createMockGenerationOptions({
        appSettings: createMockAppSettings({ resellerBrandingEnabled: true }),
        resellerBranding: createMockResellerBranding(),
      });
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      const result = await service.generatePlaquette(options);
      
      expect(result.metadata?.isCoBranded).toBe(true);
      expect(result.metadata?.resellerName).toBe('Décors Pro Paris');
    });

    it('should handle image load failure gracefully', async () => {
      const options = createMockGenerationOptions();
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await service.generatePlaquette(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('image');
    });
  });

  // ============================================================================
  // Tests: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw PlaquetteError for invalid project', async () => {
      const options = createMockGenerationOptions({
        project: createMockProject({ name: '', id: '' }),
      });
      
      await expect(service.generatePlaquette(options))
        .rejects.toThrow(PlaquetteError);
    });

    it('should include error code in PlaquetteError', async () => {
      const options = createMockGenerationOptions({ images: [] });
      
      try {
        await service.generatePlaquette(options);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PlaquetteError);
        expect((error as PlaquetteError).code).toBe(PlaquetteErrorCode.NO_IMAGES);
      }
    });

    it('should handle missing decor gracefully', async () => {
      const options = createMockGenerationOptions({ decors: [] });
      
      try {
        await service.generatePlaquette(options);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as PlaquetteError).code).toBe(PlaquetteErrorCode.INVALID_DECOR);
      }
    });

    it('should emit error event on failure', async () => {
      const options = createMockGenerationOptions({ images: [] });
      const errorHandler = vi.fn();
      
      service.onError(errorHandler);
      
      try {
        await service.generatePlaquette(options);
      } catch {
        // Expected
      }
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should allow unsubscribing from error events', () => {
      const errorHandler = vi.fn();
      const unsubscribe = service.onError(errorHandler);
      
      unsubscribe();
      
      service.emitError(new PlaquetteError('Test', PlaquetteErrorCode.NO_IMAGES));
      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests: Comparison Layout
  // ============================================================================

  describe('Comparison Layout', () => {
    it('should include comparison when requested', () => {
      const options = createMockGenerationOptions({
        includeComparison: true,
        originalImage: 'https://example.com/original.jpg',
      });
      
      const content = service.generateContent(options);
      
      expect(content.comparisonBlock).toBeDefined();
      expect(content.comparisonBlock?.originalImage).toBe('https://example.com/original.jpg');
    });

    it('should not include comparison when no original image', () => {
      const options = createMockGenerationOptions({
        includeComparison: true,
        originalImage: undefined,
      });
      
      const content = service.generateContent(options);
      
      expect(content.comparisonBlock).toBeUndefined();
    });

    it('should layout comparison as before/after', () => {
      const options = createMockGenerationOptions({
        includeComparison: true,
        originalImage: 'https://example.com/original.jpg',
      });
      
      const content = service.generateContent(options);
      
      expect(content.comparisonBlock?.layout).toBe('side-by-side');
    });
  });

  // ============================================================================
  // Tests: Multi-Page Generation
  // ============================================================================

  describe('Multi-Page Generation', () => {
    it('should create multiple pages for multiple images', () => {
      const options = createMockGenerationOptions({
        images: [
          createMockImage({ id: 'img-1' }),
          createMockImage({ id: 'img-2' }),
          createMockImage({ id: 'img-3' }),
        ],
      });
      
      const content = service.generateContent(options);
      
      expect(content.imageBlocks.length).toBe(3);
    });

    it('should maintain consistent header across pages', () => {
      const options = createMockGenerationOptions({
        images: [
          createMockImage({ id: 'img-1' }),
          createMockImage({ id: 'img-2' }),
        ],
      });
      
      const content = service.generateContent(options);
      
      expect(content.header).toBeDefined();
      // Header configuration is used for all pages
    });

    it('should show correct page numbers', () => {
      const options = createMockGenerationOptions({
        images: [
          createMockImage({ id: 'img-1' }),
          createMockImage({ id: 'img-2' }),
        ],
      });
      
      const content = service.generateContent(options);
      
      expect(content.totalPages).toBe(2);
    });
  });

  // ============================================================================
  // Tests: Progress Events
  // ============================================================================

  describe('Progress Events', () => {
    it('should emit progress events during generation', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      expect(progressHandler).toHaveBeenCalled();
    });

    it('should report validation stage', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'validating' })
      );
    });

    it('should report image loading stage', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'loading_images' })
      );
    });

    it('should report generating stage', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'generating' })
      );
    });

    it('should report finalizing stage', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'finalizing' })
      );
    });

    it('should report progress percentage', async () => {
      const options = createMockGenerationOptions();
      const progressHandler = vi.fn();
      
      global.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      });
      
      await service.generatePlaquette(options, progressHandler);
      
      const lastCall = progressHandler.mock.calls[progressHandler.mock.calls.length - 1][0];
      expect(lastCall.progress).toBe(100);
    });
  });

  // ============================================================================
  // Tests: Utility Methods
  // ============================================================================

  describe('Utility Methods', () => {
    it('should format date in French locale', () => {
      const date = new Date('2024-03-15');
      const formatted = service.formatDateFr(date, 'long');
      
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/mars/i);
      expect(formatted).toMatch(/2024/);
    });

    it('should format short date', () => {
      const date = new Date('2024-03-15');
      const formatted = service.formatDateFr(date, 'short');
      
      expect(formatted).toMatch(/15\/03\/2024|03\/15\/2024/);
    });

    it('should get project type label in French', () => {
      const label = service.getProjectTypeLabel('ascenseur');
      expect(label).toBe('Ascenseur');
    });

    it('should return type for unknown project type', () => {
      const label = service.getProjectTypeLabel('unknown' as any);
      expect(label).toBe('unknown');
    });

    it('should convert mm to points', () => {
      const points = service.mmToPoints(10);
      // 1mm = 2.834645669 points
      expect(points).toBeCloseTo(28.35, 1);
    });

    it('should get A4 dimensions in points', () => {
      const dims = service.getPageDimensionsPt('A4', 'portrait');
      
      expect(dims.width).toBeCloseTo(595.28, 0);
      expect(dims.height).toBeCloseTo(841.89, 0);
    });

    it('should swap dimensions for landscape', () => {
      const portrait = service.getPageDimensionsPt('A4', 'portrait');
      const landscape = service.getPageDimensionsPt('A4', 'landscape');
      
      expect(landscape.width).toBeCloseTo(portrait.height, 0);
      expect(landscape.height).toBeCloseTo(portrait.width, 0);
    });

    it('should calculate content width correctly', () => {
      const width = service.getContentWidth('A4', FULL_DICA_LAYOUT);
      const pageWidth = service.getPageDimensionsPt('A4', 'portrait').width;
      const expectedWidth = pageWidth - service.mmToPoints(15) - service.mmToPoints(15);
      
      expect(width).toBeCloseTo(expectedWidth, 0);
    });
  });
});

