/**
 * @fileoverview Organization Service - Multi-tenant Management
 * 
 * Manages organizations (revendeurs) with full multi-tenant support.
 * Each organization has its own branding, quotas, and member access.
 * 
 * Features:
 * - Organization CRUD operations
 * - Member invitation and management
 * - Subscription tier management
 * - Custom branding per organization
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color: string;
  subscription_tier: SubscriptionTier;
  monthly_render_quota: number;
  renders_used_this_month: number;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string | null;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
}

interface UpdateOptions {
  autoUpdateSlug?: boolean;
}

interface GetMembersOptions {
  activeOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TIER_QUOTAS: Record<SubscriptionTier, number> = {
  starter: 100,
  pro: 500,
  enterprise: 2000,
};

const DEFAULT_PRIMARY_COLOR = '#E94E5D';
const INVITATION_EXPIRY_DAYS = 7;

// ============================================================================
// Custom Errors
// ============================================================================

export class OrganizationNotFoundError extends Error {
  public readonly organizationId: string;

  constructor(organizationId: string) {
    super(`Organization not found: ${organizationId}`);
    this.name = 'OrganizationNotFoundError';
    this.organizationId = organizationId;
  }
}

export class MemberAlreadyExistsError extends Error {
  public readonly email: string;

  constructor(email: string) {
    super(`Member already exists: ${email}`);
    this.name = 'MemberAlreadyExistsError';
    this.email = email;
  }
}

export class InvitationExpiredError extends Error {
  public readonly invitationId: string;

  constructor(invitationId: string) {
    super(`Invitation expired: ${invitationId}`);
    this.name = 'InvitationExpiredError';
    this.invitationId = invitationId;
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class OrganizationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new organization
   * 
   * @param input - Organization creation data
   * @param creatorUserId - The user creating the organization (becomes owner)
   * @returns The created organization
   */
  async createOrganization(
    input: CreateOrganizationInput,
    creatorUserId: string
  ): Promise<Organization> {
    const slug = input.slug || this.generateSlug(input.name);
    
    const orgData = {
      name: input.name,
      slug,
      logo_url: input.logo_url || null,
      primary_color: input.primary_color || DEFAULT_PRIMARY_COLOR,
      subscription_tier: 'starter' as SubscriptionTier,
      monthly_render_quota: TIER_QUOTAS.starter,
      renders_used_this_month: 0,
    };

    // Create organization
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (orgError || !org) {
      throw new Error(`Failed to create organization: ${orgError?.message}`);
    }

    // Add creator as owner
    await this.supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: creatorUserId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

    return org;
  }

  /**
   * Gets an organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return data;
  }

  /**
   * Gets an organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      throw new OrganizationNotFoundError(slug);
    }

    return data;
  }

  /**
   * Updates an organization
   */
  async updateOrganization(
    organizationId: string,
    updates: UpdateOrganizationInput,
    options: UpdateOptions = {}
  ): Promise<Organization> {
    const updateData: Record<string, unknown> = { ...updates };

    // Auto-generate slug from new name if requested
    if (options.autoUpdateSlug && updates.name) {
      updateData.slug = this.generateSlug(updates.name);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return data;
  }

  /**
   * Invites a member to an organization
   */
  async inviteMember(
    organizationId: string,
    email: string,
    role: 'admin' | 'member'
  ): Promise<OrganizationInvitation> {
    // Check if already a member
    const { data: existingMember } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .single();

    if (existingMember) {
      throw new MemberAlreadyExistsError(email);
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const { data, error } = await this.supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create invitation: ${error?.message}`);
    }

    return data;
  }

  /**
   * Accepts an invitation and adds user as member
   */
  async acceptInvitation(
    invitationId: string,
    userId: string
  ): Promise<OrganizationMember> {
    // Get invitation
    const { data: invitation, error: invError } = await this.supabase
      .from('organization_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      throw new Error('Invitation not found');
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      throw new InvitationExpiredError(invitationId);
    }

    // Create member
    const { data: member, error: memberError } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError || !member) {
      throw new Error(`Failed to create member: ${memberError?.message}`);
    }

    // Delete invitation
    await this.supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId);

    return member;
  }

  /**
   * Gets all members of an organization
   */
  async getMembers(
    organizationId: string,
    options: GetMembersOptions = {}
  ): Promise<OrganizationMember[]> {
    let query = this.supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);

    if (options.activeOnly) {
      query = query.not('joined_at', 'is', null);
    }

    const { data, error } = await query.order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get members: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Removes a member from an organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    // Check if user is owner
    const { data: member } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (member?.role === 'owner') {
      // Count owners
      const { count } = await this.supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', 'owner');

      if (count === 1) {
        throw new Error('Cannot remove the last owner');
      }
    }

    await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);
  }

  /**
   * Updates subscription tier
   */
  async updateSubscription(
    organizationId: string,
    tier: SubscriptionTier
  ): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .update({
        subscription_tier: tier,
        monthly_render_quota: TIER_QUOTAS[tier],
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return data;
  }

  /**
   * Gets all organizations a user belongs to
   */
  async getUserOrganizations(userId: string): Promise<Array<{
    organization: Organization;
    role: string;
  }>> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('organization:organizations(*), role')
      .eq('user_id', userId)
      .not('joined_at', 'is', null);

    if (error) {
      throw new Error(`Failed to get user organizations: ${error.message}`);
    }

    return (data as unknown as Array<{ organization: Organization; role: string }>) || [];
  }

  /**
   * Generates a URL-friendly slug from a name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      // Replace accented characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace special characters and spaces with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Collapse multiple hyphens
      .replace(/-+/g, '-');
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createOrganizationService = (
  supabase: SupabaseClient
): OrganizationService => {
  return new OrganizationService(supabase);
};

