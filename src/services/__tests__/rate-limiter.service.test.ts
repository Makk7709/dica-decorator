/**
 * @fileoverview TDD Tests for Rate Limiter Service
 * 
 * Phase 1.2: Rate limiting for Edge Functions
 * 
 * Requirements:
 * - Track render count per user per day
 * - Track render count per organization per month
 * - Enforce daily limit for individual users (50 renders/day)
 * - Enforce monthly limit for organizations (based on subscription tier)
 * - Return clear error messages with remaining quota
 * - Support quota reset at midnight UTC (daily) and month start (monthly)
 * - Provide check-before-execute pattern
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RateLimiterService,
  RateLimitExceededError,
  QuotaExceededError,
  type RateLimitConfig,
  type RateLimitCheckResult,
  type UsageRecord,
} from '../rate-limiter.service';
import { createMockSupabaseClient } from '@/test/test-utils';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const defaultConfig: RateLimitConfig = {
    dailyUserLimit: 50,
    monthlyOrganizationLimits: {
      starter: 100,
      pro: 500,
      enterprise: 2000,
    },
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new RateLimiterService(mockSupabase as any, defaultConfig);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('checkUserDailyLimit', () => {
    const userId = 'user-123-uuid';

    it('should allow render when user is under daily limit', async () => {
      // Arrange - Mock the Supabase count query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: new Array(10).fill({}), // 10 renders
          error: null,
          count: 10,
        }),
      });
      mockSupabase.from = mockFrom;

      // Act
      const result = await service.checkUserDailyLimit(userId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(10);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(40);
    });

    it('should deny render when user has reached daily limit', async () => {
      // Arrange - Mock 50 renders (at limit)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: new Array(50).fill({}),
          error: null,
          count: 50,
        }),
      });
      mockSupabase.from = mockFrom;

      // Act
      const result = await service.checkUserDailyLimit(userId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(50);
      expect(result.remaining).toBe(0);
      expect(result.resetAt).toBeDefined();
    });

    it('should deny render when user has exceeded daily limit', async () => {
      // Arrange - Mock 55 renders (over limit)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: new Array(55).fill({}),
          error: null,
          count: 55,
        }),
      });
      mockSupabase.from = mockFrom;

      // Act
      const result = await service.checkUserDailyLimit(userId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should include reset time at next midnight UTC', async () => {
      // Arrange - Current time is 2024-01-15T10:30:00Z
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { count: 50 },
        error: null,
      });

      // Act
      const result = await service.checkUserDailyLimit(userId);

      // Assert
      expect(result.resetAt).toEqual(new Date('2024-01-16T00:00:00Z'));
    });

    it('should count renders from start of current day UTC', async () => {
      // Arrange
      let capturedGteDate: string | undefined;
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockImplementation((column: string, value: string) => {
        if (column === 'created_at') {
          capturedGteDate = value;
        }
        return mockSupabase.from();
      });
      mockSupabase.from().single.mockResolvedValue({
        data: { count: 10 },
        error: null,
      });

      // Act
      await service.checkUserDailyLimit(userId);

      // Assert
      expect(capturedGteDate).toBe('2024-01-15T00:00:00.000Z');
    });

    it('should return 0 usage for new users', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      });

      // Act
      const result = await service.checkUserDailyLimit(userId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(0);
      expect(result.remaining).toBe(50);
    });
  });

  describe('checkOrganizationMonthlyLimit', () => {
    const organizationId = 'org-123-uuid';

    it('should allow render when organization is under monthly limit', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { subscription_tier: 'pro', monthly_render_quota: 500 },
        error: null,
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { total_renders: 100 },
        error: null,
      });

      // Act
      const result = await service.checkOrganizationMonthlyLimit(organizationId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(100);
      expect(result.limit).toBe(500);
      expect(result.remaining).toBe(400);
    });

    it('should deny render when organization has reached monthly limit', async () => {
      // Arrange
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { subscription_tier: 'starter', monthly_render_quota: 100 },
        error: null,
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { total_renders: 100 },
        error: null,
      });

      // Act
      const result = await service.checkOrganizationMonthlyLimit(organizationId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use tier-specific limit from config', async () => {
      // Arrange - Enterprise tier with 2000 renders
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { subscription_tier: 'enterprise', monthly_render_quota: 2000 },
        error: null,
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { total_renders: 1500 },
        error: null,
      });

      // Act
      const result = await service.checkOrganizationMonthlyLimit(organizationId);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(2000);
      expect(result.remaining).toBe(500);
    });

    it('should include reset time at start of next month UTC', async () => {
      // Arrange - Current time is 2024-01-15
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { subscription_tier: 'pro', monthly_render_quota: 500 },
        error: null,
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { total_renders: 500 },
        error: null,
      });

      // Act
      const result = await service.checkOrganizationMonthlyLimit(organizationId);

      // Assert
      expect(result.resetAt).toEqual(new Date('2024-02-01T00:00:00Z'));
    });

    it('should count renders from start of current month UTC', async () => {
      // Arrange
      let capturedGteDate: string | undefined;
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { subscription_tier: 'pro', monthly_render_quota: 500 },
        error: null,
      });
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().gte.mockImplementation((column: string, value: string) => {
        if (column === 'created_at') {
          capturedGteDate = value;
        }
        return mockSupabase.from();
      });
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { total_renders: 100 },
        error: null,
      });

      // Act
      await service.checkOrganizationMonthlyLimit(organizationId);

      // Assert
      expect(capturedGteDate).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('checkRateLimits', () => {
    const userId = 'user-123-uuid';
    const organizationId = 'org-123-uuid';

    it('should check both user and organization limits', async () => {
      // Arrange
      const checkUserSpy = vi.spyOn(service, 'checkUserDailyLimit').mockResolvedValue({
        allowed: true,
        currentUsage: 10,
        limit: 50,
        remaining: 40,
        resetAt: new Date('2024-01-16T00:00:00Z'),
      });

      const checkOrgSpy = vi.spyOn(service, 'checkOrganizationMonthlyLimit').mockResolvedValue({
        allowed: true,
        currentUsage: 100,
        limit: 500,
        remaining: 400,
        resetAt: new Date('2024-02-01T00:00:00Z'),
      });

      // Act
      const result = await service.checkRateLimits(userId, organizationId);

      // Assert
      expect(checkUserSpy).toHaveBeenCalledWith(userId);
      expect(checkOrgSpy).toHaveBeenCalledWith(organizationId);
      expect(result.allowed).toBe(true);
    });

    it('should deny if user limit is exceeded even if org limit is ok', async () => {
      // Arrange
      vi.spyOn(service, 'checkUserDailyLimit').mockResolvedValue({
        allowed: false,
        currentUsage: 50,
        limit: 50,
        remaining: 0,
        resetAt: new Date('2024-01-16T00:00:00Z'),
      });

      vi.spyOn(service, 'checkOrganizationMonthlyLimit').mockResolvedValue({
        allowed: true,
        currentUsage: 100,
        limit: 500,
        remaining: 400,
        resetAt: new Date('2024-02-01T00:00:00Z'),
      });

      // Act
      const result = await service.checkRateLimits(userId, organizationId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('daily');
    });

    it('should deny if org limit is exceeded even if user limit is ok', async () => {
      // Arrange
      vi.spyOn(service, 'checkUserDailyLimit').mockResolvedValue({
        allowed: true,
        currentUsage: 10,
        limit: 50,
        remaining: 40,
        resetAt: new Date('2024-01-16T00:00:00Z'),
      });

      vi.spyOn(service, 'checkOrganizationMonthlyLimit').mockResolvedValue({
        allowed: false,
        currentUsage: 500,
        limit: 500,
        remaining: 0,
        resetAt: new Date('2024-02-01T00:00:00Z'),
      });

      // Act
      const result = await service.checkRateLimits(userId, organizationId);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('monthly');
    });

    it('should work with user-only check when no organization', async () => {
      // Arrange
      vi.spyOn(service, 'checkUserDailyLimit').mockResolvedValue({
        allowed: true,
        currentUsage: 10,
        limit: 50,
        remaining: 40,
        resetAt: new Date('2024-01-16T00:00:00Z'),
      });

      // Act
      const result = await service.checkRateLimits(userId);

      // Assert
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordUsage', () => {
    const userId = 'user-123-uuid';
    const organizationId = 'org-123-uuid';

    it('should increment user render count', async () => {
      // Arrange
      mockSupabase.from().insert.mockReturnThis();
      mockSupabase.from().select.mockResolvedValue({
        data: [{ id: 'usage-1', render_count: 1 }],
        error: null,
      });

      // Act
      await service.recordUsage(userId, organizationId, 1);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('render_usage');
    });

    it('should record multiple renders in single call', async () => {
      // Arrange
      let capturedRenderCount: number | undefined;
      mockSupabase.from().insert.mockImplementation((data: any) => {
        capturedRenderCount = data.render_count;
        return mockSupabase.from();
      });
      mockSupabase.from().select.mockResolvedValue({
        data: [{ id: 'usage-1', render_count: 4 }],
        error: null,
      });

      // Act
      await service.recordUsage(userId, organizationId, 4);

      // Assert
      expect(capturedRenderCount).toBe(4);
    });
  });

  describe('enforceRateLimits', () => {
    const userId = 'user-123-uuid';
    const organizationId = 'org-123-uuid';

    it('should throw RateLimitExceededError when user limit exceeded', async () => {
      // Arrange
      vi.spyOn(service, 'checkRateLimits').mockResolvedValue({
        allowed: false,
        reason: 'Daily limit exceeded',
        userLimit: {
          allowed: false,
          currentUsage: 50,
          limit: 50,
          remaining: 0,
          resetAt: new Date('2024-01-16T00:00:00Z'),
        },
      });

      // Act & Assert
      await expect(service.enforceRateLimits(userId, organizationId))
        .rejects
        .toThrow(RateLimitExceededError);
    });

    it('should throw QuotaExceededError when org limit exceeded', async () => {
      // Arrange
      vi.spyOn(service, 'checkRateLimits').mockResolvedValue({
        allowed: false,
        reason: 'Monthly organization quota exceeded',
        organizationLimit: {
          allowed: false,
          currentUsage: 500,
          limit: 500,
          remaining: 0,
          resetAt: new Date('2024-02-01T00:00:00Z'),
        },
      });

      // Act & Assert
      await expect(service.enforceRateLimits(userId, organizationId))
        .rejects
        .toThrow(QuotaExceededError);
    });

    it('should not throw when limits are ok', async () => {
      // Arrange
      vi.spyOn(service, 'checkRateLimits').mockResolvedValue({
        allowed: true,
        userLimit: {
          allowed: true,
          currentUsage: 10,
          limit: 50,
          remaining: 40,
          resetAt: new Date('2024-01-16T00:00:00Z'),
        },
      });

      // Act & Assert
      await expect(service.enforceRateLimits(userId, organizationId))
        .resolves
        .not.toThrow();
    });

    it('should include remaining quota in error message', async () => {
      // Arrange
      vi.spyOn(service, 'checkRateLimits').mockResolvedValue({
        allowed: false,
        reason: 'Daily limit exceeded',
        userLimit: {
          allowed: false,
          currentUsage: 50,
          limit: 50,
          remaining: 0,
          resetAt: new Date('2024-01-16T00:00:00Z'),
        },
      });

      // Act & Assert
      await expect(service.enforceRateLimits(userId, organizationId))
        .rejects
        .toThrow(/50\/50/);
    });
  });

  describe('getStartOfDay', () => {
    it('should return midnight UTC of current day', () => {
      // Arrange - Current time is 2024-01-15T10:30:00Z
      
      // Act
      const result = service.getStartOfDay();

      // Assert
      expect(result).toEqual(new Date('2024-01-15T00:00:00Z'));
    });

    it('should handle timezone edge cases correctly', () => {
      // Arrange - Set to just before midnight UTC
      vi.setSystemTime(new Date('2024-01-15T23:59:59Z'));

      // Act
      const result = service.getStartOfDay();

      // Assert
      expect(result).toEqual(new Date('2024-01-15T00:00:00Z'));
    });
  });

  describe('getStartOfMonth', () => {
    it('should return first day of current month at midnight UTC', () => {
      // Arrange - Current time is 2024-01-15T10:30:00Z

      // Act
      const result = service.getStartOfMonth();

      // Assert
      expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('should handle last day of month correctly', () => {
      // Arrange
      vi.setSystemTime(new Date('2024-01-31T23:59:59Z'));

      // Act
      const result = service.getStartOfMonth();

      // Assert
      expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
    });
  });

  describe('getNextMidnight', () => {
    it('should return next midnight UTC', () => {
      // Arrange - Current time is 2024-01-15T10:30:00Z

      // Act
      const result = service.getNextMidnight();

      // Assert
      expect(result).toEqual(new Date('2024-01-16T00:00:00Z'));
    });
  });

  describe('getStartOfNextMonth', () => {
    it('should return first day of next month at midnight UTC', () => {
      // Arrange - Current time is 2024-01-15T10:30:00Z

      // Act
      const result = service.getStartOfNextMonth();

      // Assert
      expect(result).toEqual(new Date('2024-02-01T00:00:00Z'));
    });

    it('should handle December to January transition', () => {
      // Arrange
      vi.setSystemTime(new Date('2024-12-15T10:30:00Z'));

      // Act
      const result = service.getStartOfNextMonth();

      // Assert
      expect(result).toEqual(new Date('2025-01-01T00:00:00Z'));
    });
  });
});

describe('RateLimiterService - Error Classes', () => {
  describe('RateLimitExceededError', () => {
    it('should include usage details in error', () => {
      // Act
      const error = new RateLimitExceededError(
        'Daily limit exceeded (50/50)',
        50,
        50,
        new Date('2024-01-16T00:00:00Z')
      );

      // Assert
      expect(error.message).toBe('Daily limit exceeded (50/50)');
      expect(error.currentUsage).toBe(50);
      expect(error.limit).toBe(50);
      expect(error.resetAt).toEqual(new Date('2024-01-16T00:00:00Z'));
      expect(error.name).toBe('RateLimitExceededError');
    });
  });

  describe('QuotaExceededError', () => {
    it('should include organization quota details', () => {
      // Act
      const error = new QuotaExceededError(
        'Monthly quota exceeded (500/500)',
        500,
        500,
        new Date('2024-02-01T00:00:00Z'),
        'pro'
      );

      // Assert
      expect(error.message).toBe('Monthly quota exceeded (500/500)');
      expect(error.tier).toBe('pro');
      expect(error.name).toBe('QuotaExceededError');
    });
  });
});

