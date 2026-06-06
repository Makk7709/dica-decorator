/**
 * @fileoverview Tests TDD pour AdminProjectViewerService
 * 
 * Service permettant aux administrateurs de visualiser les projets
 * des revendeurs/utilisateurs enregistrés.
 * 
 * Process TDD strict - Ces tests sont écrits AVANT l'implémentation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AdminProjectViewerService,
  createAdminProjectViewerService,
  UserProjectSummary,
  UserProjectDetails,
  ProjectWithRenders,
  AdminProjectViewerError,
  UnauthorizedAdminAccessError,
  UserNotFoundError,
  ProjectNotFoundError,
} from '../admin-project-viewer.service';

// ============================================================================
// Mock Setup
// ============================================================================

const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

const createMockQueryBuilder = (data: unknown = null, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockResolvedValue({ data, error }), // NOSONAR: thenable mock required for `await supabase.from(...).select(...)` chain
});

// ============================================================================
// Test Data Fixtures
// ============================================================================

const ADMIN_USER_ID = 'admin-user-123';
const CLIENT_USER_ID = 'client-user-456';
const TARGET_USER_ID = 'target-user-789';

const mockAdminRole = { role: 'admin' };
const mockClientRole = { role: 'client' };

const mockTargetUserProfile = {
  id: TARGET_USER_ID,
  email: 'revendeur@example.com',
  first_name: 'Jean',
  last_name: 'Dupont',
  company_name: 'Dupont Décoration',
  is_active: true,
  created_at: '2024-01-15T10:00:00Z',
};

const mockProjects = [
  {
    id: 'project-1',
    title: 'Ascenseur Tour Eiffel',
    use_case: 'ascenseur',
    client_reference: 'REF-001',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
  },
  {
    id: 'project-2',
    title: 'Van Aménagé Client',
    use_case: 'van',
    client_reference: 'REF-002',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-10T10:00:00Z',
  },
];

const mockProjectPhotos = [
  {
    id: 'photo-1',
    project_id: 'project-1',
    original_image_url: 'https://storage.example.com/photo1.jpg',
    created_at: '2024-02-01T11:00:00Z',
  },
  {
    id: 'photo-2',
    project_id: 'project-1',
    original_image_url: 'https://storage.example.com/photo2.jpg',
    created_at: '2024-02-02T11:00:00Z',
  },
];

const mockRenderResults = [
  {
    id: 'render-1',
    project_photo_id: 'photo-1',
    result_image_url: 'https://storage.example.com/render1.jpg',
    decor_id: 'decor-123',
    created_at: '2024-02-01T12:00:00Z',
  },
  {
    id: 'render-2',
    project_photo_id: 'photo-1',
    result_image_url: 'https://storage.example.com/render2.jpg',
    decor_id: 'decor-456',
    created_at: '2024-02-01T13:00:00Z',
  },
  {
    id: 'render-3',
    project_photo_id: 'photo-2',
    result_image_url: 'https://storage.example.com/render3.jpg',
    decor_id: null, // Creative AI import
    created_at: '2024-02-02T12:00:00Z',
  },
];

const mockDecors = [
  {
    id: 'decor-123',
    name: 'Inox Brossé',
    reference_code: '3020_BN',
    category: 'metal',
  },
  {
    id: 'decor-456',
    name: 'Marbre Calacatta',
    reference_code: '8099_SHIKY_FC',
    category: 'marbre',
  },
];

// ============================================================================
// Test Suite: AdminProjectViewerService
// ============================================================================

describe('AdminProjectViewerService', () => {
  let service: AdminProjectViewerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAdminProjectViewerService(mockSupabaseClient as unknown as SupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Authorization Tests
  // ==========================================================================

  describe('Authorization', () => {
    it('should throw UnauthorizedAdminAccessError if user is not admin', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClientRole, error: null }),
      });

      // Act & Assert
      await expect(
        service.getUserProjects(CLIENT_USER_ID, TARGET_USER_ID)
      ).rejects.toThrow(UnauthorizedAdminAccessError);
    });

    it('should throw UnauthorizedAdminAccessError with correct message', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClientRole, error: null }),
      });

      // Act & Assert
      await expect(
        service.getUserProjects(CLIENT_USER_ID, TARGET_USER_ID)
      ).rejects.toThrow('Accès administrateur requis pour visualiser les projets des utilisateurs');
    });

    it('should allow access for admin users', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.id).toBe(TARGET_USER_ID);
    });

    it('should verify admin role on every operation', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
      });

      // Act
      try {
        await service.getProjectDetails(ADMIN_USER_ID, 'project-1');
      } catch (e) {
        // Expected to fail after role check due to incomplete mock
      }

      // Assert - verify role check was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_roles');
    });
  });

  // ==========================================================================
  // 2. getUserProjects Tests
  // ==========================================================================

  describe('getUserProjects', () => {
    it('should return user summary with project list', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result).toMatchObject<UserProjectSummary>({
        user: {
          id: TARGET_USER_ID,
          email: 'revendeur@example.com',
          fullName: 'Jean Dupont',
          companyName: 'Dupont Décoration',
          isActive: true,
          createdAt: expect.any(Date),
        },
        totalProjects: 2,
        projects: expect.arrayContaining([
          expect.objectContaining({
            id: 'project-1',
            title: 'Ascenseur Tour Eiffel',
            useCase: 'ascenseur',
          }),
          expect.objectContaining({
            id: 'project-2',
            title: 'Van Aménagé Client',
            useCase: 'van',
          }),
        ]),
      });
    });

    it('should throw UserNotFoundError if target user does not exist', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act & Assert
      await expect(
        service.getUserProjects(ADMIN_USER_ID, 'non-existent-user')
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should return empty projects array for user with no projects', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result.totalProjects).toBe(0);
      expect(result.projects).toHaveLength(0);
    });

    it('should order projects by creation date descending', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      const projectsCall = mockFromCalls.projects as { order: ReturnType<typeof vi.fn> };
      expect(projectsCall.order).toHaveBeenCalledWith('created_at', { ascending: false });

    });
  });

  // ==========================================================================
  // 3. getProjectDetails Tests
  // ==========================================================================

  describe('getProjectDetails', () => {
    it('should return full project details with photos and renders', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProjects[0], error: null }),
        },
        project_photos: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjectPhotos, error: null }),
        },
        render_results: {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockRenderResults, error: null }),
        },
        decors: {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockDecors, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getProjectDetails(ADMIN_USER_ID, 'project-1');

      // Assert
      expect(result).toMatchObject<ProjectWithRenders>({
        id: 'project-1',
        title: 'Ascenseur Tour Eiffel',
        useCase: 'ascenseur',
        clientReference: 'REF-001',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        photos: expect.arrayContaining([
          expect.objectContaining({
            id: 'photo-1',
            originalImageUrl: expect.any(String),
            renders: expect.arrayContaining([
              expect.objectContaining({
                id: 'render-1',
                resultImageUrl: expect.any(String),
                decor: expect.objectContaining({
                  name: 'Inox Brossé',
                }),
              }),
            ]),
          }),
        ]),
        totalPhotos: 2,
        totalRenders: 3,
      });
    });

    it('should throw ProjectNotFoundError if project does not exist', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act & Assert
      await expect(
        service.getProjectDetails(ADMIN_USER_ID, 'non-existent-project')
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it('should include creative AI imports (renders without decor_id)', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProjects[0], error: null }),
        },
        project_photos: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjectPhotos, error: null }),
        },
        render_results: {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockRenderResults, error: null }),
        },
        decors: {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockDecors, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getProjectDetails(ADMIN_USER_ID, 'project-1');

      // Assert - find creative import (render without decor)
      const photo2 = result.photos.find(p => p.id === 'photo-2');
      expect(photo2).toBeDefined();
      
      const creativeRender = photo2?.renders.find(r => r.id === 'render-3');
      expect(creativeRender).toBeDefined();
      expect(creativeRender?.decor).toBeNull();
      expect(creativeRender?.isCreativeImport).toBe(true);
    });

    it('should handle project with no photos', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProjects[0], error: null }),
        },
        project_photos: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getProjectDetails(ADMIN_USER_ID, 'project-1');

      // Assert
      expect(result.photos).toHaveLength(0);
      expect(result.totalPhotos).toBe(0);
      expect(result.totalRenders).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should wrap database errors in AdminProjectViewerError', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' } 
        }),
      });

      // Act & Assert
      await expect(
        service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID)
      ).rejects.toThrow(AdminProjectViewerError);
    });

    it('should include original error details in AdminProjectViewerError', async () => {
      // Arrange
      const dbError = { message: 'Database connection failed', code: 'CONNECTION_ERROR' };
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      });

      // Act & Assert
      try {
        await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AdminProjectViewerError);
        expect((error as AdminProjectViewerError).originalError).toEqual(dbError);
      }
    });

    it('should handle null response gracefully', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Act & Assert
      await expect(
        service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID)
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 5. Data Formatting Tests
  // ==========================================================================

  describe('Data Formatting', () => {
    it('should format user full name correctly', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result.user.fullName).toBe('Jean Dupont');
    });

    it('should use email as fallback when name is missing', async () => {
      // Arrange
      const userWithoutName = { ...mockTargetUserProfile, first_name: null, last_name: null };
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: userWithoutName, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result.user.fullName).toBe('revendeur@example.com');
    });

    it('should convert date strings to Date objects', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result.user.createdAt).toBeInstanceOf(Date);
      expect(result.projects[0].createdAt).toBeInstanceOf(Date);
    });

    it('should map use_case to useCase camelCase', async () => {
      // Arrange
      const mockFromCalls: Record<string, unknown> = {
        user_roles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockAdminRole, error: null }),
        },
        profiles: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTargetUserProfile, error: null }),
        },
        projects: {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
        },
      };

      mockSupabaseClient.from.mockImplementation((table: string) => mockFromCalls[table]);

      // Act
      const result = await service.getUserProjects(ADMIN_USER_ID, TARGET_USER_ID);

      // Assert
      expect(result.projects[0].useCase).toBe('ascenseur');
      expect(result.projects[1].useCase).toBe('van');
    });
  });

  // ==========================================================================
  // 6. Factory Function Tests
  // ==========================================================================

  describe('createAdminProjectViewerService', () => {
    it('should create a valid service instance', () => {
      // Act
      const service = createAdminProjectViewerService(mockSupabaseClient as unknown as SupabaseClient);

      // Assert
      expect(service).toBeInstanceOf(AdminProjectViewerService);
    });

    it('should accept supabase client', () => {
      // Act & Assert
      expect(() => createAdminProjectViewerService(mockSupabaseClient as unknown as SupabaseClient)).not.toThrow();
    });
  });
});
