/**
 * @fileoverview Tests TDD pour MagazineGeneratorService
 * Générateur de structure éditoriale complète d'un magazine DICA
 * 
 * Tests complets sans simplification :
 * - Analyse et sélection des meilleurs rendus
 * - Génération de structure de pages
 * - Création de pages Zoom Produit avec phrases calligraphiées
 * - Blocs références et échantillons obligatoires sur toutes les pages
 * - Génération de textes éditoriaux cohérents
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagazineGeneratorService } from '../magazine-generator.service';
import type {
  RenderMetadata,
  DecorInfo,
  MagazineGenerationOptions,
  MagazinePage,
  ZoomProductPage,
  CoverPage,
  EditorialIntroPage,
} from '@/types/magazine-generator.types';

describe('MagazineGeneratorService', () => {
  let service: MagazineGeneratorService;

  beforeEach(() => {
    service = MagazineGeneratorService.getInstance();
  });

  // ============================================================================
  // Données de test
  // ============================================================================

  const mockRenders: RenderMetadata[] = [
    {
      id_image: 'render-1',
      usage: 'ascenseur',
      ambiances: ['luxe', 'contemporain'],
      decors: [
        {
          id: 'decor-1',
          nom: 'Vert Sauge Bois Brossé',
          code: 'DICA-VSB-001',
          famille: 'bois',
          effet: 'brossé',
        },
        {
          id: 'decor-2',
          nom: 'Noir Mat Métal',
          code: 'DICA-NMM-002',
          famille: 'metal',
          effet: 'mat',
        },
      ],
    },
    {
      id_image: 'render-2',
      usage: 'van',
      ambiances: ['naturelle', 'cosy'],
      decors: [
        {
          id: 'decor-1',
          nom: 'Vert Sauge Bois Brossé',
          code: 'DICA-VSB-001',
          famille: 'bois',
          effet: 'brossé',
        },
      ],
    },
    {
      id_image: 'render-3',
      usage: 'terrasse',
      ambiances: ['industrielle', 'urbaine'],
      decors: [
        {
          id: 'decor-3',
          nom: 'Pierre Grise Texturée',
          code: 'DICA-PGT-003',
          famille: 'pierre',
          effet: 'texturé',
        },
      ],
    },
    {
      id_image: 'render-4',
      usage: 'showroom',
      ambiances: ['luxe', 'moderne'],
      decors: [
        {
          id: 'decor-2',
          nom: 'Noir Mat Métal',
          code: 'DICA-NMM-002',
          famille: 'metal',
          effet: 'mat',
        },
        {
          id: 'decor-4',
          nom: 'Blanc Ivoire Uni',
          code: 'DICA-BIU-004',
          famille: 'uni',
          effet: 'mat',
        },
      ],
    },
  ];

  // ============================================================================
  // Tests de génération complète
  // ============================================================================

  describe('generateMagazine', () => {
    it('should generate a complete magazine structure with minimum required pages', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 2,
        max_zoom_pages: 4,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);
      expect(result.magazine).toBeDefined();
      expect(result.magazine?.pages.length).toBeGreaterThanOrEqual(4); // Cover + 2 Zoom + Closing minimum

      // Vérifier la présence d'une page cover
      const coverPage = result.magazine?.pages.find(p => p.type_page === 'cover') as CoverPage | undefined;
      expect(coverPage).toBeDefined();
      expect(coverPage?.decors_utilises).toBeDefined();
      expect(coverPage?.echantillons).toBeDefined();

      // Vérifier la présence d'au moins 2 pages Zoom Produit
      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') || [];
      expect(zoomPages.length).toBeGreaterThanOrEqual(2);
    });

    it('should include decors_utilises and echantillons on ALL pages', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 2,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);

      // Vérifier que CHAQUE page a les blocs obligatoires
      result.magazine?.pages.forEach((page, index) => {
        expect(page.decors_utilises, `Page ${index + 1} (${page.type_page}) missing decors_utilises`).toBeDefined();
        expect(page.decors_utilises.decors.length, `Page ${index + 1} should have at least one decor`).toBeGreaterThan(0);
        
        expect(page.echantillons, `Page ${index + 1} (${page.type_page}) missing echantillons`).toBeDefined();
        expect(page.echantillons.echantillons.length, `Page ${index + 1} should have at least one echantillon`).toBeGreaterThan(0);
      });
    });

    it('should generate Zoom Product pages with required fields', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 2,
      };

      const result = await service.generateMagazine(options);

      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') as ZoomProductPage[];

      zoomPages.forEach((page, index) => {
        // Image principale obligatoire
        expect(page.id_image_principale, `Zoom page ${index + 1} missing id_image_principale`).toBeDefined();
        expect(page.id_image_principale, `Zoom page ${index + 1} id_image_principale should not be null`).not.toBeNull();

        // Phrase calligraphiée obligatoire
        expect(page.phrase_calligraphie, `Zoom page ${index + 1} missing phrase_calligraphie`).toBeDefined();
        expect(page.phrase_calligraphie?.trim().length, `Zoom page ${index + 1} phrase_calligraphie should not be empty`).toBeGreaterThan(0);

        // Vérifier la longueur de la phrase (max 12 mots)
        const wordCount = page.phrase_calligraphie?.split(/\s+/).length || 0;
        expect(wordCount, `Zoom page ${index + 1} phrase_calligraphie should be max 12 words, got ${wordCount}`).toBeLessThanOrEqual(12);

        // Blocs obligatoires
        expect(page.decors_utilises, `Zoom page ${index + 1} missing decors_utilises`).toBeDefined();
        expect(page.echantillons, `Zoom page ${index + 1} missing echantillons`).toBeDefined();
      });
    });

    it('should respect min_zoom_pages option', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 3,
        max_zoom_pages: 6,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);
      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product');
      expect(zoomPages?.length).toBeGreaterThanOrEqual(3);
    });

    it('should respect max_zoom_pages option', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 2,
        max_zoom_pages: 3,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(true);
      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product');
      expect(zoomPages?.length).toBeLessThanOrEqual(3);
    });

    it('should fail when not enough renders provided', async () => {
      const options: MagazineGenerationOptions = {
        renders: [mockRenders[0]], // Seulement 1 rendu
        min_zoom_pages: 2,
      };

      const result = await service.generateMagazine(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('insuffisant');
    });

    it('should generate cover page with decors and echantillons', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      const coverPage = result.magazine?.pages[0] as CoverPage;
      expect(coverPage.type_page).toBe('cover');
      expect(coverPage.titre).toBeDefined();
      expect(coverPage.decors_utilises).toBeDefined();
      expect(coverPage.decors_utilises.decors.length).toBeGreaterThan(0);
      expect(coverPage.echantillons).toBeDefined();
      expect(coverPage.echantillons.echantillons.length).toBeGreaterThan(0);
    });

    it('should generate closing page with decors and echantillons', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      const closingPage = result.magazine?.pages[result.magazine.pages.length - 1];
      expect(closingPage?.type_page).toBe('closing');
      expect(closingPage?.decors_utilises).toBeDefined();
      expect(closingPage?.echantillons).toBeDefined();
    });

    it('should include all unique decors in decors_utilises_total', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      expect(result.magazine?.decors_utilises_total).toBeDefined();
      expect(result.magazine?.decors_utilises_total.length).toBeGreaterThan(0);

      // Vérifier que tous les décors uniques sont présents
      const uniqueDecorIds = new Set(mockRenders.flatMap(r => r.decors.map(d => d.id)));
      expect(result.magazine?.decors_utilises_total.length).toBeGreaterThanOrEqual(uniqueDecorIds.size);
    });
  });

  // ============================================================================
  // Tests de génération de phrases calligraphiées
  // ============================================================================

  describe('Phrase calligraphiée generation', () => {
    it('should generate phrases with max 12 words', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 2,
      };

      const result = await service.generateMagazine(options);
      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') as ZoomProductPage[];

      zoomPages.forEach(page => {
        const wordCount = page.phrase_calligraphie.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(12);
      });
    });

    it('should generate elegant, evocative phrases (not commercial slogans)', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
        min_zoom_pages: 1,
      };

      const result = await service.generateMagazine(options);
      const zoomPage = result.magazine?.pages.find(p => p.type_page === 'zoom_product') as ZoomProductPage;

      const phrase = zoomPage.phrase_calligraphie.toLowerCase();
      
      // Ne doit pas contenir de mots commerciaux agressifs
      const commercialWords = ['achetez', 'promo', 'réduction', 'offre', 'prix', '€', 'dollar', 'dès maintenant'];
      commercialWords.forEach(word => {
        expect(phrase, `Phrase should not contain commercial word: ${word}`).not.toContain(word);
      });

      // Doit être courte et élégante
      expect(phrase.length).toBeLessThan(100); // Longueur totale raisonnable
    });
  });

  // ============================================================================
  // Tests de génération d'échantillons
  // ============================================================================

  describe('Echantillons generation', () => {
    it('should generate echantillon descriptions with max 8 words', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach(page => {
        page.echantillons.echantillons.forEach(echantillon => {
          const wordCount = echantillon.description_courte.split(/\s+/).length;
          expect(wordCount, `Echantillon "${echantillon.decor_nom}" description should be max 8 words, got ${wordCount}`).toBeLessThanOrEqual(8);
        });
      });
    });

    it('should include decor code in echantillon', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach(page => {
        page.echantillons.echantillons.forEach(echantillon => {
          expect(echantillon.decor_code).toBeDefined();
          expect(echantillon.decor_code.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ============================================================================
  // Tests de sélection des meilleurs rendus
  // ============================================================================

  describe('Best renders selection', () => {
    it('should select diverse renders for zoom pages', async () => {
      const diverseRenders: RenderMetadata[] = [
        ...mockRenders,
        {
          id_image: 'render-5',
          usage: 'bureau',
          ambiances: ['moderne'],
          decors: [mockRenders[0].decors[0]],
        },
      ];

      const options: MagazineGenerationOptions = {
        renders: diverseRenders,
        min_zoom_pages: 3,
        max_zoom_pages: 4,
      };

      const result = await service.generateMagazine(options);
      const zoomPages = result.magazine?.pages.filter(p => p.type_page === 'zoom_product') as ZoomProductPage[];

      // Vérifier que les images sélectionnées sont différentes
      const selectedImageIds = zoomPages.map(p => p.id_image_principale);
      const uniqueIds = new Set(selectedImageIds);
      expect(uniqueIds.size).toBe(selectedImageIds.length); // Toutes les images doivent être uniques
    });

    it('should prioritize renders with multiple decors for zoom pages', async () => {
      const renders: RenderMetadata[] = [
        {
          id_image: 'render-single',
          usage: 'ascenseur',
          ambiances: ['luxe'],
          decors: [mockRenders[0].decors[0]],
        },
        {
          id_image: 'render-multiple',
          usage: 'showroom',
          ambiances: ['luxe', 'moderne'],
          decors: mockRenders[3].decors, // 2 décors
        },
      ];

      const options: MagazineGenerationOptions = {
        renders: renders,
        min_zoom_pages: 1,
        max_zoom_pages: 1,
      };

      const result = await service.generateMagazine(options);
      const zoomPage = result.magazine?.pages.find(p => p.type_page === 'zoom_product') as ZoomProductPage;

      // Devrait préférer le rendu avec plusieurs décors
      expect(zoomPage.id_image_principale).toBe('render-multiple');
    });
  });

  // ============================================================================
  // Tests de structure éditoriale
  // ============================================================================

  describe('Editorial structure', () => {
    it('should start with cover page', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      expect(result.magazine?.pages[0].type_page).toBe('cover');
    });

    it('should end with closing page', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      const lastPage = result.magazine?.pages[result.magazine.pages.length - 1];
      expect(lastPage?.type_page).toBe('closing');
    });

    it('should have editorial_intro page between cover and zoom pages', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      const introPage = result.magazine?.pages.find(p => p.type_page === 'editorial_intro');
      expect(introPage).toBeDefined();
      
      const introIndex = result.magazine?.pages.indexOf(introPage as MagazinePage) || -1;
      expect(introIndex).toBeGreaterThan(0); // Après la cover
    });
  });

  // ============================================================================
  // Tests de génération de textes
  // ============================================================================

  describe('Text generation', () => {
    it('should generate texte_court with 3-5 sentences for editorial pages', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);
      const introPage = result.magazine?.pages.find(p => p.type_page === 'editorial_intro') as EditorialIntroPage;

      expect(introPage.texte_court).toBeDefined();
      const sentences = introPage.texte_court.split(/[.!?]+/).filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(3);
      expect(sentences.length).toBeLessThanOrEqual(5);
    });

    it('should not contain technical jargon in textes_court', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach(page => {
        if ('texte_court' in page && page.texte_court) {
          const texte = page.texte_court.toLowerCase();
          const technicalTerms = ['api', 'json', 'http', 'url', 'frontend', 'backend', 'database'];
          technicalTerms.forEach(term => {
            expect(texte, `Page ${page.type_page} should not contain technical term: ${term}`).not.toContain(term);
          });
        }
      });
    });
  });

  // ============================================================================
  // Tests de validation
  // ============================================================================

  describe('Validation', () => {
    it('should validate that all decor info is present', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      result.magazine?.pages.forEach(page => {
        page.decors_utilises.decors.forEach(decor => {
          expect(decor.nom).toBeDefined();
          expect(decor.code).toBeDefined();
          expect(decor.famille).toBeDefined();
        });
      });
    });

    it('should not include other brand names', async () => {
      const options: MagazineGenerationOptions = {
        renders: mockRenders,
      };

      const result = await service.generateMagazine(options);

      const allText = JSON.stringify(result.magazine).toLowerCase();
      const otherBrands = ['korev', 'lovable', 'supabase', 'openai', 'anthropic'];
      otherBrands.forEach(brand => {
        expect(allText, `Should not contain brand: ${brand}`).not.toContain(brand);
      });
    });
  });
});

