/**
 * @fileoverview TDD Tests for Auth Guard Service
 * 
 * Phase 1.4 & 1.5: Server-side Role Validation & Permission Checks
 * 
 * Requirements:
 * - Validate user roles server-side (never trust client)
 * - Check project ownership before operations
 * - Verify organization membership
 * - Implement permission hierarchy (admin > member > viewer)
 * - Cache role lookups for performance
 * - Provide middleware pattern for Edge Functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthGuardService,
  UnauthorizedError,
  ForbiddenError,
  type UserContext,
  type PermissionCheck,
  type AuthGuardConfig,
} from '../auth-guard.service';
import { createMockSupabaseClient } from '@/test/test-utils';

describe('AuthGuardService', () => {
  let service: AuthGuardService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const defaultConfig: AuthGuardConfig = {
    roleHierarchy: {
      admin: ['admin', 'client'],
      client: ['client'],
    },
    cacheTtlMs: 60000, // 1 minute
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new AuthGuardService(mockSupabase as never, defaultConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('validateSession', () => {
    it('should return user context for valid session', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@dica.com',
        role: 'authenticated',
      };
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const context = await service.validateSession('valid-jwt-token');

      // Assert
      expect(context.userId).toBe('user-123');
      expect(context.email).toBe('test@dica.com');
      expect(context.isAuthenticated).toBe(true);
    });

    it('should throw UnauthorizedError for invalid session', async () => {
      // Arrange
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      // Act & Assert
      await expect(service.validateSession('invalid-token'))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for expired session', async () => {
      // Arrange
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      // Act & Assert
      await expect(service.validateSession('expired-token'))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for missing token', async () => {
      // Act & Assert
      await expect(service.validateSession(''))
        .rejects
        .toThrow(UnauthorizedError);
    });
  });

  describe('getUserRole', () => {
    const userId = 'user-123';

    it('should return role for user with role record', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      // Act
      const role = await service.getUserRole(userId);

      // Assert
      expect(role).toBe('admin');
    });

    it('should return "client" for user without role record', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act
      const role = await service.getUserRole(userId);

      // Assert
      expect(role).toBe('client');
    });

    it('should cache role lookups', async () => {
      // Arrange
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      // Act
      await service.getUserRole(userId);
      await service.getUserRole(userId);
      await service.getUserRole(userId);

      // Assert - should only call database once (cached after first call)
      expect(singleMock).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after TTL', async () => {
      // Arrange
      const singleMock = vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      });

      // Act
      await service.getUserRole(userId);
      
      // Advance time past cache TTL
      vi.advanceTimersByTime(defaultConfig.cacheTtlMs + 1000);
      
      await service.getUserRole(userId);

      // Assert - should call database twice after cache expiry
      expect(singleMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('requireRole', () => {
    it('should pass for user with exact required role', async () => {
      // Arrange
      vi.spyOn(service, 'getUserRole').mockResolvedValue('admin');

      // Act & Assert
      await expect(service.requireRole('user-123', 'admin'))
        .resolves
        .not.toThrow();
    });

    it('should pass for admin when client role is required (hierarchy)', async () => {
      // Arrange
      vi.spyOn(service, 'getUserRole').mockResolvedValue('admin');

      // Act & Assert
      await expect(service.requireRole('user-123', 'client'))
        .resolves
        .not.toThrow();
    });

    it('should throw ForbiddenError when client tries admin action', async () => {
      // Arrange
      vi.spyOn(service, 'getUserRole').mockResolvedValue('client');

      // Act & Assert
      await expect(service.requireRole('user-123', 'admin'))
        .rejects
        .toThrow(ForbiddenError);
    });

    it('should include role info in ForbiddenError', async () => {
      // Arrange
      vi.spyOn(service, 'getUserRole').mockResolvedValue('client');

      // Act & Assert
      try {
        await service.requireRole('user-123', 'admin');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).requiredRole).toBe('admin');
        expect((error as ForbiddenError).actualRole).toBe('client');
      }
    });
  });

  describe('checkProjectOwnership', () => {
    const userId = 'user-123';
    const projectId = 'project-456';

    it('should return true for project owner', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockImplementation((col: string, val: string) => {
        return mockSupabase.from();
      });
      mockSupabase.from().single.mockResolvedValue({
        data: { user_id: userId },
        error: null,
      });

      // Act
      const isOwner = await service.checkProjectOwnership(userId, projectId);

      // Assert
      expect(isOwner).toBe(true);
    });

    it('should return false for non-owner', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { user_id: 'other-user' },
        error: null,
      });

      // Act
      const isOwner = await service.checkProjectOwnership(userId, projectId);

      // Assert
      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent project', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act
      const isOwner = await service.checkProjectOwnership(userId, projectId);

      // Assert
      expect(isOwner).toBe(false);
    });

    it('should allow admin access to any project', async () => {
      // Arrange
      vi.spyOn(service, 'getUserRole').mockResolvedValue('admin');
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { user_id: 'other-user' },
        error: null,
      });

      // Act
      const hasAccess = await service.checkProjectOwnership(userId, projectId, { allowAdmin: true });

      // Assert
      expect(hasAccess).toBe(true);
    });
  });

  describe('requireProjectAccess', () => {
    it('should pass for project owner', async () => {
      // Arrange
      vi.spyOn(service, 'checkProjectOwnership').mockResolvedValue(true);

      // Act & Assert
      await expect(service.requireProjectAccess('user-123', 'project-456'))
        .resolves
        .not.toThrow();
    });

    it('should throw ForbiddenError for non-owner', async () => {
      // Arrange
      vi.spyOn(service, 'checkProjectOwnership').mockResolvedValue(false);

      // Act & Assert
      await expect(service.requireProjectAccess('user-123', 'project-456'))
        .rejects
        .toThrow(ForbiddenError);
    });
  });

  describe('checkOrganizationMembership', () => {
    const userId = 'user-123';
    const organizationId = 'org-456';

    it('should return member role for organization member', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'member', joined_at: new Date().toISOString() },
        error: null,
      });

      // Act
      const membership = await service.checkOrganizationMembership(userId, organizationId);

      // Assert
      expect(membership.isMember).toBe(true);
      expect(membership.role).toBe('member');
    });

    it('should return owner role for organization owner', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'owner', joined_at: new Date().toISOString() },
        error: null,
      });

      // Act
      const membership = await service.checkOrganizationMembership(userId, organizationId);

      // Assert
      expect(membership.isMember).toBe(true);
      expect(membership.role).toBe('owner');
    });

    it('should return false for non-member', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act
      const membership = await service.checkOrganizationMembership(userId, organizationId);

      // Assert
      expect(membership.isMember).toBe(false);
      expect(membership.role).toBeNull();
    });

    it('should return false for pending invitation (no joined_at)', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'member', joined_at: null },
        error: null,
      });

      // Act
      const membership = await service.checkOrganizationMembership(userId, organizationId);

      // Assert
      expect(membership.isMember).toBe(false);
      expect(membership.isPending).toBe(true);
    });
  });

  describe('requireOrganizationAccess', () => {
    it('should pass for organization member', async () => {
      // Arrange
      vi.spyOn(service, 'checkOrganizationMembership').mockResolvedValue({
        isMember: true,
        role: 'member',
        isPending: false,
      });

      // Act & Assert
      await expect(service.requireOrganizationAccess('user-123', 'org-456'))
        .resolves
        .not.toThrow();
    });

    it('should throw ForbiddenError for non-member', async () => {
      // Arrange
      vi.spyOn(service, 'checkOrganizationMembership').mockResolvedValue({
        isMember: false,
        role: null,
        isPending: false,
      });

      // Act & Assert
      await expect(service.requireOrganizationAccess('user-123', 'org-456'))
        .rejects
        .toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for pending member', async () => {
      // Arrange
      vi.spyOn(service, 'checkOrganizationMembership').mockResolvedValue({
        isMember: false,
        role: 'member',
        isPending: true,
      });

      // Act & Assert
      await expect(service.requireOrganizationAccess('user-123', 'org-456'))
        .rejects
        .toThrow(ForbiddenError);
    });

    it('should check for specific role when required', async () => {
      // Arrange
      vi.spyOn(service, 'checkOrganizationMembership').mockResolvedValue({
        isMember: true,
        role: 'member',
        isPending: false,
      });

      // Act & Assert - member trying to do owner action
      await expect(service.requireOrganizationAccess('user-123', 'org-456', 'owner'))
        .rejects
        .toThrow(ForbiddenError);
    });

    it('should pass owner role check for owner', async () => {
      // Arrange
      vi.spyOn(service, 'checkOrganizationMembership').mockResolvedValue({
        isMember: true,
        role: 'owner',
        isPending: false,
      });

      // Act & Assert
      await expect(service.requireOrganizationAccess('user-123', 'org-456', 'owner'))
        .resolves
        .not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached roles', async () => {
      // Arrange
      const singleMock = vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      });

      // Cache a role
      await service.getUserRole('user-123');
      
      // Clear cache
      service.clearCache();

      // Should call database again
      await service.getUserRole('user-123');

      // Assert - called twice: once before clear, once after
      expect(singleMock).toHaveBeenCalledTimes(2);
    });

    it('should clear specific user from cache', async () => {
      // Arrange
      const singleMock = vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      });

      // Cache roles for two users
      await service.getUserRole('user-123');
      await service.getUserRole('user-456');

      // Clear only one user
      service.clearCache('user-123');

      // Call both again
      await service.getUserRole('user-123'); // Should hit DB (cache cleared)
      await service.getUserRole('user-456'); // Should use cache

      // Assert - 3 DB calls: user-123 (1), user-456 (1), user-123 again (1)
      expect(singleMock).toHaveBeenCalledTimes(3);
    });
  });
});

describe('AuthGuardService - Error Classes', () => {
  describe('UnauthorizedError', () => {
    it('should have correct properties', () => {
      const error = new UnauthorizedError('Session expired');
      
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Session expired');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should include role information', () => {
      const error = new ForbiddenError(
        'Insufficient permissions',
        'admin',
        'client'
      );
      
      expect(error.name).toBe('ForbiddenError');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.requiredRole).toBe('admin');
      expect(error.actualRole).toBe('client');
      expect(error.statusCode).toBe(403);
    });
  });
});

