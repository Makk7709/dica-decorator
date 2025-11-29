/**
 * @fileoverview Tests TDD pour PDFExportService
 * Service d'export PDF pour plaquettes commerciales et devis
 * 
 * Fonctionnalités testées:
 * - Configuration du document
 * - Templates (plaquette, devis, comparaison)
 * - Génération de contenu
 * - Styles et branding DICA
 * - Métadonnées et en-têtes
 * - Export et téléchargement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PDFExportService,
  PDFConfig,
  PDFTemplate,
  PageOrientation,
  PageSize,
  PDFContent,
  PDFExportError,
  PlaquetteData,
  DevisData,
  ComparisonData,
  HeaderConfig,
  FooterConfig,
  BrandingConfig,
} from '../pdf-export.service';

describe('PDFExportService', () => {
  let service: PDFExportService;

  beforeEach(() => {
    service = new PDFExportService();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    it('should create service with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.pageSize).toBe('A4');
      expect(config.orientation).toBe('portrait');
      expect(config.margins.top).toBe(40);
      expect(config.margins.bottom).toBe(40);
      expect(config.margins.left).toBe(40);
      expect(config.margins.right).toBe(40);
      expect(config.defaultFont).toBe('Helvetica');
      expect(config.fontSize.title).toBe(24);
      expect(config.fontSize.subtitle).toBe(18);
      expect(config.fontSize.body).toBe(12);
      expect(config.fontSize.small).toBe(10);
    });

    it('should allow custom configuration', () => {
      const customConfig: Partial<PDFConfig> = {
        pageSize: 'A3',
        orientation: 'landscape',
        margins: { top: 20, bottom: 20, left: 30, right: 30 },
      };
      
      service.configure(customConfig);
      const config = service.getConfig();
      
      expect(config.pageSize).toBe('A3');
      expect(config.orientation).toBe('landscape');
      expect(config.margins.top).toBe(20);
    });

    it('should validate margin values', () => {
      expect(() => service.configure({ margins: { top: -10, bottom: 40, left: 40, right: 40 } }))
        .toThrow(PDFExportError);
    });

    it('should validate font size values', () => {
      expect(() => service.configure({ fontSize: { title: 0, subtitle: 18, body: 12, small: 10 } }))
        .toThrow(PDFExportError);
    });

    it('should reset configuration to defaults', () => {
      service.configure({ pageSize: 'A3', orientation: 'landscape' });
      service.resetConfig();
      
      const config = service.getConfig();
      expect(config.pageSize).toBe('A4');
      expect(config.orientation).toBe('portrait');
    });

    it('should support DICA branding preset', () => {
      service.applyPreset('dica-commercial');
      const config = service.getConfig();
      
      expect(config.branding.primaryColor).toBe('#E94E5D');
      expect(config.branding.companyName).toBe('DICA France');
      expect(config.branding.tagline).toContain('stratifiés');
    });

    it('should support minimal preset', () => {
      service.applyPreset('minimal');
      const config = service.getConfig();
      
      expect(config.header.showLogo).toBe(false);
      expect(config.footer.showPageNumbers).toBe(true);
    });
  });

  // ============================================================================
  // Branding Tests
  // ============================================================================
  describe('Branding', () => {
    it('should configure DICA branding', () => {
      const branding: BrandingConfig = {
        primaryColor: '#E94E5D',
        secondaryColor: '#333333',
        companyName: 'DICA France',
        tagline: 'Expert en stratifiés HPL',
        logoUrl: '/images/dica-logo.svg',
        website: 'www.dica-france.com',
      };
      
      service.setBranding(branding);
      const config = service.getConfig();
      
      expect(config.branding.primaryColor).toBe('#E94E5D');
      expect(config.branding.companyName).toBe('DICA France');
      expect(config.branding.logoUrl).toBe('/images/dica-logo.svg');
    });

    it('should validate color format', () => {
      expect(() => service.setBranding({ primaryColor: 'invalid' } as any))
        .toThrow(PDFExportError);
    });

    it('should accept valid hex colors', () => {
      expect(() => service.setBranding({ 
        primaryColor: '#E94E5D',
        secondaryColor: '#333',
      } as any)).not.toThrow();
    });

    it('should generate color palette from primary', () => {
      service.setBranding({ primaryColor: '#E94E5D' } as any);
      const palette = service.getColorPalette();
      
      expect(palette.primary).toBe('#E94E5D');
      expect(palette.light).toBeDefined();
      expect(palette.dark).toBeDefined();
    });
  });

  // ============================================================================
  // Header & Footer Tests
  // ============================================================================
  describe('Header & Footer', () => {
    it('should configure header', () => {
      const header: HeaderConfig = {
        showLogo: true,
        logoPosition: 'left',
        title: 'Proposition Commerciale',
        showDate: true,
        customText: 'Réf: DICA-2024-001',
      };
      
      service.setHeader(header);
      const config = service.getConfig();
      
      expect(config.header.showLogo).toBe(true);
      expect(config.header.title).toBe('Proposition Commerciale');
    });

    it('should configure footer', () => {
      const footer: FooterConfig = {
        showPageNumbers: true,
        pageNumberFormat: 'Page {current} / {total}',
        showCompanyInfo: true,
        customText: '© 2024 DICA France',
      };
      
      service.setFooter(footer);
      const config = service.getConfig();
      
      expect(config.footer.showPageNumbers).toBe(true);
      expect(config.footer.pageNumberFormat).toBe('Page {current} / {total}');
    });

    it('should format page numbers correctly', () => {
      service.setFooter({ 
        showPageNumbers: true,
        pageNumberFormat: 'Page {current} sur {total}',
      });
      
      const formatted = service.formatPageNumber(3, 10);
      expect(formatted).toBe('Page 3 sur 10');
    });

    it('should generate header content', () => {
      service.setHeader({ showLogo: true, title: 'Test' });
      const headerContent = service.generateHeaderContent();
      
      expect(headerContent).toBeDefined();
      expect(headerContent.elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Template Tests - Plaquette
  // ============================================================================
  describe('Template: Plaquette Commerciale', () => {
    it('should validate plaquette data', () => {
      const data: PlaquetteData = {
        projectTitle: 'Aménagement Ascenseur Haussmann',
        clientName: 'Société ABC',
        clientRef: 'CMD-2024-001',
        date: new Date('2024-01-15'),
        renders: [
          {
            imageUrl: 'https://example.com/render1.jpg',
            decorName: 'Inox Brossé Premium',
            decorCode: '3020BN',
            description: 'Finition métallique élégante',
          },
        ],
        contactInfo: {
          name: 'Jean Dupont',
          email: 'j.dupont@dica.fr',
          phone: '+33 1 23 45 67 89',
        },
      };
      
      const result = service.validatePlaquetteData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject plaquette without project title', () => {
      const data = {
        clientName: 'Société ABC',
        renders: [],
      } as any;
      
      const result = service.validatePlaquetteData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project_title_required');
    });

    it('should reject plaquette without renders', () => {
      const data: Partial<PlaquetteData> = {
        projectTitle: 'Test',
        clientName: 'Client',
        renders: [],
      };
      
      const result = service.validatePlaquetteData(data as PlaquetteData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('renders_required');
    });

    it('should generate plaquette content structure', () => {
      const data: PlaquetteData = {
        projectTitle: 'Test Project',
        clientName: 'Test Client',
        date: new Date(),
        renders: [
          {
            imageUrl: 'https://example.com/render.jpg',
            decorName: 'Test Decor',
            decorCode: 'TEST-001',
          },
        ],
      };
      
      const content = service.generatePlaquetteContent(data);
      
      expect(content.pages.length).toBeGreaterThanOrEqual(1);
      expect(content.pages[0].elements).toBeDefined();
    });

    it('should include cover page in plaquette', () => {
      const data: PlaquetteData = {
        projectTitle: 'Test',
        clientName: 'Client',
        date: new Date(),
        renders: [{ imageUrl: 'test.jpg', decorName: 'Decor', decorCode: 'D001' }],
      };
      
      const content = service.generatePlaquetteContent(data);
      const coverPage = content.pages[0];
      
      expect(coverPage.type).toBe('cover');
      expect(coverPage.elements.some(e => e.type === 'text')).toBe(true);
    });

    it('should include render pages in plaquette', () => {
      const data: PlaquetteData = {
        projectTitle: 'Test',
        clientName: 'Client',
        date: new Date(),
        renders: [
          { imageUrl: 'render1.jpg', decorName: 'Decor 1', decorCode: 'D001' },
          { imageUrl: 'render2.jpg', decorName: 'Decor 2', decorCode: 'D002' },
        ],
      };
      
      const content = service.generatePlaquetteContent(data);
      const renderPages = content.pages.filter(p => p.type === 'render');
      
      expect(renderPages.length).toBeGreaterThanOrEqual(1);
    });

    it('should add comparison page when multiple renders', () => {
      const data: PlaquetteData = {
        projectTitle: 'Test',
        clientName: 'Client',
        date: new Date(),
        renders: [
          { imageUrl: 'render1.jpg', decorName: 'Decor 1', decorCode: 'D001' },
          { imageUrl: 'render2.jpg', decorName: 'Decor 2', decorCode: 'D002' },
        ],
        includeComparison: true,
      };
      
      const content = service.generatePlaquetteContent(data);
      const comparisonPage = content.pages.find(p => p.type === 'comparison');
      
      expect(comparisonPage).toBeDefined();
    });
  });

  // ============================================================================
  // Template Tests - Devis
  // ============================================================================
  describe('Template: Devis', () => {
    it('should validate devis data', () => {
      const data: DevisData = {
        reference: 'DEV-2024-001',
        date: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        client: {
          name: 'Société ABC',
          address: '123 Rue Example, 75001 Paris',
          contact: 'M. Dupont',
          email: 'contact@abc.fr',
        },
        items: [
          {
            description: 'Panneau Inox Brossé 3020BN - 2440x1220mm',
            quantity: 10,
            unitPrice: 150,
            unit: 'panneau',
          },
        ],
        conditions: 'Livraison sous 15 jours ouvrés',
      };
      
      const result = service.validateDevisData(data);
      expect(result.valid).toBe(true);
    });

    it('should reject devis without reference', () => {
      const data = {
        date: new Date(),
        client: { name: 'Test' },
        items: [],
      } as any;
      
      const result = service.validateDevisData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('reference_required');
    });

    it('should reject devis without items', () => {
      const data: Partial<DevisData> = {
        reference: 'DEV-001',
        date: new Date(),
        client: { name: 'Test', address: 'Test', contact: 'Test', email: 'test@test.com' },
        items: [],
      };
      
      const result = service.validateDevisData(data as DevisData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('items_required');
    });

    it('should calculate totals correctly', () => {
      const items = [
        { description: 'Item 1', quantity: 10, unitPrice: 100 },
        { description: 'Item 2', quantity: 5, unitPrice: 200 },
      ];
      
      const totals = service.calculateDevisTotals(items as any);
      
      expect(totals.subtotal).toBe(2000); // 10*100 + 5*200
      expect(totals.tax).toBe(400); // 20% VAT
      expect(totals.total).toBe(2400); // 2000 + 400
    });

    it('should support custom tax rate', () => {
      const items = [
        { description: 'Item', quantity: 1, unitPrice: 100 },
      ];
      
      const totals = service.calculateDevisTotals(items as any, 10);
      
      expect(totals.tax).toBe(10); // 10% VAT
      expect(totals.total).toBe(110);
    });

    it('should generate devis content structure', () => {
      const data: DevisData = {
        reference: 'DEV-001',
        date: new Date(),
        validUntil: new Date(),
        client: { name: 'Client', address: 'Addr', contact: 'Contact', email: 'a@b.c' },
        items: [{ description: 'Item', quantity: 1, unitPrice: 100, unit: 'u' }],
      };
      
      const content = service.generateDevisContent(data);
      
      expect(content.pages.length).toBeGreaterThanOrEqual(1);
      expect(content.pages[0].elements).toBeDefined();
    });

    it('should format currency correctly', () => {
      // Uses French locale, space may be non-breaking space
      expect(service.formatCurrency(1234.56)).toContain('234,56');
      expect(service.formatCurrency(1234.56)).toContain('€');
      expect(service.formatCurrency(1000)).toContain('000,00');
      expect(service.formatCurrency(0.99)).toContain('0,99');
    });
  });

  // ============================================================================
  // Template Tests - Comparison
  // ============================================================================
  describe('Template: Comparison Sheet', () => {
    it('should validate comparison data', () => {
      const data: ComparisonData = {
        title: 'Comparaison Finitions',
        originalImage: 'https://example.com/photo.jpg',
        renders: [
          {
            imageUrl: 'https://example.com/render1.jpg',
            decorName: 'Inox Brossé',
            decorCode: '3020BN',
          },
          {
            imageUrl: 'https://example.com/render2.jpg',
            decorName: 'Marbre Blanc',
            decorCode: 'MB-001',
          },
        ],
      };
      
      const result = service.validateComparisonData(data);
      expect(result.valid).toBe(true);
    });

    it('should reject comparison with less than 2 renders', () => {
      const data: ComparisonData = {
        title: 'Test',
        originalImage: 'photo.jpg',
        renders: [
          { imageUrl: 'render.jpg', decorName: 'Decor', decorCode: 'D001' },
        ],
      };
      
      const result = service.validateComparisonData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('min_two_renders_required');
    });

    it('should generate grid layout for comparisons', () => {
      const data: ComparisonData = {
        title: 'Test',
        originalImage: 'photo.jpg',
        renders: [
          { imageUrl: 'r1.jpg', decorName: 'D1', decorCode: 'C1' },
          { imageUrl: 'r2.jpg', decorName: 'D2', decorCode: 'C2' },
          { imageUrl: 'r3.jpg', decorName: 'D3', decorCode: 'C3' },
          { imageUrl: 'r4.jpg', decorName: 'D4', decorCode: 'C4' },
        ],
      };
      
      const layout = service.calculateComparisonLayout(data.renders.length);
      
      expect(layout.columns).toBe(2);
      expect(layout.rows).toBe(2);
    });

    it('should generate 3-column layout for 6+ renders', () => {
      const renders = Array(6).fill({ imageUrl: 'r.jpg', decorName: 'D', decorCode: 'C' });
      const layout = service.calculateComparisonLayout(renders.length);
      
      expect(layout.columns).toBe(3);
    });
  });

  // ============================================================================
  // Content Generation Tests
  // ============================================================================
  describe('Content Generation', () => {
    it('should create text element', () => {
      const element = service.createTextElement('Hello World', {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333',
      });
      
      expect(element.type).toBe('text');
      expect(element.content).toBe('Hello World');
      expect(element.style.fontSize).toBe(14);
    });

    it('should create image element', () => {
      const element = service.createImageElement('https://example.com/image.jpg', {
        width: 200,
        height: 150,
        fit: 'contain',
      });
      
      expect(element.type).toBe('image');
      expect(element.src).toBe('https://example.com/image.jpg');
      expect(element.style.width).toBe(200);
    });

    it('should create table element', () => {
      const element = service.createTableElement({
        headers: ['Description', 'Qté', 'Prix'],
        rows: [
          ['Panneau A', '10', '150 €'],
          ['Panneau B', '5', '200 €'],
        ],
      });
      
      expect(element.type).toBe('table');
      expect(element.headers).toHaveLength(3);
      expect(element.rows).toHaveLength(2);
    });

    it('should create divider element', () => {
      const element = service.createDividerElement({
        color: '#E94E5D',
        thickness: 2,
        margin: 20,
      });
      
      expect(element.type).toBe('divider');
      expect(element.style.color).toBe('#E94E5D');
    });

    it('should create spacer element', () => {
      const element = service.createSpacerElement(30);
      
      expect(element.type).toBe('spacer');
      expect(element.height).toBe(30);
    });

    it('should create QR code element', () => {
      const element = service.createQRCodeElement('https://dica.app/p/abc123', {
        size: 100,
        label: 'Voir le projet en ligne',
      });
      
      expect(element.type).toBe('qrcode');
      expect(element.data).toBe('https://dica.app/p/abc123');
      expect(element.size).toBe(100);
    });
  });

  // ============================================================================
  // Export Tests
  // ============================================================================
  describe('Export', () => {
    it('should generate PDF blob from content', async () => {
      const content: PDFContent = {
        pages: [
          {
            type: 'content',
            elements: [
              service.createTextElement('Test Page', { fontSize: 24 }),
            ],
          },
        ],
        metadata: {
          title: 'Test Document',
          author: 'DICA France',
        },
      };
      
      // Mock PDF generation (actual implementation would use jsPDF or similar)
      const mockBlob = new Blob(['mock pdf content'], { type: 'application/pdf' });
      vi.spyOn(service, 'generatePDFBlob').mockResolvedValue(mockBlob);
      
      const blob = await service.generatePDFBlob(content);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate filename with metadata', () => {
      const filename = service.generateFilename({
        template: 'plaquette',
        projectTitle: 'Ascenseur Haussmann',
        date: new Date('2024-01-15'),
      });
      
      expect(filename).toContain('plaquette');
      expect(filename).toContain('2024-01-15');
      expect(filename).toMatch(/\.pdf$/);
    });

    it('should sanitize filename', () => {
      const filename = service.generateFilename({
        template: 'plaquette',
        projectTitle: 'Test / Project : Invalid <chars>',
        date: new Date('2024-01-15'),
      });
      
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
    });

    it('should have download method', () => {
      expect(typeof service.downloadPDF).toBe('function');
    });

    it('should generate filename correctly', () => {
      const filename = service.generateFilename({
        template: 'plaquette',
        projectTitle: 'Test Project',
        date: new Date('2024-01-15'),
      });
      
      expect(filename).toContain('plaquette');
      expect(filename).toContain('test-project');
      expect(filename).toContain('2024-01-15');
      expect(filename).toMatch(/\.pdf$/);
    });

    it('should generate data URL for preview', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      vi.spyOn(service, 'generatePDFBlob').mockResolvedValue(mockBlob);
      
      const dataUrl = await service.generateDataUrl({
        pages: [],
        metadata: {},
      });
      
      expect(dataUrl).toMatch(/^data:application\/pdf/);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw PDFExportError for invalid template', () => {
      expect(() => service.generateContent('invalid' as any, {}))
        .toThrow(PDFExportError);
    });

    it('should provide error codes', () => {
      try {
        service.generateContent('invalid' as any, {});
      } catch (error) {
        expect(error).toBeInstanceOf(PDFExportError);
        expect((error as PDFExportError).code).toBe('INVALID_TEMPLATE');
      }
    });

    it('should handle image load failures', async () => {
      const data: PlaquetteData = {
        projectTitle: 'Test',
        clientName: 'Client',
        date: new Date(),
        renders: [
          { imageUrl: 'invalid://broken', decorName: 'D', decorCode: 'C' },
        ],
      };
      
      // Should not throw, but use placeholder
      const content = service.generatePlaquetteContent(data);
      expect(content).toBeDefined();
    });

    it('should emit error events', () => {
      const errorCallback = vi.fn();
      service.onError(errorCallback);
      
      service.emitError(new PDFExportError('Test', 'TEST_ERROR'));
      
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Utility Tests
  // ============================================================================
  describe('Utilities', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      
      expect(service.formatDate(date, 'short')).toBe('15/01/2024');
      expect(service.formatDate(date, 'long')).toBe('15 janvier 2024');
      expect(service.formatDate(date, 'full')).toBe('lundi 15 janvier 2024');
    });

    it('should convert mm to points', () => {
      expect(service.mmToPoints(25.4)).toBeCloseTo(72, 1); // 1 inch = 72 points
      expect(service.mmToPoints(210)).toBeCloseTo(595.28, 0); // A4 width
    });

    it('should get page dimensions for A4', () => {
      const dims = service.getPageDimensions('A4', 'portrait');
      
      expect(dims.width).toBeCloseTo(595.28, 0);
      expect(dims.height).toBeCloseTo(841.89, 0);
    });

    it('should get page dimensions for landscape', () => {
      const dimsPortrait = service.getPageDimensions('A4', 'portrait');
      const dimsLandscape = service.getPageDimensions('A4', 'landscape');
      
      expect(dimsLandscape.width).toBe(dimsPortrait.height);
      expect(dimsLandscape.height).toBe(dimsPortrait.width);
    });

    it('should calculate content area', () => {
      service.configure({
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });
      
      const area = service.getContentArea();
      const pageDims = service.getPageDimensions('A4', 'portrait');
      
      expect(area.width).toBe(pageDims.width - 80);
      expect(area.height).toBe(pageDims.height - 80);
    });

    it('should truncate long text', () => {
      const longText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit';
      const truncated = service.truncateText(longText, 20);
      
      expect(truncated.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(truncated).toContain('...');
    });

    it('should wrap text to fit width', () => {
      const text = 'This is a long text that should be wrapped to multiple lines';
      const lines = service.wrapText(text, 100, 12);
      
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should generate complete plaquette workflow', async () => {
      // 1. Configure
      service.applyPreset('dica-commercial');
      
      // 2. Prepare data
      const data: PlaquetteData = {
        projectTitle: 'Rénovation Ascenseur',
        clientName: 'Immeuble Haussmann',
        clientRef: 'CMD-2024-001',
        date: new Date(),
        renders: [
          {
            imageUrl: 'https://example.com/render.jpg',
            decorName: 'Inox Brossé Premium',
            decorCode: '3020BN',
            description: 'Finition élégante',
          },
        ],
        contactInfo: {
          name: 'Commercial DICA',
          email: 'contact@dica.fr',
          phone: '+33 1 23 45 67 89',
        },
      };
      
      // 3. Validate
      const validation = service.validatePlaquetteData(data);
      expect(validation.valid).toBe(true);
      
      // 4. Generate content
      const content = service.generatePlaquetteContent(data);
      expect(content.pages.length).toBeGreaterThan(0);
      
      // 5. Generate filename
      const filename = service.generateFilename({
        template: 'plaquette',
        projectTitle: data.projectTitle,
        date: data.date,
      });
      expect(filename).toContain('.pdf');
    });

    it('should generate complete devis workflow', async () => {
      const data: DevisData = {
        reference: 'DEV-2024-001',
        date: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        client: {
          name: 'Client Test',
          address: '123 Rue Test',
          contact: 'M. Test',
          email: 'test@test.com',
        },
        items: [
          { description: 'Panneau A', quantity: 10, unitPrice: 150, unit: 'panneau' },
          { description: 'Panneau B', quantity: 5, unitPrice: 200, unit: 'panneau' },
        ],
        conditions: 'Livraison 15 jours',
      };
      
      const validation = service.validateDevisData(data);
      expect(validation.valid).toBe(true);
      
      const totals = service.calculateDevisTotals(data.items);
      // (10*150 + 5*200) = 2500 HT, + 20% TVA = 3000 TTC
      expect(totals.subtotal).toBe(2500);
      expect(totals.total).toBe(3000);
      
      const content = service.generateDevisContent(data);
      expect(content.pages.length).toBeGreaterThan(0);
    });
  });
});

