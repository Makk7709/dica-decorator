/**
 * @fileoverview Tests TDD pour ProjectRenameService
 * Service de renommage sécurisé de projets avec processus de sécurité
 * 
 * Fonctionnalités testées:
 * - Vérification de propriétaire
 * - Validation du nouveau nom
 * - Contraintes de longueur et format
 * - Logs de sécurité
 * - Gestion d'erreurs
 * - Protection contre renommages non autorisés
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {ProjectRenameService} from '../project-rename.service';
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

describe('ProjectRenameService', () => {
  let service: ProjectRenameService;
  let mockFrom: any;
  let mockAuth: any;

  beforeEach(() => {
    service = ProjectRenameService.getInstance();
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
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: projectId,
          user_id: userId,
          title: 'Ancien Nom',
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
      expect(result.currentTitle).toBe('Ancien Nom');
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
      
      const result = await service.validateProjectOwnership(projectId);
      
      expect(result.isValid).toBe(false);
      expect(result.isOwner).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('should validate new title format correctly', () => {
      // Titre valide
      expect(service.validateTitle('Nouveau Projet')).toEqual({
        isValid: true,
        error: undefined,
      });

      // Titre trop court
      expect(service.validateTitle('')).toEqual({
        isValid: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });

      // Titre avec seulement des espaces
      expect(service.validateTitle('   ')).toEqual({
        isValid: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });

      // Titre trop long
      const longTitle = 'A'.repeat(201);
      expect(service.validateTitle(longTitle)).toEqual({
        isValid: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      });

      // Titre valide - longueur max
      const maxLengthTitle = 'A'.repeat(200);
      expect(service.validateTitle(maxLengthTitle)).toEqual({
        isValid: true,
        error: undefined,
      });
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
  });

  // ============================================================================
  // Rename Process Tests
  // ============================================================================
  describe('Rename Process', () => {
    it('should rename project successfully with all security checks', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitle = 'Nouveau Nom Projet';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock validation - projet existe et appartient à l'utilisateur
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Ancien Nom' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock update - chaîne complète: update().eq().select().single()
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: newTitle },
        error: null,
      });
      
      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      });
      
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: mockValidateSelect,
            update: mockUpdate,
          };
        }
        return { select: vi.fn() };
      });
      
      const result = await service.renameProject(projectId, newTitle);
      
      expect(result.success).toBe(true);
      expect(result.newTitle).toBe(newTitle);
      expect(result.error).toBeUndefined();
    });

    it('should reject rename when user is not owner', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440002';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitle = 'Nouveau Nom';
      
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
      
      const result = await service.renameProject(projectId, newTitle);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('should reject rename when new title is invalid', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidTitle = '';
      
      const result = await service.renameProject(projectId, invalidTitle);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle update errors gracefully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitle = 'Nouveau Nom';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock validation - réussit
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Ancien Nom' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock update - échoue
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23505' },
      });
      
      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      });
      
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });
      
      mockFrom.mockImplementation(() => ({
        select: mockValidateSelect,
        update: mockUpdate,
      }));
      
      const result = await service.renameProject(projectId, newTitle);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // L'erreur peut être UPDATE_ERROR ou NETWORK_ERROR selon où elle se produit
      expect(['UPDATE_ERROR', 'NETWORK_ERROR']).toContain(result.error?.code);
      expect(result.error?.message).toContain('error');
    });

    it('should log security event on successful rename', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitle = 'Nouveau Nom';
      
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
        data: { id: projectId, user_id: userId, title: 'Ancien Nom' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      // Mock update - réussit
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: newTitle },
        error: null,
      });
      
      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      });
      
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });
      
      mockFrom.mockImplementation(() => ({
        select: mockValidateSelect,
        update: mockUpdate,
      }));
      
      await service.renameProject(projectId, newTitle);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Security: Project rename initiated'),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Security: Project renamed successfully'),
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

    it('should handle network errors during rename', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitle = 'Nouveau Nom';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      // Mock validation - réussit
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Ancien Nom' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'projects') {
          // Validation réussit
          if (mockFrom.mock.calls.length === 1) {
            return {
              select: mockValidateSelect,
            };
          }
          // Update échoue avec exception
          return {
            select: mockValidateSelect,
            update: () => {
              throw new Error('Network error during update');
            },
          };
        }
        return { select: vi.fn() };
      });
      
      const result = await service.renameProject(projectId, newTitle);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should trim whitespace from new title', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const newTitleWithSpaces = '  Nouveau Nom  ';
      const expectedTitle = 'Nouveau Nom';
      
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockValidateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: 'Ancien Nom' },
        error: null,
      });
      
      const mockValidateEq = vi.fn().mockReturnValue({
        single: mockValidateSingle,
      });
      
      const mockValidateSelect = vi.fn().mockReturnValue({
        eq: mockValidateEq,
      });
      
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { id: projectId, user_id: userId, title: expectedTitle },
        error: null,
      });
      
      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      });
      
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });
      
      mockFrom.mockImplementation(() => ({
        select: mockValidateSelect,
        update: mockUpdate,
      }));
      
      const result = await service.renameProject(projectId, newTitleWithSpaces);
      
      expect(result.success).toBe(true);
      expect(result.newTitle).toBe(expectedTitle);
    });
  });
});

