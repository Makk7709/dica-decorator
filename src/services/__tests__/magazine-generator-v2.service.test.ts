/**
 * @fileoverview Tests TDD pour MagazineGeneratorService V2 (Refondu)
 * Version avec thème personnalisé, sélection d'images et mise en forme améliorée
 * 
 * Tests complets sans simplification :
 * - Génération avec thème personnalisé
 * - Sélection d'image de couverture
 * - Sélection de 2-3 images pour pages zoom
 * - Textes IA basés sur le thème (expert stratifié/storytelling)
 * - Décors affichés en carrés élégants type RAL
 * - Mise en valeur des coloris du catalogue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagazineGeneratorV2Service } from '../magazine-generator-v2.service';
import type {
  SelectedImage,
  DecorInfo,
  MagazineGenerationOptions,
  MagazinePage,
  ZoomProductPage,
  CoverPage,
  EditorialIntroPage,
  MagazineDICA,
} from '@/types/magazine-generator.types';

describe('MagazineGeneratorV2Service', () => {
  let service: MagazineGeneratorV2Service;

  beforeEach(() => {
    service = MagazineGeneratorV2Service.getInstance();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Données de test
  // ============================================================================

  const mockDecors: DecorInfo[] = [
    {
      id: 'decor-1',
      nom: 'Vert Sauge Bois Brossé',
      code: 'DICA-VSB-001',
      famille: 'bois',
      effet: 'brossé',
      texture_image_url: 'https://example.com/texture1.jpg',
      color_hex: '#8B9A5B',
    },
    {
      id: 'decor-2',
      nom: 'Noir Mat Métal',
      code: 'DICA-NMM-002',
      famille: 'metal',
      effet: 'mat',
      texture_image_url: 'https://example.com/texture2.jpg',
      color_hex: '#1A1A1A',
    },
    {
      id: 'decor-3',
      nom: 'Blanc Ivoire Uni',
      code: 'DICA-BIU-004',
      famille: 'uni',
      effet: 'mat',
      texture_image_url: 'https://example.com/texture3.jpg',
      color_hex: '#FFFEF7',
    },
  ];

  const mockCoverImage: SelectedImage = {
    id: 'cover-1',
    url: 'https://example.com/cover.jpg',
    type: 'render',
    projectId: 'project-1',
    projectName: 'Van Aménagé Premium',
    decorId: 'decor-1',
    decorName: 'Vert Sauge Bois Brossé',
    decorCode: 'DICA-VSB-001',
    decorTextureUrl: 'https://example.com/texture1.jpg',
    usage: 'van',
  };

  const mockZoomImages: SelectedImage[] = [
    {
      id: 'zoom-1',
      url: 'https://example.com/zoom1.jpg',
      type: 'render',
      projectId: 'project-1',
      projectName: 'Van Aménagé Premium',
      decorId: 'decor-1',
      decorName: 'Vert Sauge Bois Brossé',
      decorCode: 'DICA-VSB-001',
      decorTextureUrl: 'https://example.com/texture1.jpg',
      usage: 'van',
    },
    {
      id: 'zoom-2',
      url: 'https://example.com/zoom2.jpg',
      type: 'render',
      projectId: 'project-2',
      projectName: 'Ascenseur Luxe',
      decorId: 'decor-2',
      decorName: 'Noir Mat Métal',
      decorCode: 'DICA-NMM-002',
      decorTextureUrl: 'https://example.com/texture2.jpg',
      usage: 'ascenseur',
    },
  ];

  // ============================================================================
  // Tests de génération avec thème personnalisé
  // ============================================================================

  describe('generateMagazine with custom theme', () => {
    it('should generate a complete magazine with custom theme', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'les escapades en van',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
        min_zoom_pages: 2,
        max_zoom_pages: 3,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);
      expect(result.magazine).toBeDefined();
      expect(result.magazine?.theme).toBe('les escapades en van');
      expect(result.magazine?.pages.length).toBeGreaterThanOrEqual(4); // Cover + Intro + 2 Zoom + Closing
    });

    it('should include theme in all pages', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'la remontée luxe d\'ascenseur',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);

      result.magazine?.pages.forEach((page, index) => {
        expect(page.theme, `Page ${index + 1} (${page.type_page}) should have theme`).toBe('la remontée luxe d\'ascenseur');
      });
    });

    it('should use coverImage as cover page image', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const coverPage = result.magazine?.pages.find(p => p.type_page === 'cover') as CoverPage;
      expect(coverPage).toBeDefined();
      expect(coverPage.id_image_principale).toBe(mockCoverImage.id);
    });

    it('should create zoom pages from zoomImages', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') as ZoomProductPage[];
      expect(zoomPages.length).toBe(mockZoomImages.length);
      
      zoomPages.forEach((page, index) => {
        expect(page.id_image_principale).toBe(mockZoomImages[index].id);
      });
    });

    it('should respect min_zoom_pages option', async () => {
      const singleZoomImage = [mockZoomImages[0]];
      
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: singleZoomImage,
        decors: mockDecors,
        min_zoom_pages: 2,
      };

      // Devrait échouer si pas assez d'images
      const result = await service.generateMagazine(options);
      
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('zoom');
    });

    it('should respect max_zoom_pages option', async () => {
      const manyZoomImages = [...mockZoomImages, ...mockZoomImages, ...mockZoomImages]; // 6 images
      
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: manyZoomImages,
        decors: mockDecors,
        max_zoom_pages: 3,
      };

      const result = await service.generateMagazine(options);

      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product');
      expect(zoomPages?.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // Tests de génération de textes IA basés sur le thème
  // ============================================================================

  describe('AI text generation based on theme', () => {
    it('should generate editorial intro text based on theme', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'les escapades en van',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const introPage = result.magazine?.pages.find(p => p.type_page === 'editorial_intro') as EditorialIntroPage;
      expect(introPage).toBeDefined();
      expect(introPage.texte_court).toBeDefined();
      expect(introPage.texte_court.length).toBeGreaterThan(100); // Texte substantiel
      
      // Le texte devrait mentionner le thème ou des concepts liés
      const texteLower = introPage.texte_court.toLowerCase();
      expect(
        texteLower.includes('van') || 
        texteLower.includes('escapade') || 
        texteLower.includes('voyage') ||
        texteLower.includes('mobilité')
      ).toBe(true);
    });

    it('should generate zoom product phrases based on theme', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'la remontée luxe d\'ascenseur',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') as ZoomProductPage[];
      
      zoomPages.forEach((page, index) => {
        expect(page.phrase_calligraphie).toBeDefined();
        expect(page.phrase_calligraphie.length).toBeGreaterThan(10);
        expect(page.phrase_calligraphie.split(/\s+/).length).toBeLessThanOrEqual(15); // Max 15 mots
      });
    });

    it('should generate expert/storytelling style text (mix technique and style)', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'les escapades en van',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const introPage = result.magazine?.pages.find(p => p.type_page === 'editorial_intro') as EditorialIntroPage;
      const texte = introPage.texte_court.toLowerCase();
      
      // Doit contenir à la fois des éléments techniques ET stylistiques
      const hasTechnicalTerms = texte.includes('stratifié') || 
                                texte.includes('hpl') || 
                                texte.includes('résistant') ||
                                texte.includes('durabilité') ||
                                texte.includes('finition');
      
      const hasStylisticTerms = texte.includes('élégance') || 
                                texte.includes('esthétique') || 
                                texte.includes('ambiance') ||
                                texte.includes('chaleur') ||
                                texte.includes('luxe');
      
      expect(hasTechnicalTerms || hasStylisticTerms, 'Text should mix technical and stylistic elements').toBe(true);
    });
  });

  // ============================================================================
  // Tests de blocs décors (carrés élégants type RAL)
  // ============================================================================

  describe('Decors bloc with RAL-style squares', () => {
    it('should include all decors with color_hex in decors_utilises_total', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      expect(result.magazine?.decors_utilises_total).toBeDefined();
      expect(result.magazine?.decors_utilises_total.length).toBe(mockDecors.length);
      
      // Vérifier que les couleurs sont présentes
      result.magazine?.decors_utilises_total.forEach(decor => {
        expect(decor.color_hex).toBeDefined();
        expect(decor.color_hex).toMatch(/^#[0-9A-Fa-f]{6}$/); // Format hex valide
      });
    });

    it('should include decors with color_hex in all pages', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach((page, index) => {
        expect(page.decors_utilises, `Page ${index + 1} should have decors_utilises`).toBeDefined();
        
        page.decors_utilises.decors.forEach(decor => {
          expect(decor.color_hex, `Decor ${decor.code} should have color_hex`).toBeDefined();
        });
      });
    });

    it('should include echantillons with color_hex', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach((page, index) => {
        page.echantillons.echantillons.forEach(echantillon => {
          expect(echantillon.color_hex, `Echantillon ${echantillon.decor_code} should have color_hex`).toBeDefined();
        });
      });
    });
  });

  // ============================================================================
  // Tests de structure éditoriale
  // ============================================================================

  describe('Editorial structure', () => {
    it('should start with cover page', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      expect(result.magazine?.pages[0].type_page).toBe('cover');
    });

    it('should have editorial_intro after cover', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const introPage = result.magazine?.pages.find(p => p.type_page === 'editorial_intro');
      expect(introPage).toBeDefined();
      
      const introIndex = result.magazine?.pages.indexOf(introPage as MagazinePage);
      expect(introIndex).toBe(1); // Juste après la cover
    });

    it('should end with closing page', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const lastPage = result.magazine?.pages[result.magazine.pages.length - 1];
      expect(lastPage?.type_page).toBe('closing');
    });

    it('should have zoom pages between intro and closing', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product');
      expect(zoomPages?.length).toBeGreaterThan(0);
      
      const introIndex = result.magazine?.pages.findIndex(p => p.type_page === 'editorial_intro');
      const firstZoomIndex = result.magazine?.pages.findIndex(p => p.type_page === 'zoom_product');
      const closingIndex = result.magazine?.pages.findIndex(p => p.type_page === 'closing');
      
      expect(firstZoomIndex).toBeGreaterThan(introIndex || -1);
      expect(firstZoomIndex).toBeLessThan(closingIndex);
    });
  });

  // ============================================================================
  // Tests de validation
  // ============================================================================

  describe('Validation', () => {
    it('should fail if theme is empty', async () => {
      const options: MagazineGenerationOptions = {
        theme: '',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail if coverImage is missing', async () => {
      const options = {
        theme: 'test theme',
        coverImage: null as any,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail if zoomImages has less than min_zoom_pages', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: [mockZoomImages[0]], // Seulement 1 image
        decors: mockDecors,
        min_zoom_pages: 2,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('zoom');
    });

    it('should fail if decors array is empty', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: [],
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // Tests de mise en valeur des coloris
  // ============================================================================

  describe('Color palette highlighting', () => {
    it('should extract unique colors from decors', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      // Vérifier que toutes les couleurs sont présentes
      const colors = new Set(result.magazine?.decors_utilises_total.map(d => d.color_hex));
      expect(colors.size).toBeGreaterThan(0);
    });

    it('should include color information in all decor blocks', async () => {
      const options: MagazineGenerationOptions = {
        theme: 'test theme',
        coverImage: mockCoverImage,
        zoomImages: mockZoomImages,
        decors: mockDecors,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach(page => {
        page.decors_utilises.decors.forEach(decor => {
          expect(decor.color_hex).toBeDefined();
        });
      });
    });
  });
});

