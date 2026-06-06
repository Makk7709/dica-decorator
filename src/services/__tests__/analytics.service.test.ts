/**
 * @fileoverview Tests TDD pour AnalyticsService
 * Service d'analytics et statistiques pour le dashboard admin
 * 
 * Fonctionnalités testées:
 * - Métriques globales
 * - Statistiques par période
 * - Top décors et utilisateurs
 * - Tendances et graphiques
 * - Rapports exportables
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {AnalyticsService, TopItem, UsageByPeriod, AnalyticsError} from '../analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    it('should create service with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.defaultPeriod).toBe('30d');
      expect(config.cacheDuration).toBe(300); // 5 minutes
      expect(config.maxDataPoints).toBe(100);
      expect(config.enableCaching).toBe(true);
    });

    it('should allow custom configuration', () => {
      service.configure({
        defaultPeriod: '7d',
        cacheDuration: 600,
        maxDataPoints: 50,
      });
      
      const config = service.getConfig();
      expect(config.defaultPeriod).toBe('7d');
      expect(config.cacheDuration).toBe(600);
    });

    it('should validate cache duration', () => {
      expect(() => service.configure({ cacheDuration: -1 }))
        .toThrow(AnalyticsError);
    });

    it('should validate max data points', () => {
      expect(() => service.configure({ maxDataPoints: 0 }))
        .toThrow(AnalyticsError);
    });
  });

  // ============================================================================
  // Date Range Tests
  // ============================================================================
  describe('Date Range', () => {
    it('should calculate date range for 7d', () => {
      const range = service.getDateRange('7d');
      
      const expectedStart = new Date();
      expectedStart.setDate(expectedStart.getDate() - 7);
      
      expect(range.start.toDateString()).toBe(expectedStart.toDateString());
      expect(range.end.toDateString()).toBe(new Date().toDateString());
    });

    it('should calculate date range for 30d', () => {
      const range = service.getDateRange('30d');
      
      const expectedStart = new Date();
      expectedStart.setDate(expectedStart.getDate() - 30);
      
      expect(range.start.toDateString()).toBe(expectedStart.toDateString());
    });

    it('should calculate date range for current month', () => {
      const range = service.getDateRange('month');
      
      const now = new Date();
      expect(range.start.getMonth()).toBe(now.getMonth());
      expect(range.start.getDate()).toBe(1);
    });

    it('should calculate date range for current year', () => {
      const range = service.getDateRange('year');
      
      const now = new Date();
      expect(range.start.getFullYear()).toBe(now.getFullYear());
      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
    });

    it('should support custom date range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      
      const range = service.getDateRange('custom', { start, end });
      
      expect(range.start).toEqual(start);
      expect(range.end).toEqual(end);
    });

    it('should validate custom date range', () => {
      const start = new Date('2024-02-01');
      const end = new Date('2024-01-01');
      
      expect(() => service.getDateRange('custom', { start, end }))
        .toThrow(AnalyticsError);
    });
  });

  // ============================================================================
  // Global Metrics Tests
  // ============================================================================
  describe('Global Metrics', () => {
    it('should calculate global metrics', () => {
      const mockData = {
        totalProjects: 150,
        totalRenders: 2500,
        totalUsers: 45,
        activeUsers: 32,
        totalDecors: 89,
      };
      
      service.setMockData(mockData);
      const metrics = service.getGlobalMetrics();
      
      expect(metrics.totalProjects).toBe(150);
      expect(metrics.totalRenders).toBe(2500);
      expect(metrics.totalUsers).toBe(45);
      expect(metrics.activeUsers).toBe(32);
    });

    it('should calculate average renders per project', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 10,
        activeUsers: 5,
        totalDecors: 50,
      });
      
      const metrics = service.getGlobalMetrics();
      
      expect(metrics.avgRendersPerProject).toBe(5);
    });

    it('should handle zero projects', () => {
      service.setMockData({
        totalProjects: 0,
        totalRenders: 0,
        totalUsers: 10,
        activeUsers: 0,
        totalDecors: 50,
      });
      
      const metrics = service.getGlobalMetrics();
      
      expect(metrics.avgRendersPerProject).toBe(0);
    });

    it('should calculate user engagement rate', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 100,
        activeUsers: 75,
        totalDecors: 50,
      });
      
      const metrics = service.getGlobalMetrics();
      
      expect(metrics.engagementRate).toBe(75); // 75%
    });
  });

  // ============================================================================
  // Trend Data Tests
  // ============================================================================
  describe('Trend Data', () => {
    it('should calculate renders trend', () => {
      const mockTrend = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 12 },
      ];
      
      service.setMockTrend('renders', mockTrend);
      const trend = service.getTrend('renders', '7d');
      
      expect(trend.data).toHaveLength(3);
      expect(trend.data[0].value).toBe(10);
    });

    it('should calculate trend direction', () => {
      const increasingTrend = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 20 },
      ];
      
      service.setMockTrend('renders', increasingTrend);
      const trend = service.getTrend('renders', '7d');
      
      expect(trend.direction).toBe('up');
      expect(trend.percentageChange).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', () => {
      const decreasingTrend = [
        { date: '2024-01-01', value: 20 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 10 },
      ];
      
      service.setMockTrend('projects', decreasingTrend);
      const trend = service.getTrend('projects', '7d');
      
      expect(trend.direction).toBe('down');
      expect(trend.percentageChange).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const stableTrend = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 10 },
        { date: '2024-01-03', value: 10 },
      ];
      
      service.setMockTrend('users', stableTrend);
      const trend = service.getTrend('users', '7d');
      
      expect(trend.direction).toBe('stable');
    });

    it('should calculate percentage change', () => {
      const trend = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
      ];
      
      service.setMockTrend('renders', trend);
      const result = service.getTrend('renders', '7d');
      
      expect(result.percentageChange).toBe(50); // 50% increase
    });
  });

  // ============================================================================
  // Top Items Tests
  // ============================================================================
  describe('Top Items', () => {
    it('should get top decors', () => {
      const mockDecors: TopItem[] = [
        { id: '1', name: 'Inox Brossé', value: 250, code: '3020BN' },
        { id: '2', name: 'Marbre Blanc', value: 180, code: 'MB-001' },
        { id: '3', name: 'Chêne Naturel', value: 120, code: 'CN-001' },
      ];
      
      service.setMockTopItems('decors', mockDecors);
      const topDecors = service.getTopItems('decors', 3);
      
      expect(topDecors).toHaveLength(3);
      expect(topDecors[0].name).toBe('Inox Brossé');
      expect(topDecors[0].value).toBe(250);
    });

    it('should get top users', () => {
      const mockUsers: TopItem[] = [
        { id: 'u1', name: 'Jean Dupont', value: 45, email: 'jean@example.com' },
        { id: 'u2', name: 'Marie Martin', value: 38, email: 'marie@example.com' },
      ];
      
      service.setMockTopItems('users', mockUsers);
      const topUsers = service.getTopItems('users', 5);
      
      expect(topUsers).toHaveLength(2);
      expect(topUsers[0].value).toBeGreaterThanOrEqual(topUsers[1].value);
    });

    it('should get top projects', () => {
      const mockProjects: TopItem[] = [
        { id: 'p1', name: 'Ascenseur Haussmann', value: 25 },
        { id: 'p2', name: 'Van Aménagé', value: 18 },
      ];
      
      service.setMockTopItems('projects', mockProjects);
      const topProjects = service.getTopItems('projects', 10);
      
      expect(topProjects).toHaveLength(2);
    });

    it('should limit results', () => {
      const mockDecors: TopItem[] = new Array(20).fill(null).map((_, i) => ({
        id: `d${i}`,
        name: `Decor ${i}`,
        value: 100 - i,
      }));
      
      service.setMockTopItems('decors', mockDecors);
      const topDecors = service.getTopItems('decors', 5);
      
      expect(topDecors).toHaveLength(5);
    });

    it('should sort by value descending', () => {
      const mockDecors: TopItem[] = [
        { id: '1', name: 'A', value: 50 },
        { id: '2', name: 'B', value: 100 },
        { id: '3', name: 'C', value: 75 },
      ];
      
      service.setMockTopItems('decors', mockDecors);
      const topDecors = service.getTopItems('decors', 10);
      
      expect(topDecors[0].value).toBe(100);
      expect(topDecors[1].value).toBe(75);
      expect(topDecors[2].value).toBe(50);
    });
  });

  // ============================================================================
  // Usage by Period Tests
  // ============================================================================
  describe('Usage by Period', () => {
    it('should get daily usage', () => {
      const mockUsage: UsageByPeriod[] = [
        { period: '2024-01-01', renders: 10, projects: 2, users: 5 },
        { period: '2024-01-02', renders: 15, projects: 3, users: 6 },
      ];
      
      service.setMockUsage(mockUsage);
      const usage = service.getUsageByPeriod('daily', '7d');
      
      expect(usage).toHaveLength(2);
      expect(usage[0].renders).toBe(10);
    });

    it('should get weekly usage', () => {
      const mockUsage: UsageByPeriod[] = [
        { period: 'Week 1', renders: 70, projects: 14, users: 20 },
        { period: 'Week 2', renders: 85, projects: 17, users: 22 },
      ];
      
      service.setMockUsage(mockUsage);
      const usage = service.getUsageByPeriod('weekly', '30d');
      
      expect(usage).toHaveLength(2);
    });

    it('should get monthly usage', () => {
      const mockUsage: UsageByPeriod[] = [
        { period: 'Janvier', renders: 300, projects: 60, users: 45 },
        { period: 'Février', renders: 350, projects: 70, users: 48 },
      ];
      
      service.setMockUsage(mockUsage);
      const usage = service.getUsageByPeriod('monthly', 'year');
      
      expect(usage).toHaveLength(2);
    });

    it('should calculate totals', () => {
      const mockUsage: UsageByPeriod[] = [
        { period: 'Day 1', renders: 10, projects: 2, users: 5 },
        { period: 'Day 2', renders: 15, projects: 3, users: 6 },
        { period: 'Day 3', renders: 20, projects: 4, users: 7 },
      ];
      
      service.setMockUsage(mockUsage);
      const totals = service.getUsageTotals('7d');
      
      expect(totals.totalRenders).toBe(45);
      expect(totals.totalProjects).toBe(9);
    });
  });

  // ============================================================================
  // Chart Data Tests
  // ============================================================================
  describe('Chart Data', () => {
    it('should generate line chart data', () => {
      const mockTrend = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 12 },
      ];
      
      service.setMockTrend('renders', mockTrend);
      const chartData = service.getChartData('line', 'renders', '7d');
      
      expect(chartData.type).toBe('line');
      expect(chartData.labels).toHaveLength(3);
      expect(chartData.datasets[0].data).toHaveLength(3);
    });

    it('should generate bar chart data', () => {
      const mockDecors: TopItem[] = [
        { id: '1', name: 'Inox', value: 100 },
        { id: '2', name: 'Marbre', value: 80 },
      ];
      
      service.setMockTopItems('decors', mockDecors);
      const chartData = service.getChartData('bar', 'topDecors', '30d');
      
      expect(chartData.type).toBe('bar');
      expect(chartData.labels).toContain('Inox');
    });

    it('should generate pie chart data', () => {
      const mockDecors: TopItem[] = [
        { id: '1', name: 'Métal', value: 40 },
        { id: '2', name: 'Bois', value: 30 },
        { id: '3', name: 'Marbre', value: 20 },
        { id: '4', name: 'Autre', value: 10 },
      ];
      
      service.setMockTopItems('categories', mockDecors);
      const chartData = service.getChartData('pie', 'categories', '30d');
      
      expect(chartData.type).toBe('pie');
      expect(chartData.datasets[0].data.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should apply color scheme', () => {
      const mockDecors: TopItem[] = [
        { id: '1', name: 'A', value: 50 },
        { id: '2', name: 'B', value: 50 },
      ];
      
      service.setMockTopItems('decors', mockDecors);
      const chartData = service.getChartData('bar', 'topDecors', '30d');
      
      expect(chartData.datasets[0].backgroundColor).toBeDefined();
    });

    it('should limit data points', () => {
      service.configure({ maxDataPoints: 5 });
      
      const mockTrend = new Array(10).fill(null).map((_, i) => ({
        date: `2024-01-${i + 1}`,
        value: i * 10,
      }));
      
      service.setMockTrend('renders', mockTrend);
      const chartData = service.getChartData('line', 'renders', '30d');
      
      expect(chartData.labels.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // Report Generation Tests
  // ============================================================================
  describe('Report Generation', () => {
    it('should generate analytics report', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      const report = service.generateReport('30d');
      
      expect(report.period).toBe('30d');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.metrics).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.topItems).toBeDefined();
    });

    it('should include all metric sections', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      const report = service.generateReport('30d');
      
      expect(report.metrics.totalProjects).toBeDefined();
      expect(report.metrics.totalRenders).toBeDefined();
      expect(report.metrics.totalUsers).toBeDefined();
    });

    it('should include summary text', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      const report = service.generateReport('30d');
      
      expect(report.summary).toBeDefined();
      expect(typeof report.summary).toBe('string');
      expect(report.summary.length).toBeGreaterThan(0);
    });

    it('should format report for export', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      const report = service.generateReport('30d');
      const exportData = service.formatReportForExport(report, 'json');
      
      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
    });

    it('should support CSV export format', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      const report = service.generateReport('30d');
      const csv = service.formatReportForExport(report, 'csv');
      
      expect(csv).toContain(',');
      expect(csv).toContain('\n');
    });
  });

  // ============================================================================
  // Caching Tests
  // ============================================================================
  describe('Caching', () => {
    it('should cache results', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      // First call
      const metrics1 = service.getGlobalMetrics();
      
      // Modify mock data
      service.setMockData({
        totalProjects: 200,
        totalRenders: 1000,
        totalUsers: 100,
        activeUsers: 80,
        totalDecors: 100,
      });
      
      // Second call should return cached data
      const metrics2 = service.getGlobalMetrics();
      
      expect(metrics2.totalProjects).toBe(100); // Cached value
    });

    it('should invalidate cache', () => {
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      service.getGlobalMetrics();
      
      service.setMockData({
        totalProjects: 200,
        totalRenders: 1000,
        totalUsers: 100,
        activeUsers: 80,
        totalDecors: 100,
      });
      
      service.invalidateCache();
      const metrics = service.getGlobalMetrics();
      
      expect(metrics.totalProjects).toBe(200);
    });

    it('should respect cache duration', () => {
      vi.useFakeTimers();
      
      service.configure({ cacheDuration: 60 }); // 60 seconds
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      service.getGlobalMetrics();
      
      service.setMockData({
        totalProjects: 200,
        totalRenders: 1000,
        totalUsers: 100,
        activeUsers: 80,
        totalDecors: 100,
      });
      
      // Advance time past cache duration
      vi.advanceTimersByTime(61000);
      
      const metrics = service.getGlobalMetrics();
      expect(metrics.totalProjects).toBe(200);
      
      vi.useRealTimers();
    });

    it('should disable caching when configured', () => {
      service.configure({ enableCaching: false });
      service.setMockData({
        totalProjects: 100,
        totalRenders: 500,
        totalUsers: 50,
        activeUsers: 40,
        totalDecors: 89,
      });
      
      service.getGlobalMetrics();
      
      service.setMockData({
        totalProjects: 200,
        totalRenders: 1000,
        totalUsers: 100,
        activeUsers: 80,
        totalDecors: 100,
      });
      
      const metrics = service.getGlobalMetrics();
      expect(metrics.totalProjects).toBe(200);
    });
  });

  // ============================================================================
  // Comparison Tests
  // ============================================================================
  describe('Period Comparison', () => {
    it('should compare metrics between periods', () => {
      service.setMockComparison({
        current: { renders: 100, projects: 20, users: 50 },
        previous: { renders: 80, projects: 15, users: 45 },
      });
      
      const comparison = service.comparePerids('30d', 'previous30d');
      
      expect(comparison.renders.current).toBe(100);
      expect(comparison.renders.previous).toBe(80);
      expect(comparison.renders.change).toBe(25); // 25% increase
      expect(comparison.renders.direction).toBe('up');
    });

    it('should detect decrease in comparison', () => {
      service.setMockComparison({
        current: { renders: 50, projects: 10, users: 30 },
        previous: { renders: 100, projects: 20, users: 50 },
      });
      
      const comparison = service.comparePerids('30d', 'previous30d');
      
      expect(comparison.renders.change).toBe(-50); // 50% decrease
      expect(comparison.renders.direction).toBe('down');
    });

    it('should handle zero previous value', () => {
      service.setMockComparison({
        current: { renders: 100, projects: 20, users: 50 },
        previous: { renders: 0, projects: 0, users: 0 },
      });
      
      const comparison = service.comparePerids('30d', 'previous30d');
      
      expect(comparison.renders.change).toBe(100); // 100% (new)
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw AnalyticsError with code', () => {
      expect(() => service.configure({ maxDataPoints: -1 }))
        .toThrow(AnalyticsError);
    });

    it('should handle invalid metric type', () => {
      expect(() => service.getTrend('invalid' as never, '7d'))
        .toThrow(AnalyticsError);
    });

    it('should emit error events', () => {
      const errorCallback = vi.fn();
      service.onError(errorCallback);
      
      service.emitError(new AnalyticsError('Test', 'TEST_ERROR'));
      
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should complete full analytics workflow', () => {
      // Setup data
      service.setMockData({
        totalProjects: 150,
        totalRenders: 2500,
        totalUsers: 45,
        activeUsers: 32,
        totalDecors: 89,
      });
      
      const mockDecors: TopItem[] = [
        { id: '1', name: 'Inox Brossé', value: 250 },
        { id: '2', name: 'Marbre', value: 180 },
      ];
      service.setMockTopItems('decors', mockDecors);
      
      // 1. Get global metrics
      const metrics = service.getGlobalMetrics();
      expect(metrics.totalProjects).toBe(150);
      
      // 2. Get top decors
      const topDecors = service.getTopItems('decors', 5);
      expect(topDecors[0].name).toBe('Inox Brossé');
      
      // 3. Generate report
      const report = service.generateReport('30d');
      expect(report.metrics).toBeDefined();
      
      // 4. Export report
      const json = service.formatReportForExport(report, 'json');
      expect(json).toContain('150');
    });
  });
});

