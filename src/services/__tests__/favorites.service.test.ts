/**
 * @fileoverview Tests TDD pour FavoritesService
 * 
 * Service de gestion des favoris de rendus avec intégration brochures/magazine.
 * Process TDD strict - Tests écrits AVANT l'implémentation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FavoritesService,
  FavoriteRender,
  FavoritesFilter,
  FavoritesStats,
  ServiceResult,
} from '../favorites.service';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockSupabase = (mockData: any[] = [], mockError: any = null) => {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockData, error: mockError }),
        }),
      }),
      delete: () => ({
        eq: (key: string, value: any) => ({
          eq: (key2: string, value2: any) => Promise.resolve({ error: mockError }),
          in: (key2: string, values: any[]) => Promise.resolve({ error: mockError }),
        }),
      }),
    }),
  } as any;
};

// ============================================================================
// Test Data
// ============================================================================

const MOCK_USER_ID = 'user-123';

const MOCK_DB_DATA = [
  {
    id: 'fav-1',
    user_id: MOCK_USER_ID,
    render_result_id: 'render-1',
    created_at: '2024-01-15T10:00:00Z',
    render_results: {
      id: 'render-1',
      result_image_url: 'https://example.com/render1.jpg',
      created_at: '2024-01-10T10:00:00Z',
      project_photo_id: 'photo-1',
      decor_id: 'decor-1',
      project_photos: {
        id: 'photo-1',
        original_image_url: 'https://example.com/original1.jpg',
        caption: 'Cuisine moderne',
        project_id: 'project-1',
        projects: {
          id: 'project-1',
          title: 'Rénovation Appartement',
          use_case: 'cuisine',
        },
      },
      decors: {
        id: 'decor-1',
        name: 'Chêne Naturel',
        reference_code: '668_SHIKY_FC',
        texture_url: 'https://example.com/decor1.jpg',
      },
    },
  },
  {
    id: 'fav-2',
    user_id: MOCK_USER_ID,
    render_result_id: 'creative-1',
    created_at: '2024-01-16T10:00:00Z',
    render_results: {
      id: 'creative-1',
      result_image_url: 'https://example.com/creative1.jpg',
      created_at: '2024-01-12T10:00:00Z',
      project_photo_id: 'photo-1',
      decor_id: null,
      project_photos: {
        id: 'photo-1',
        original_image_url: 'https://example.com/original1.jpg',
        caption: null,
        project_id: 'project-1',
        projects: {
          id: 'project-1',
          title: 'Rénovation Appartement',
          use_case: 'cuisine',
        },
      },
      decors: null,
    },
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('FavoritesService', () => {
  describe('Initialization', () => {
    it('should create service instance', () => {
      const mockSupabase = createMockSupabase();
      const service = new FavoritesService(mockSupabase);
      expect(service).toBeInstanceOf(FavoritesService);
    });

    it('should throw error if supabase client is null', () => {
      expect(() => new FavoritesService(null as any)).toThrow('Supabase client is required');
    });
  });

  describe('getAllFavorites', () => {
    it('should fetch and format favorites correctly', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const result = await service.getAllFavorites(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe('fav-1');
      expect(result.data![0].render.decor).toBeDefined();
      expect(result.data![1].render.isCreativeImport).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockSupabase = createMockSupabase([], { message: 'DB Error' });
      const service = new FavoritesService(mockSupabase);

      const result = await service.getAllFavorites(MOCK_USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
    });

    it('should return empty array if no favorites', async () => {
      const mockSupabase = createMockSupabase([]);
      const service = new FavoritesService(mockSupabase);

      const result = await service.getAllFavorites(MOCK_USER_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getFavoritesWithFilter', () => {
    it('should filter by type: decor', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const filter: FavoritesFilter = { type: 'decor' };
      const result = await service.getFavoritesWithFilter(MOCK_USER_ID, filter);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].render.decorId).toBeDefined();
    });

    it('should filter by type: creative', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const filter: FavoritesFilter = { type: 'creative' };
      const result = await service.getFavoritesWithFilter(MOCK_USER_ID, filter);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].render.isCreativeImport).toBe(true);
    });

    it('should filter by projectId', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const filter: FavoritesFilter = { projectId: 'project-1' };
      const result = await service.getFavoritesWithFilter(MOCK_USER_ID, filter);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].render.projectId).toBe('project-1');
    });

    it('should apply limit', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const filter: FavoritesFilter = { limit: 1 };
      const result = await service.getFavoritesWithFilter(MOCK_USER_ID, filter);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should apply offset and limit', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const filter: FavoritesFilter = { offset: 1, limit: 1 };
      const result = await service.getFavoritesWithFilter(MOCK_USER_ID, filter);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('fav-2');
    });
  });

  describe('getFavoritesStats', () => {
    it('should calculate correct statistics', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const stats = await service.getFavoritesStats(MOCK_USER_ID);

      expect(stats.success).toBe(true);
      expect(stats.data!.total).toBe(2);
      expect(stats.data!.byType.decor).toBe(1);
      expect(stats.data!.byType.creative).toBe(1);
      expect(stats.data!.byProject['project-1']).toBe(2);
    });

    it('should return zero stats for empty favorites', async () => {
      const mockSupabase = createMockSupabase([]);
      const service = new FavoritesService(mockSupabase);

      const stats = await service.getFavoritesStats(MOCK_USER_ID);

      expect(stats.data!.total).toBe(0);
      expect(stats.data!.byType.decor).toBe(0);
      expect(stats.data!.byType.creative).toBe(0);
    });
  });

  describe('getFavoritesGrouped', () => {
    it('should group by project', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const grouped = await service.getFavoritesGrouped(MOCK_USER_ID, 'project');

      expect(grouped.success).toBe(true);
      expect(grouped.data!['project-1']).toHaveLength(2);
    });

    it('should group by type', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const grouped = await service.getFavoritesGrouped(MOCK_USER_ID, 'type');

      expect(grouped.success).toBe(true);
      expect(grouped.data!['decor']).toHaveLength(1);
      expect(grouped.data!['creative']).toHaveLength(1);
    });

    it('should group by date', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const grouped = await service.getFavoritesGrouped(MOCK_USER_ID, 'date');

      expect(grouped.success).toBe(true);
      expect(Object.keys(grouped.data!).length).toBeGreaterThan(0);
    });
  });

  describe('getFavoritesForExport', () => {
    it('should format for brochure export', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const result = await service.getFavoritesForExport(MOCK_USER_ID, 'brochure');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toHaveProperty('url');
      expect(result.data![0]).toHaveProperty('decorCode');
      expect(result.data![0].isHighResolution).toBe(true);
      expect(result.data![0].isFavorite).toBe(true);
    });

    it('should handle creative imports in export', async () => {
      const mockSupabase = createMockSupabase(MOCK_DB_DATA);
      const service = new FavoritesService(mockSupabase);

      const result = await service.getFavoritesForExport(MOCK_USER_ID, 'magazine');

      expect(result.data![1].decorCode).toBe('ASSISTANT_IA');
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite successfully', async () => {
      const mockSupabase = createMockSupabase();
      const service = new FavoritesService(mockSupabase);

      const result = await service.removeFavorite(MOCK_USER_ID, 'fav-1');

      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const mockSupabase = createMockSupabase([], { message: 'Delete failed' });
      const service = new FavoritesService(mockSupabase);

      const result = await service.removeFavorite(MOCK_USER_ID, 'fav-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('bulkRemoveFavorites', () => {
    it('should remove multiple favorites', async () => {
      const mockSupabase = createMockSupabase();
      const service = new FavoritesService(mockSupabase);

      const result = await service.bulkRemoveFavorites(MOCK_USER_ID, ['fav-1', 'fav-2']);

      expect(result.success).toBe(true);
    });
  });
});
