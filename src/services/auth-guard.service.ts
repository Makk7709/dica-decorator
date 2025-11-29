/**
 * @fileoverview Auth Guard Service - Server-side Permission Validation
 * 
 * Provides server-side authentication and authorization for Edge Functions.
 * Never trust client-side role assertions - always validate on server.
 * 
 * Features:
 * - Session validation
 * - Role-based access control (RBAC)
 * - Project ownership verification
 * - Organization membership checks
 * - Role caching for performance
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AuthGuardConfig {
  roleHierarchy: {
    admin: string[];
    client: string[];
    [key: string]: string[];
  };
  cacheTtlMs: number;
}

export interface UserContext {
  userId: string;
  email: string;
  isAuthenticated: boolean;
  role?: string;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export interface OrganizationMembership {
  isMember: boolean;
  role: string | null;
  isPending: boolean;
}

interface CacheEntry {
  role: string;
  expiresAt: number;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  public readonly requiredRole?: string;
  public readonly actualRole?: string;

  constructor(message: string, requiredRole?: string, actualRole?: string) {
    super(message);
    this.name = 'ForbiddenError';
    this.requiredRole = requiredRole;
    this.actualRole = actualRole;
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AuthGuardService {
  private roleCache: Map<string, CacheEntry> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private config: AuthGuardConfig
  ) {}

  /**
   * Validates a session token and returns user context
   * 
   * @param token - JWT token from Authorization header
   * @returns User context
   * @throws {UnauthorizedError} If session is invalid
   */
  async validateSession(token: string): Promise<UserContext> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new UnauthorizedError('Token is required');
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError(error?.message || 'Invalid session');
    }

    return {
      userId: data.user.id,
      email: data.user.email || '',
      isAuthenticated: true,
    };
  }

  /**
   * Gets the role for a user, with caching
   * 
   * @param userId - The user's ID
   * @returns The user's role ('admin' or 'client')
   */
  async getUserRole(userId: string): Promise<string> {
    // Check cache first
    const cached = this.roleCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.role;
    }

    // Query database
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    // Default to client if no role found
    const role = (!error && data?.role) ? data.role : 'client';

    // Cache the result
    this.roleCache.set(userId, {
      role,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    });

    return role;
  }

  /**
   * Requires a specific role, throwing if not met
   * 
   * @param userId - The user's ID
   * @param requiredRole - The role required
   * @throws {ForbiddenError} If role requirement not met
   */
  async requireRole(userId: string, requiredRole: string): Promise<void> {
    const actualRole = await this.getUserRole(userId);
    
    // Check if user's role includes the required role in hierarchy
    const allowedRoles = this.config.roleHierarchy[actualRole] || [];
    
    if (!allowedRoles.includes(requiredRole)) {
      throw new ForbiddenError(
        `Role '${requiredRole}' is required`,
        requiredRole,
        actualRole
      );
    }
  }

  /**
   * Checks if a user owns a project
   * 
   * @param userId - The user's ID
   * @param projectId - The project's ID
   * @param options - Optional settings
   * @returns True if user owns the project
   */
  async checkProjectOwnership(
    userId: string,
    projectId: string,
    options: { allowAdmin?: boolean } = {}
  ): Promise<boolean> {
    // Check if admin should have access
    if (options.allowAdmin) {
      const role = await this.getUserRole(userId);
      if (role === 'admin') {
        return true;
      }
    }

    const { data, error } = await this.supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === userId;
  }

  /**
   * Requires project access, throwing if not authorized
   * 
   * @param userId - The user's ID
   * @param projectId - The project's ID
   * @throws {ForbiddenError} If access is denied
   */
  async requireProjectAccess(userId: string, projectId: string): Promise<void> {
    const hasAccess = await this.checkProjectOwnership(userId, projectId, { allowAdmin: true });
    
    if (!hasAccess) {
      throw new ForbiddenError('Access to this project is denied');
    }
  }

  /**
   * Checks organization membership
   * 
   * @param userId - The user's ID
   * @param organizationId - The organization's ID
   * @returns Membership details
   */
  async checkOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMembership> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role, joined_at')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return {
        isMember: false,
        role: null,
        isPending: false,
      };
    }

    // Not yet joined (pending invitation)
    if (!data.joined_at) {
      return {
        isMember: false,
        role: data.role,
        isPending: true,
      };
    }

    return {
      isMember: true,
      role: data.role,
      isPending: false,
    };
  }

  /**
   * Requires organization access, throwing if not authorized
   * 
   * @param userId - The user's ID
   * @param organizationId - The organization's ID
   * @param requiredRole - Optional specific role required
   * @throws {ForbiddenError} If access is denied
   */
  async requireOrganizationAccess(
    userId: string,
    organizationId: string,
    requiredRole?: string
  ): Promise<void> {
    const membership = await this.checkOrganizationMembership(userId, organizationId);

    if (!membership.isMember) {
      throw new ForbiddenError(
        membership.isPending
          ? 'Invitation not yet accepted'
          : 'Not a member of this organization'
      );
    }

    // Check specific role if required
    if (requiredRole && membership.role !== requiredRole) {
      // Check role hierarchy within organization
      const orgRoleHierarchy: Record<string, string[]> = {
        owner: ['owner', 'admin', 'member'],
        admin: ['admin', 'member'],
        member: ['member'],
      };

      const allowedRoles = orgRoleHierarchy[membership.role || ''] || [];
      if (!allowedRoles.includes(requiredRole)) {
        throw new ForbiddenError(
          `Role '${requiredRole}' is required for this action`,
          requiredRole,
          membership.role || undefined
        );
      }
    }
  }

  /**
   * Clears the role cache
   * 
   * @param userId - Optional specific user to clear
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.roleCache.delete(userId);
    } else {
      this.roleCache.clear();
    }
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createAuthGuardService = (
  supabase: SupabaseClient,
  config?: Partial<AuthGuardConfig>
): AuthGuardService => {
  const defaultConfig: AuthGuardConfig = {
    roleHierarchy: {
      admin: ['admin', 'client'],
      client: ['client'],
    },
    cacheTtlMs: 60000, // 1 minute
  };

  return new AuthGuardService(supabase, { ...defaultConfig, ...config });
};

