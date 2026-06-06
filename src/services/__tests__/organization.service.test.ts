/**
 * @fileoverview TDD Tests for Organization Service
 * 
 * Phase 2.0: Multi-tenant Organization Model
 * 
 * Requirements:
 * - Create and manage organizations (revendeurs)
 * - Invite and manage members
 * - Track subscription tiers and quotas
 * - Custom branding per organization
 * - Organization-scoped project access
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {OrganizationService, OrganizationNotFoundError, MemberAlreadyExistsError, InvitationExpiredError, type Organization, type CreateOrganizationInput, type UpdateOrganizationInput, type SubscriptionTier} from '../organization.service';
import { createMockSupabaseClient } from '@/test/test-utils';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new OrganizationService(mockSupabase as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    const creatorUserId = 'user-123';
    const input: CreateOrganizationInput = {
      name: 'DICA Revendeur Paris',
      slug: 'dica-paris',
    };

    it('should create organization and add creator as owner', async () => {
      // Arrange
      const mockOrg = {
        id: 'org-456',
        ...input,
        subscription_tier: 'starter',
        monthly_render_quota: 100,
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn()
        .mockResolvedValueOnce({ data: mockOrg, error: null })
        .mockResolvedValueOnce({ data: { id: 'member-1' }, error: null });

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      // Act
      const result = await service.createOrganization(input, creatorUserId);

      // Assert
      expect(result.id).toBe('org-456');
      expect(result.name).toBe('DICA Revendeur Paris');
      expect(result.subscription_tier).toBe('starter');
    });

    it('should generate slug from name if not provided', () => {
      // Test the generateSlug method directly
      const slug = service.generateSlug('Mon Entreprise Décor');
      expect(slug).toBe('mon-entreprise-decor');
    });

    it('should set default branding colors', async () => {
      // Arrange - Verify returned org has default color
      const mockOrg = {
        id: 'org-1',
        ...input,
        primary_color: '#E94E5D', // Default color
        subscription_tier: 'starter',
        monthly_render_quota: 100,
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
      });

      // Act
      const result = await service.createOrganization(input, creatorUserId);

      // Assert
      expect(result.primary_color).toBe('#E94E5D');
    });

    it('should allow custom branding in input', async () => {
      // Arrange
      const customInput: CreateOrganizationInput = {
        ...input,
        primary_color: '#FF5500',
        logo_url: 'https://example.com/logo.png',
      };

      mockSupabase.from().insert.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { id: 'org-1', ...customInput },
        error: null,
      });

      // Act
      const result = await service.createOrganization(customInput, creatorUserId);

      // Assert
      expect(result.primary_color).toBe('#FF5500');
      expect(result.logo_url).toBe('https://example.com/logo.png');
    });
  });

  describe('getOrganization', () => {
    it('should return organization by ID', async () => {
      // Arrange
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        subscription_tier: 'pro',
        monthly_render_quota: 500,
      };

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      // Act
      const result = await service.getOrganization('org-123');

      // Assert
      expect(result.id).toBe('org-123');
      expect(result.name).toBe('Test Org');
    });

    it('should throw OrganizationNotFoundError for invalid ID', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Act & Assert
      await expect(service.getOrganization('invalid-id'))
        .rejects
        .toThrow(OrganizationNotFoundError);
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return organization by slug', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { id: 'org-123', slug: 'my-org' },
        error: null,
      });

      // Act
      const result = await service.getOrganizationBySlug('my-org');

      // Assert
      expect(result.slug).toBe('my-org');
    });
  });

  describe('updateOrganization', () => {
    const orgId = 'org-123';
    const updates: UpdateOrganizationInput = {
      name: 'Updated Name',
      primary_color: '#000000',
    };

    it('should update organization details', async () => {
      // Arrange
      mockSupabase.from().update.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { id: orgId, ...updates },
        error: null,
      });

      // Act
      const result = await service.updateOrganization(orgId, updates);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(result.primary_color).toBe('#000000');
    });

    it('should regenerate slug if name changes and autoUpdateSlug is true', async () => {
      // Arrange
      let capturedUpdate: { slug?: string } = {};
      mockSupabase.from().update.mockImplementation((data: { slug?: string }) => {
        capturedUpdate = data;
        return mockSupabase.from();
      });

      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { id: orgId, name: 'New Name', slug: 'new-name' },
        error: null,
      });

      // Act
      await service.updateOrganization(orgId, { name: 'New Name' }, { autoUpdateSlug: true });

      // Assert
      expect(capturedUpdate.slug).toBe('new-name');
    });
  });

  describe('inviteMember', () => {
    const orgId = 'org-123';
    const email = 'newmember@dica.com';

    it('should create invitation for new member', async () => {
      // Arrange - Check member doesn't exist
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Create invitation
      const mockInvitation = {
        id: 'inv-123',
        organization_id: orgId,
        email,
        role: 'member',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      mockSupabase.from().insert.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockInvitation,
        error: null,
      });

      // Act
      const result = await service.inviteMember(orgId, email, 'member');

      // Assert
      expect(result.email).toBe(email);
      expect(result.role).toBe('member');
      expect(result.expires_at).toBeDefined();
    });

    it('should throw MemberAlreadyExistsError if user is already member', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { id: 'member-1', email, role: 'member' },
        error: null,
      });

      // Act & Assert
      await expect(service.inviteMember(orgId, email, 'member'))
        .rejects
        .toThrow(MemberAlreadyExistsError);
    });

    it('should set invitation expiry to 7 days', async () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      let capturedExpiry: string | undefined;
      mockSupabase.from().insert.mockImplementation((data: { expires_at?: string }) => {
        capturedExpiry = data.expires_at;

        return mockSupabase.from();
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { id: 'inv-1', expires_at: capturedExpiry },
        error: null,
      });

      // Act
      await service.inviteMember(orgId, email, 'member');

      // Assert
      const expiryDate = new Date(capturedExpiry!);
      expect(expiryDate).toEqual(new Date('2024-01-22T10:00:00Z'));

      vi.useRealTimers();
    });
  });

  describe('acceptInvitation', () => {
    const invitationId = 'inv-123';
    const userId = 'user-456';

    it('should create member record on valid invitation', async () => {
      // Arrange
      const validInvitation = {
        id: invitationId,
        organization_id: 'org-123',
        email: 'test@dica.com',
        role: 'member',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Get invitation
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: validInvitation, error: null }),
          };
        } else if (callCount === 2) {
          // Create member
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-1', user_id: userId, role: 'member' },
              error: null,
            }),
          };
        } else {
          // Delete invitation
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      // Act
      const result = await service.acceptInvitation(invitationId, userId);

      // Assert
      expect(result.user_id).toBe(userId);
      expect(result.role).toBe('member');
    });

    it('should throw InvitationExpiredError for expired invitation', async () => {
      // Arrange
      const expiredInvitation = {
        id: invitationId,
        organization_id: 'org-123',
        email: 'test@dica.com',
        role: 'member',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: expiredInvitation,
        error: null,
      });

      // Act & Assert
      await expect(service.acceptInvitation(invitationId, userId))
        .rejects
        .toThrow(InvitationExpiredError);
    });
  });

  describe('getMembers', () => {
    const orgId = 'org-123';

    it('should return all members of organization', async () => {
      // Arrange
      const mockMembers = [
        { id: 'member-1', user_id: 'user-1', role: 'owner', joined_at: '2024-01-01' },
        { id: 'member-2', user_id: 'user-2', role: 'member', joined_at: '2024-01-15' },
      ];

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().order.mockResolvedValue({
        data: mockMembers,
        error: null,
      });

      // Act
      const result = await service.getMembers(orgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('owner');
    });

    it('should only return active members (with joined_at)', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'member-1', user_id: 'user-1', role: 'owner', joined_at: '2024-01-01' }],
          error: null,
        }),
      });

      // Act
      const result = await service.getMembers(orgId, { activeOnly: true });

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      // Arrange - First call checks role (not owner), second deletes
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          };
        } else {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          };
        }
      });

      // Act & Assert
      await expect(service.removeMember('org-123', 'user-456'))
        .resolves
        .not.toThrow();
    });

    it('should not allow removing the last owner', async () => {
      // Arrange
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check role
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
          };
        } else {
          // Count owners
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: 1,
          };
        }
      });

      // Act & Assert
      await expect(service.removeMember('org-123', 'user-456'))
        .rejects
        .toThrow('Cannot remove the last owner');
    });
  });

  describe('updateSubscription', () => {
    const orgId = 'org-123';

    it('should update subscription tier and quota', async () => {
      // Arrange
      const tierLimits: Record<SubscriptionTier, number> = {
        starter: 100,
        pro: 500,
        enterprise: 2000,
      };

      mockSupabase.from().update.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: orgId,
          subscription_tier: 'pro',
          monthly_render_quota: tierLimits.pro,
        },
        error: null,
      });

      // Act
      const result = await service.updateSubscription(orgId, 'pro');

      // Assert
      expect(result.subscription_tier).toBe('pro');
      expect(result.monthly_render_quota).toBe(500);
    });
  });

  describe('getUserOrganizations', () => {
    const userId = 'user-123';

    it('should return all organizations user is member of', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: [
            { organization: { id: 'org-1', name: 'Org 1' }, role: 'owner' },
            { organization: { id: 'org-2', name: 'Org 2' }, role: 'member' },
          ],
          error: null,
        }),
      });

      // Act
      const result = await service.getUserOrganizations(userId);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('generateSlug', () => {
    it('should convert name to URL-friendly slug', () => {
      expect(service.generateSlug('Mon Entreprise')).toBe('mon-entreprise');
      expect(service.generateSlug('DICA France SAS')).toBe('dica-france-sas');
      expect(service.generateSlug('L\'Artisan Décor')).toBe('l-artisan-decor');
    });

    it('should remove special characters', () => {
      expect(service.generateSlug('Test@Company#123')).toBe('test-company-123');
    });

    it('should handle accents', () => {
      expect(service.generateSlug('Société Générale')).toBe('societe-generale');
      expect(service.generateSlug('Décoration Élégante')).toBe('decoration-elegante');
    });

    it('should collapse multiple hyphens', () => {
      expect(service.generateSlug('Test   Multiple   Spaces')).toBe('test-multiple-spaces');
    });
  });
});

describe('OrganizationService - Error Classes', () => {
  describe('OrganizationNotFoundError', () => {
    it('should have correct properties', () => {
      const error = new OrganizationNotFoundError('org-123');
      
      expect(error.name).toBe('OrganizationNotFoundError');
      expect(error.organizationId).toBe('org-123');
    });
  });

  describe('MemberAlreadyExistsError', () => {
    it('should include email', () => {
      const error = new MemberAlreadyExistsError('test@dica.com');
      
      expect(error.email).toBe('test@dica.com');
    });
  });

  describe('InvitationExpiredError', () => {
    it('should include invitation ID', () => {
      const error = new InvitationExpiredError('inv-123');
      
      expect(error.invitationId).toBe('inv-123');
    });
  });
});

