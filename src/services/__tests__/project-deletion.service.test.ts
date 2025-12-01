/**
 * @fileoverview Tests TDD pour ProjectDeletionService
 * Service de suppression sécurisée de projets avec processus de sécurité
 * 
 * Fonctionnalités testées:
 * - Vérification de propriétaire
 * - Validation des permissions
 * - Suppression en cascade sécurisée
 * - Logs de sécurité
 * - Gestion d'erreurs
 * - Protection contre suppressions non autorisées
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProjectDeletionService,
  ProjectDeletionResult,
  ProjectDeletionError,
  ProjectDeletionValidation,
} from '../project-deletion.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('ProjectDeletionService', () => {
  let service: ProjectDeletionService;
  let mockFrom: any;
  let mockAuth: any;

  beforeEach(() => {
    service = ProjectDeletionService.getInstance();
    mockFrom = vi.fn();
    mockAuth = {
      getUser: vi.fn(),
    };
    
    (supabase.from as any) = mockFrom;
    (supabase.auth as any) = mockAuth;
    
    vi.clearAllMocks();
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================
  describe('Validation', () => {
    it('should validate project ownership successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Mock auth
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock project fetch - chaîne complète Supabase
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: projectId,
          user_id: userId,
          title: 'Mon Projet',
        },
        error: null,
      });
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      
      const result = await service.validateProjectOwnership(projectId);
      
      expect(result.isValid).toBe(true);
      expect(result.isOwner).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.projectTitle).toBe('Mon Projet');
      expect(mockFrom).toHaveBeenCalledWith('projects');
    });

    it('should reject validation when user is not owner', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440002';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: projectId,
          user_id: otherUserId, // Différent user
          title: 'Projet Autre',
        },
        error: null,
      });
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      
      const result = await service.validateProjectOwnership(projectId);
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.error?.message).toContain('not authorized');
    });

    it('should reject validation when project does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Project not found', code: 'PGRST116' },
      });
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      
      const result = await service.validateProjectOwnership(projectId);
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should reject validation when user is not authenticated', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });
      
      const result = await service.validateProjectOwnership(projectId);
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NOT_AUTHENTICATED');
    });
  });

  // ============================================================================
  // Security Checks Tests
  // ============================================================================
  describe('Security Checks', () => {
    it('should check project statistics before deletion', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const photo1Id = '550e8400-e29b-41d4-a716-446655440010';
      const photo2Id = '550e8400-e29b-41d4-a716-446655440011';
      
      // Mock project_photos
      const mockPhotosEq = vi.fn().mockResolvedValue({
        data: [{ id: photo1Id }, { id: photo2Id }],
        error: null,
      });
      const mockPhotosSelect = vi.fn().mockReturnValue({
        eq: mockPhotosEq,
      });
      
      // Mock render_results pour chaque photo
      const mockRender1Eq = vi.fn().mockResolvedValue({
        data: [{ id: 'render-1' }],
        error: null,
      });
      const mockRender1Select = vi.fn().mockReturnValue({
        eq: mockRender1Eq,
      });
      
      const mockRender2Eq = vi.fn().mockResolvedValue({
        data: [{ id: 'render-2' }],
        error: null,
      });
      const mockRender2Select = vi.fn().mockReturnValue({
        eq: mockRender2Eq,
      });
      
      // Mock share_links
      const mockShareLinksEq = vi.fn().mockResolvedValue({
        data: [{ id: 'share-1' }],
        error: null,
      });
      const mockShareLinksSelect = vi.fn().mockReturnValue({
        eq: mockShareLinksEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'project_photos') {
          return {
            select: mockPhotosSelect,
          };
        }
        if (table === 'render_results') {
          // Retourne un mock différent pour chaque photo
          let callCount = 0;
          return {
            select: () => {
              callCount++;
              if (callCount === 1) {
                return { eq: mockRender1Eq };
              }
              return { eq: mockRender2Eq };
            },
          };
        }
        if (table === 'share_links') {
          return {
            select: mockShareLinksSelect,
          };
        }
        return { select: vi.fn() };
      });
      
      const stats = await service.getProjectDeletionStats(projectId);
      
      expect(stats.photosCount).toBe(2);
      expect(stats.rendersCount).toBe(2);
      expect(stats.shareLinksCount).toBe(1);
      expect(stats.totalItemsToDelete).toBe(5);
    });

    it('should return zero counts for project with no data', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      
      const stats = await service.getProjectDeletionStats(projectId);
      
      expect(stats.photosCount).toBe(0);
      expect(stats.rendersCount).toBe(0);
      expect(stats.shareLinksCount).toBe(0);
      expect(stats.totalItemsToDelete).toBe(0);
    });
  });

  // ============================================================================
  // Deletion Process Tests
  // ============================================================================
  describe('Deletion Process', () => {
    it('should delete project successfully with all security checks', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Mock auth
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock validation - projet existe et appartient à l'utilisateur
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Mon Projet' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock stats - pas de données
      const mockStatsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      
      const mockStatsSelect = vi.fn().mockReturnValue({
        eq: mockStatsEq,
      });
      
      // Mock deletion
      const mockDeleteEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: mockValidateSelect,
            delete: mockDelete,
          };
        }
        // Pour les stats
        return {
          select: mockStatsSelect,
        };
      });
      
      const result = await service.deleteProject(projectId);
      
      expect(result.success).toBe(true);
      expect(result.deletedProjectId).toBe(projectId);
      expect(result.deletedStats).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject deletion when user is not owner', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440002';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: projectId,
          user_id: otherUserId,
          title: 'Projet Autre',
        },
        error: null,
      });
      
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      
      const result = await service.deleteProject(projectId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('should handle deletion errors gracefully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock validation - réussit
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Mon Projet' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock stats
      const mockStatsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      
      const mockStatsSelect = vi.fn().mockReturnValue({
        eq: mockStatsEq,
      });
      
      // Mock deletion - échoue
      const mockDeleteEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23503' },
      });
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: mockValidateSelect,
            delete: mockDelete,
          };
        }
        return {
          select: mockStatsSelect,
        };
      });
      
      const result = await service.deleteProject(projectId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DELETION_ERROR');
      expect(result.error?.message).toContain('Database error');
    });

    it('should log security event on successful deletion', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockAuth.getUser
        .mockResolvedValueOnce({
          data: { user: { id: userId } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { user: { id: userId } },
          error: null,
        });
      
      // Mock validation
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Mon Projet' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock stats
      const mockStatsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      
      const mockStatsSelect = vi.fn().mockReturnValue({
        eq: mockStatsEq,
      });
      
      // Mock deletion - réussit
      const mockDeleteEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: mockValidateSelect,
            delete: mockDelete,
          };
        }
        return {
          select: mockStatsSelect,
        };
      });
      
      await service.deleteProject(projectId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Security: Project deletion initiated'),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Security: Project deleted successfully'),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty projectId', async () => {
      const result = await service.validateProjectOwnership('');
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid UUID format', async () => {
      const result = await service.validateProjectOwnership('invalid-uuid');
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle network errors during deletion', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      
      let validationDone = false;
      let statsDone = false;
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // La validation et les stats réussissent, mais une erreur réseau se produit lors de la suppression
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Mon Projet' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      const mockStatsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      
      const mockStatsSelect = vi.fn().mockReturnValue({
        eq: mockStatsEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          // Première fois : validation (select)
          if (!validationDone) {
            validationDone = true;
            return {
              select: mockValidateSelect,
            };
          }
          // Deuxième fois : suppression (delete) - la promesse rejette
          const mockDeleteEq = vi.fn().mockRejectedValue(
            new Error('Network error during deletion')
          );
          const mockDelete = vi.fn().mockReturnValue({
            eq: mockDeleteEq,
          });
          return {
            select: mockValidateSelect,
            delete: mockDelete,
          };
        }
        // Stats
        if (!statsDone && (table === 'project_photos' || table === 'share_links')) {
          statsDone = true;
          return {
            select: mockStatsSelect,
          };
        }
        return {
          select: mockStatsSelect,
        };
      });
      
      const result = await service.deleteProject(projectId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('Network error');
    });
  });
});
