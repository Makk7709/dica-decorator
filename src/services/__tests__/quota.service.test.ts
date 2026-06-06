/**
 * @fileoverview TDD Tests for Quota Service
 * 
 * Phase 2.1: Reseller Quota System
 * 
 * Requirements:
 * - Track monthly render usage per organization
 * - Enforce tier-based quotas (starter: 100, pro: 500, enterprise: 2000)
 * - Auto-reset quotas at start of each month
 * - Provide usage reports and alerts
 * - Support quota overrides for special cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QuotaService,
  QuotaExhaustedError,
  type QuotaStatus,
  type UsageReport,
  type QuotaConfig,
} from '../quota.service';
import { createMockSupabaseClient } from '@/test/test-utils';

describe('QuotaService', () => {
  let service: QuotaService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const defaultConfig: QuotaConfig = {
    tierLimits: {
      starter: 100,
      pro: 500,
      enterprise: 2000,
    },
    warningThreshold: 0.8, // 80%
    criticalThreshold: 0.95, // 95%
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new QuotaService(mockSupabase as never, defaultConfig);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getQuotaStatus', () => {
    const organizationId = 'org-123';

    it('should return quota status for organization', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            subscription_tier: 'pro',
            monthly_render_quota: 500,
            renders_used_this_month: 150,
          },
          error: null,
        }),
      });

      // Act
      const status = await service.getQuotaStatus(organizationId);

      // Assert
      expect(status.used).toBe(150);
      expect(status.limit).toBe(500);
      expect(status.remaining).toBe(350);
      expect(status.percentUsed).toBe(30);
      expect(status.canRender).toBe(true);
    });

    it('should indicate warning when usage exceeds 80%', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            subscription_tier: 'starter',
            monthly_render_quota: 100,
            renders_used_this_month: 85,
          },
          error: null,
        }),
      });

      // Act
      const status = await service.getQuotaStatus(organizationId);

      // Assert
      expect(status.isWarning).toBe(true);
      expect(status.isCritical).toBe(false);
    });

    it('should indicate critical when usage exceeds 95%', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            subscription_tier: 'starter',
            monthly_render_quota: 100,
            renders_used_this_month: 98,
          },
          error: null,
        }),
      });

      // Act
      const status = await service.getQuotaStatus(organizationId);

      // Assert
      expect(status.isCritical).toBe(true);
    });

    it('should indicate canRender=false when quota exhausted', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            subscription_tier: 'starter',
            monthly_render_quota: 100,
            renders_used_this_month: 100,
          },
          error: null,
        }),
      });

      // Act
      const status = await service.getQuotaStatus(organizationId);

      // Assert
      expect(status.canRender).toBe(false);
      expect(status.remaining).toBe(0);
    });

    it('should include reset date at start of next month', async () => {
      // Arrange - Current date is 2024-01-15
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            subscription_tier: 'pro',
            monthly_render_quota: 500,
            renders_used_this_month: 200,
          },
          error: null,
        }),
      });

      // Act
      const status = await service.getQuotaStatus(organizationId);

      // Assert
      expect(status.resetDate).toEqual(new Date('2024-02-01T00:00:00Z'));
    });
  });

  describe('checkQuota', () => {
    const organizationId = 'org-123';

    it('should return true when quota available', async () => {
      // Arrange
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 50,
        limit: 100,
        remaining: 50,
        percentUsed: 50,
        canRender: true,
        isWarning: false,
        isCritical: false,
        resetDate: new Date(),
        tier: 'starter',
      });

      // Act
      const canRender = await service.checkQuota(organizationId);

      // Assert
      expect(canRender).toBe(true);
    });

    it('should return false when quota exhausted', async () => {
      // Arrange
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 100,
        limit: 100,
        remaining: 0,
        percentUsed: 100,
        canRender: false,
        isWarning: true,
        isCritical: true,
        resetDate: new Date(),
        tier: 'starter',
      });

      // Act
      const canRender = await service.checkQuota(organizationId);

      // Assert
      expect(canRender).toBe(false);
    });

    it('should check for specific render count', async () => {
      // Arrange
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 95,
        limit: 100,
        remaining: 5,
        percentUsed: 95,
        canRender: true,
        isWarning: true,
        isCritical: true,
        resetDate: new Date(),
        tier: 'starter',
      });

      // Act
      const canRender5 = await service.checkQuota(organizationId, 5);
      const canRender10 = await service.checkQuota(organizationId, 10);

      // Assert
      expect(canRender5).toBe(true);
      expect(canRender10).toBe(false);
    });
  });

  describe('enforceQuota', () => {
    const organizationId = 'org-123';

    it('should not throw when quota available', async () => {
      // Arrange
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 50,
        limit: 100,
        remaining: 50,
        percentUsed: 50,
        canRender: true,
        isWarning: false,
        isCritical: false,
        resetDate: new Date(),
        tier: 'starter',
      });

      // Act & Assert
      await expect(service.enforceQuota(organizationId))
        .resolves.not.toThrow();
    });

    it('should throw QuotaExhaustedError when quota exhausted', async () => {
      // Arrange
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 100,
        limit: 100,
        remaining: 0,
        percentUsed: 100,
        canRender: false,
        isWarning: true,
        isCritical: true,
        resetDate: new Date('2024-02-01T00:00:00Z'),
        tier: 'starter',
      });

      // Act & Assert
      await expect(service.enforceQuota(organizationId))
        .rejects.toThrow(QuotaExhaustedError);
    });

    it('should include reset date in error', async () => {
      // Arrange
      const resetDate = new Date('2024-02-01T00:00:00Z');
      vi.spyOn(service, 'getQuotaStatus').mockResolvedValue({
        used: 100,
        limit: 100,
        remaining: 0,
        percentUsed: 100,
        canRender: false,
        isWarning: true,
        isCritical: true,
        resetDate,
        tier: 'starter',
      });

      // Act & Assert
      try {
        await service.enforceQuota(organizationId);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(QuotaExhaustedError);
        expect((error as QuotaExhaustedError).resetDate).toEqual(resetDate);
      }
    });
  });

  describe('incrementUsage', () => {
    const organizationId = 'org-123';
    const userId = 'user-456';

    it('should increment organization usage count', async () => {
      // Arrange
      const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.rpc = rpcMock;

      // Act
      await service.incrementUsage(organizationId, userId, 1);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith('increment_organization_usage', {
        org_id: organizationId,
        user_id_param: userId,
        count: 1,
      });
    });

    it('should support incrementing by multiple renders', async () => {
      // Arrange
      const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.rpc = rpcMock;

      // Act
      await service.incrementUsage(organizationId, userId, 4);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith('increment_organization_usage', {
        org_id: organizationId,
        user_id_param: userId,
        count: 4,
      });
    });
  });

  describe('getUsageReport', () => {
    const organizationId = 'org-123';

    it('should return usage report for current month', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { user_id: 'user-1', render_count: 30, created_at: '2024-01-10T10:00:00Z' },
            { user_id: 'user-2', render_count: 20, created_at: '2024-01-12T10:00:00Z' },
            { user_id: 'user-1', render_count: 10, created_at: '2024-01-14T10:00:00Z' },
          ],
          error: null,
        }),
      });

      // Act
      const report = await service.getUsageReport(organizationId);

      // Assert
      expect(report.totalRenders).toBe(60);
      expect(report.byUser).toHaveLength(2);
    });

    it('should aggregate usage by user', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { user_id: 'user-1', render_count: 30, created_at: '2024-01-10T10:00:00Z' },
            { user_id: 'user-1', render_count: 20, created_at: '2024-01-12T10:00:00Z' },
          ],
          error: null,
        }),
      });

      // Act
      const report = await service.getUsageReport(organizationId);

      // Assert
      expect(report.byUser.find(u => u.userId === 'user-1')?.totalRenders).toBe(50);
    });

    it('should include date range in report', async () => {
      // Arrange
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      // Act
      const report = await service.getUsageReport(organizationId);

      // Assert
      expect(report.period.start).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(report.period.end).toBeDefined();
    });
  });

  describe('upgradeQuota', () => {
    const organizationId = 'org-123';

    it('should update organization to new tier', async () => {
      // Arrange
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: organizationId,
          subscription_tier: 'pro',
          monthly_render_quota: 500,
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
        single: singleMock,
      });

      // Act
      const result = await service.upgradeQuota(organizationId, 'pro');

      // Assert
      expect(result.subscription_tier).toBe('pro');
      expect(result.monthly_render_quota).toBe(500);
    });

    it('should set correct quota for each tier', async () => {
      // Test each tier
      const tiers = [
        { tier: 'starter', expectedQuota: 100 },
        { tier: 'pro', expectedQuota: 500 },
        { tier: 'enterprise', expectedQuota: 2000 },
      ] as const;

      for (const { tier, expectedQuota } of tiers) {
        let capturedQuota: number | undefined;
        mockSupabase.from = vi.fn().mockReturnValue({
          update: vi.fn().mockImplementation((data: unknown) => {
            capturedQuota = data.monthly_render_quota;
            return mockSupabase.from();
          }),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { subscription_tier: tier, monthly_render_quota: expectedQuota },
            error: null,
          }),
        });

        await service.upgradeQuota(organizationId, tier);
        expect(capturedQuota).toBe(expectedQuota);
      }
    });
  });

  describe('getNextResetDate', () => {
    it('should return first day of next month', () => {
      // Current date is 2024-01-15
      const resetDate = service.getNextResetDate();
      expect(resetDate).toEqual(new Date('2024-02-01T00:00:00Z'));
    });

    it('should handle year transition', () => {
      vi.setSystemTime(new Date('2024-12-15T10:00:00Z'));
      const resetDate = service.getNextResetDate();
      expect(resetDate).toEqual(new Date('2025-01-01T00:00:00Z'));
    });
  });
});

describe('QuotaService - Error Classes', () => {
  describe('QuotaExhaustedError', () => {
    it('should include organization and reset info', () => {
      const error = new QuotaExhaustedError(
        'org-123',
        100,
        new Date('2024-02-01T00:00:00Z'),
        'starter'
      );

      expect(error.name).toBe('QuotaExhaustedError');
      expect(error.organizationId).toBe('org-123');
      expect(error.used).toBe(100);
      expect(error.tier).toBe('starter');
      expect(error.resetDate).toEqual(new Date('2024-02-01T00:00:00Z'));
    });
  });
});

