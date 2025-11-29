/**
 * @fileoverview Rate Limiter Service
 * 
 * Provides rate limiting and quota management for render operations.
 * Supports both per-user daily limits and per-organization monthly quotas.
 * 
 * Features:
 * - Daily user limits (resets at midnight UTC)
 * - Monthly organization quotas (resets on 1st of month UTC)
 * - Tier-based quota limits (starter, pro, enterprise)
 * - Pre-check pattern for graceful limit handling
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RateLimitConfig {
  dailyUserLimit: number;
  monthlyOrganizationLimits: {
    starter: number;
    pro: number;
    enterprise: number;
    [key: string]: number;
  };
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface CombinedRateLimitResult {
  allowed: boolean;
  reason?: string;
  userLimit?: RateLimitCheckResult;
  organizationLimit?: RateLimitCheckResult;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  organization_id?: string;
  render_count: number;
  created_at: string;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class RateLimitExceededError extends Error {
  public readonly currentUsage: number;
  public readonly limit: number;
  public readonly resetAt: Date;

  constructor(
    message: string,
    currentUsage: number,
    limit: number,
    resetAt: Date
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

export class QuotaExceededError extends Error {
  public readonly currentUsage: number;
  public readonly limit: number;
  public readonly resetAt: Date;
  public readonly tier: string;

  constructor(
    message: string,
    currentUsage: number,
    limit: number,
    resetAt: Date,
    tier: string
  ) {
    super(message);
    this.name = 'QuotaExceededError';
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.resetAt = resetAt;
    this.tier = tier;
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class RateLimiterService {
  constructor(
    private supabase: SupabaseClient,
    private config: RateLimitConfig
  ) {}

  /**
   * Checks if a user is within their daily render limit
   * 
   * @param userId - The user's ID
   * @returns Check result with usage details
   */
  async checkUserDailyLimit(userId: string): Promise<RateLimitCheckResult> {
    const startOfDay = this.getStartOfDay();
    const limit = this.config.dailyUserLimit;

    // Count renders since start of day
    const { data, error, count } = await this.supabase
      .from('render_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());

    // Handle usage counting
    let currentUsage = 0;
    if (!error) {
      // Priority: use count from response, then array length, then 0
      if (typeof count === 'number') {
        currentUsage = count;
      } else if (Array.isArray(data)) {
        currentUsage = data.length;
      }
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      resetAt: this.getNextMidnight(),
    };
  }

  /**
   * Checks if an organization is within their monthly render quota
   * 
   * @param organizationId - The organization's ID
   * @returns Check result with quota details
   */
  async checkOrganizationMonthlyLimit(
    organizationId: string
  ): Promise<RateLimitCheckResult> {
    const startOfMonth = this.getStartOfMonth();

    // Get organization's subscription tier and quota
    const { data: orgData, error: orgError } = await this.supabase
      .from('organizations')
      .select('subscription_tier, monthly_render_quota')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgData) {
      // Default to starter tier if org not found
      return {
        allowed: true,
        currentUsage: 0,
        limit: this.config.monthlyOrganizationLimits.starter,
        remaining: this.config.monthlyOrganizationLimits.starter,
        resetAt: this.getStartOfNextMonth(),
      };
    }

    const tier = orgData.subscription_tier || 'starter';
    const limit = orgData.monthly_render_quota || 
      this.config.monthlyOrganizationLimits[tier] || 
      this.config.monthlyOrganizationLimits.starter;

    // Count renders since start of month
    const { data: usageData, error: usageError } = await this.supabase
      .from('render_usage')
      .select('total_renders')
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString())
      .single();

    let currentUsage = 0;
    if (!usageError && usageData) {
      currentUsage = (usageData as { total_renders: number }).total_renders || 0;
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      resetAt: this.getStartOfNextMonth(),
    };
  }

  /**
   * Checks both user and organization rate limits
   * 
   * @param userId - The user's ID
   * @param organizationId - Optional organization ID
   * @returns Combined check result
   */
  async checkRateLimits(
    userId: string,
    organizationId?: string
  ): Promise<CombinedRateLimitResult> {
    const userLimit = await this.checkUserDailyLimit(userId);
    
    let organizationLimit: RateLimitCheckResult | undefined;
    if (organizationId) {
      organizationLimit = await this.checkOrganizationMonthlyLimit(organizationId);
    }

    // Check if any limit is exceeded
    if (!userLimit.allowed) {
      return {
        allowed: false,
        reason: `Daily limit exceeded (${userLimit.currentUsage}/${userLimit.limit})`,
        userLimit,
        organizationLimit,
      };
    }

    if (organizationLimit && !organizationLimit.allowed) {
      return {
        allowed: false,
        reason: `Monthly organization quota exceeded (${organizationLimit.currentUsage}/${organizationLimit.limit})`,
        userLimit,
        organizationLimit,
      };
    }

    return {
      allowed: true,
      userLimit,
      organizationLimit,
    };
  }

  /**
   * Records a render usage entry
   * 
   * @param userId - The user's ID
   * @param organizationId - The organization's ID
   * @param renderCount - Number of renders to record
   */
  async recordUsage(
    userId: string,
    organizationId: string,
    renderCount: number = 1
  ): Promise<void> {
    await this.supabase
      .from('render_usage')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        render_count: renderCount,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Enforces rate limits, throwing an error if exceeded
   * 
   * @param userId - The user's ID
   * @param organizationId - Optional organization ID
   * @throws {RateLimitExceededError} If user daily limit exceeded
   * @throws {QuotaExceededError} If organization monthly quota exceeded
   */
  async enforceRateLimits(
    userId: string,
    organizationId?: string
  ): Promise<void> {
    const result = await this.checkRateLimits(userId, organizationId);

    if (!result.allowed) {
      if (result.userLimit && !result.userLimit.allowed) {
        throw new RateLimitExceededError(
          `Daily limit exceeded (${result.userLimit.currentUsage}/${result.userLimit.limit})`,
          result.userLimit.currentUsage,
          result.userLimit.limit,
          result.userLimit.resetAt
        );
      }

      if (result.organizationLimit && !result.organizationLimit.allowed) {
        throw new QuotaExceededError(
          `Monthly quota exceeded (${result.organizationLimit.currentUsage}/${result.organizationLimit.limit})`,
          result.organizationLimit.currentUsage,
          result.organizationLimit.limit,
          result.organizationLimit.resetAt,
          'pro' // TODO: Get actual tier from result
        );
      }
    }
  }

  // ============================================================================
  // Date Utilities
  // ============================================================================

  /**
   * Gets the start of the current day (midnight UTC)
   */
  getStartOfDay(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
  }

  /**
   * Gets the start of the current month (first day at midnight UTC)
   */
  getStartOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0, 0, 0, 0
    ));
  }

  /**
   * Gets the next midnight UTC
   */
  getNextMidnight(): Date {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
  }

  /**
   * Gets the start of the next month (first day at midnight UTC)
   */
  getStartOfNextMonth(): Date {
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;
    
    if (month > 11) {
      month = 0;
      year += 1;
    }
    
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createRateLimiterService = (
  supabase: SupabaseClient,
  config?: Partial<RateLimitConfig>
): RateLimiterService => {
  const defaultConfig: RateLimitConfig = {
    dailyUserLimit: 50,
    monthlyOrganizationLimits: {
      starter: 100,
      pro: 500,
      enterprise: 2000,
    },
  };

  return new RateLimiterService(supabase, { ...defaultConfig, ...config });
};

