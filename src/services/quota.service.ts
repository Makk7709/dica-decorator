/**
 * @fileoverview Quota Service - Reseller Quota Management
 * 
 * Manages monthly render quotas for organizations (resellers).
 * Enforces tier-based limits and provides usage tracking.
 * 
 * Features:
 * - Quota status checking
 * - Usage tracking and reporting
 * - Tier-based limits (starter/pro/enterprise)
 * - Auto-reset at month start
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from './organization.service';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface QuotaConfig {
  tierLimits: Record<SubscriptionTier, number>;
  warningThreshold: number; // 0-1, e.g., 0.8 for 80%
  criticalThreshold: number; // 0-1, e.g., 0.95 for 95%
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  canRender: boolean;
  isWarning: boolean;
  isCritical: boolean;
  resetDate: Date;
  tier: SubscriptionTier;
}

export interface UsageReport {
  totalRenders: number;
  period: {
    start: Date;
    end: Date;
  };
  byUser: Array<{
    userId: string;
    totalRenders: number;
    lastActivity: Date;
  }>;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class QuotaExhaustedError extends Error {
  public readonly organizationId: string;
  public readonly used: number;
  public readonly resetDate: Date;
  public readonly tier: SubscriptionTier;

  constructor(
    organizationId: string,
    used: number,
    resetDate: Date,
    tier: SubscriptionTier
  ) {
    super(`Monthly quota exhausted (${used}/${used} renders). Resets on ${resetDate.toLocaleDateString()}`);
    this.name = 'QuotaExhaustedError';
    this.organizationId = organizationId;
    this.used = used;
    this.resetDate = resetDate;
    this.tier = tier;
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class QuotaService {
  constructor(
    private supabase: SupabaseClient,
    private config: QuotaConfig
  ) {}

  /**
   * Gets the current quota status for an organization
   */
  async getQuotaStatus(organizationId: string): Promise<QuotaStatus> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('subscription_tier, monthly_render_quota, renders_used_this_month')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get quota status: ${error?.message}`);
    }

    const used = data.renders_used_this_month || 0;
    const limit = data.monthly_render_quota || this.config.tierLimits.starter;
    const remaining = Math.max(0, limit - used);
    const percentUsed = Math.round((used / limit) * 100);

    return {
      used,
      limit,
      remaining,
      percentUsed,
      canRender: used < limit,
      isWarning: (used / limit) >= this.config.warningThreshold,
      isCritical: (used / limit) >= this.config.criticalThreshold,
      resetDate: this.getNextResetDate(),
      tier: data.subscription_tier || 'starter',
    };
  }

  /**
   * Checks if organization can perform render(s)
   * 
   * @param organizationId - Organization ID
   * @param renderCount - Number of renders to check (default 1)
   */
  async checkQuota(organizationId: string, renderCount: number = 1): Promise<boolean> {
    const status = await this.getQuotaStatus(organizationId);
    return status.remaining >= renderCount;
  }

  /**
   * Enforces quota, throwing if exhausted
   * 
   * @throws {QuotaExhaustedError} If quota is exhausted
   */
  async enforceQuota(organizationId: string, renderCount: number = 1): Promise<void> {
    const status = await this.getQuotaStatus(organizationId);
    
    if (status.remaining < renderCount) {
      throw new QuotaExhaustedError(
        organizationId,
        status.used,
        status.resetDate,
        status.tier
      );
    }
  }

  /**
   * Increments usage for an organization
   */
  async incrementUsage(
    organizationId: string,
    userId: string,
    count: number = 1
  ): Promise<void> {
    await this.supabase.rpc('increment_organization_usage', {
      org_id: organizationId,
      user_id_param: userId,
      count,
    });
  }

  /**
   * Gets detailed usage report for an organization
   */
  async getUsageReport(organizationId: string): Promise<UsageReport> {
    const startOfMonth = this.getStartOfMonth();
    const now = new Date();

    const { data, error } = await this.supabase
      .from('render_usage')
      .select('user_id, render_count, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get usage report: ${error.message}`);
    }

    // Aggregate by user
    const userMap = new Map<string, { totalRenders: number; lastActivity: Date }>();
    let totalRenders = 0;

    for (const record of data || []) {
      totalRenders += record.render_count;
      
      const existing = userMap.get(record.user_id);
      if (existing) {
        existing.totalRenders += record.render_count;
        if (new Date(record.created_at) > existing.lastActivity) {
          existing.lastActivity = new Date(record.created_at);
        }
      } else {
        userMap.set(record.user_id, {
          totalRenders: record.render_count,
          lastActivity: new Date(record.created_at),
        });
      }
    }

    return {
      totalRenders,
      period: {
        start: startOfMonth,
        end: now,
      },
      byUser: Array.from(userMap.entries()).map(([userId, data]) => ({
        userId,
        ...data,
      })),
    };
  }

  /**
   * Upgrades organization to a new tier
   */
  async upgradeQuota(
    organizationId: string,
    newTier: SubscriptionTier
  ): Promise<{ subscription_tier: SubscriptionTier; monthly_render_quota: number }> {
    const newQuota = this.config.tierLimits[newTier];

    const { data, error } = await this.supabase
      .from('organizations')
      .update({
        subscription_tier: newTier,
        monthly_render_quota: newQuota,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select('subscription_tier, monthly_render_quota')
      .single();

    if (error || !data) {
      throw new Error(`Failed to upgrade quota: ${error?.message}`);
    }

    return data;
  }

  /**
   * Gets the date when quota will reset (first day of next month)
   */
  getNextResetDate(): Date {
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    
    if (month > 11) {
      month = 0;
      year += 1;
    }
    
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }

  /**
   * Gets the start of the current month
   */
  private getStartOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0, 0, 0, 0
    ));
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createQuotaService = (
  supabase: SupabaseClient,
  config?: Partial<QuotaConfig>
): QuotaService => {
  const defaultConfig: QuotaConfig = {
    tierLimits: {
      starter: 100,
      pro: 500,
      enterprise: 2000,
    },
    warningThreshold: 0.8,
    criticalThreshold: 0.95,
  };

  return new QuotaService(supabase, { ...defaultConfig, ...config });
};

