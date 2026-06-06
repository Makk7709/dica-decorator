/**
 * @fileoverview AnalyticsService - Service d'analytics pour dashboard admin
 * Métriques, tendances et rapports pour DICA Decorator
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'year' | 'custom';
export type MetricType = 'renders' | 'projects' | 'users' | 'decors';
export type ChartType = 'line' | 'bar' | 'pie' | 'area';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ExportFormat = 'json' | 'csv';

export interface AnalyticsConfig {
  defaultPeriod: PeriodPreset;
  cacheDuration: number; // seconds
  maxDataPoints: number;
  enableCaching: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GlobalMetrics {
  totalProjects: number;
  totalRenders: number;
  totalUsers: number;
  activeUsers: number;
  totalDecors: number;
  avgRendersPerProject: number;
  engagementRate: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendData {
  data: TrendDataPoint[];
  direction: TrendDirection;
  percentageChange: number;
}

export interface TopItem {
  id: string;
  name: string;
  value: number;
  code?: string;
  email?: string;
  [key: string]: unknown;
}

export interface UsageByPeriod {
  period: string;
  renders: number;
  projects: number;
  users: number;
}

export interface UsageTotals {
  totalRenders: number;
  totalProjects: number;
  totalUsers: number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
}

export interface ChartData {
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
}

export interface AnalyticsReport {
  period: PeriodPreset;
  generatedAt: Date;
  metrics: GlobalMetrics;
  trends: Record<MetricType, TrendData>;
  topItems: Record<string, TopItem[]>;
  summary: string;
}

export interface ComparisonMetric {
  current: number;
  previous: number;
  change: number;
  direction: TrendDirection;
}

export interface PeriodComparison {
  renders: ComparisonMetric;
  projects: ComparisonMetric;
  users: ComparisonMetric;
}

// ============================================================================
// Error Class
// ============================================================================

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AnalyticsConfig = {
  defaultPeriod: '30d',
  cacheDuration: 300, // 5 minutes
  maxDataPoints: 100,
  enableCaching: true,
};

const DICA_COLORS = [
  '#E94E5D', // Primary red
  '#333333', // Dark
  '#4A90D9', // Blue
  '#50C878', // Green
  '#FFB347', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#F39C12', // Yellow
];

// ============================================================================
// Service Implementation
// ============================================================================

export class AnalyticsService {
  private config: AnalyticsConfig;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private mockData: Record<string, unknown> = {};
  private mockTrends: Map<string, TrendDataPoint[]> = new Map();
  private mockTopItems: Map<string, TopItem[]> = new Map();
  private mockUsage: UsageByPeriod[] = [];
  private mockComparison: unknown = null;
  private errorListeners: Array<(error: AnalyticsError) => void> = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  configure(options: Partial<AnalyticsConfig>): void {
    if (options.cacheDuration !== undefined && options.cacheDuration < 0) {
      throw new AnalyticsError('Cache duration must be non-negative', 'INVALID_CONFIG');
    }
    if (options.maxDataPoints !== undefined && options.maxDataPoints <= 0) {
      throw new AnalyticsError('Max data points must be positive', 'INVALID_CONFIG');
    }
    
    this.config = { ...this.config, ...options };
  }

  // --------------------------------------------------------------------------
  // Mock Data Methods (for testing)
  // --------------------------------------------------------------------------

  setMockData(data: Record<string, unknown>): void {
    this.mockData = data;
  }

  setMockTrend(metric: string, data: TrendDataPoint[]): void {
    this.mockTrends.set(metric, data);
  }

  setMockTopItems(type: string, items: TopItem[]): void {
    this.mockTopItems.set(type, items);
  }

  setMockUsage(usage: UsageByPeriod[]): void {
    this.mockUsage = usage;
  }

  setMockComparison(comparison: unknown): void {
    this.mockComparison = comparison;
  }

  // --------------------------------------------------------------------------
  // Date Range Methods
  // --------------------------------------------------------------------------

  getDateRange(period: PeriodPreset, custom?: { start: Date; end: Date }): DateRange {
    const now = new Date();
    let start: Date;
    const end = new Date(now);

    switch (period) {
      case '7d':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start = new Date(now);
        start.setDate(start.getDate() - 90);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (!custom || !custom.start || !custom.end) {
          throw new AnalyticsError('Custom period requires start and end dates', 'INVALID_PERIOD');
        }
        if (custom.start > custom.end) {
          throw new AnalyticsError('Start date must be before end date', 'INVALID_DATE_RANGE');
        }
        return { start: custom.start, end: custom.end };
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }

  // --------------------------------------------------------------------------
  // Global Metrics Methods
  // --------------------------------------------------------------------------

  getGlobalMetrics(): GlobalMetrics {
    const cacheKey = 'globalMetrics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const data = this.mockData;
    const avgRendersPerProject = data.totalProjects > 0 
      ? data.totalRenders / data.totalProjects 
      : 0;
    const engagementRate = data.totalUsers > 0 
      ? (data.activeUsers / data.totalUsers) * 100 
      : 0;

    const metrics: GlobalMetrics = {
      totalProjects: data.totalProjects || 0,
      totalRenders: data.totalRenders || 0,
      totalUsers: data.totalUsers || 0,
      activeUsers: data.activeUsers || 0,
      totalDecors: data.totalDecors || 0,
      avgRendersPerProject,
      engagementRate,
    };

    this.setCache(cacheKey, metrics);
    return metrics;
  }

  // --------------------------------------------------------------------------
  // Trend Methods
  // --------------------------------------------------------------------------

  getTrend(metric: MetricType, period: PeriodPreset): TrendData {
    const validMetrics: MetricType[] = ['renders', 'projects', 'users', 'decors'];
    if (!validMetrics.includes(metric)) {
      throw new AnalyticsError(`Invalid metric type: ${metric}`, 'INVALID_METRIC');
    }

    const data = this.mockTrends.get(metric) || [];
    
    if (data.length < 2) {
      return { data, direction: 'stable', percentageChange: 0 };
    }

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const percentageChange = firstValue > 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
      : (lastValue > 0 ? 100 : 0);

    let direction: TrendDirection;
    if (percentageChange > 5) {
      direction = 'up';
    } else if (percentageChange < -5) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    return { data, direction, percentageChange };
  }

  // --------------------------------------------------------------------------
  // Top Items Methods
  // --------------------------------------------------------------------------

  getTopItems(type: string, limit: number): TopItem[] {
    const items = this.mockTopItems.get(type) || [];
    const sorted = [...items].sort((a, b) => b.value - a.value);
    return sorted.slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Usage Methods
  // --------------------------------------------------------------------------

  getUsageByPeriod(granularity: 'daily' | 'weekly' | 'monthly', period: PeriodPreset): UsageByPeriod[] {
    return this.mockUsage;
  }

  getUsageTotals(period: PeriodPreset): UsageTotals {
    return {
      totalRenders: this.mockUsage.reduce((sum, u) => sum + u.renders, 0),
      totalProjects: this.mockUsage.reduce((sum, u) => sum + u.projects, 0),
      totalUsers: this.mockUsage.reduce((sum, u) => sum + u.users, 0),
    };
  }

  // --------------------------------------------------------------------------
  // Chart Data Methods
  // --------------------------------------------------------------------------

  getChartData(type: ChartType, dataType: string, period: PeriodPreset): ChartData {
    let labels: string[] = [];
    let data: number[] = [];

    if (dataType === 'renders' || dataType === 'projects' || dataType === 'users') {
      const trend = this.mockTrends.get(dataType) || [];
      labels = trend.map(t => t.date).slice(0, this.config.maxDataPoints);
      data = trend.map(t => t.value).slice(0, this.config.maxDataPoints);
    } else if (dataType === 'topDecors' || dataType === 'categories') {
      const items = this.mockTopItems.get(dataType === 'topDecors' ? 'decors' : 'categories') || [];
      labels = items.map(i => i.name);
      data = items.map(i => i.value);
    }

    return {
      type,
      labels,
      datasets: [{
        label: dataType,
        data,
        backgroundColor: type === 'pie' ? DICA_COLORS : DICA_COLORS[0],
        borderColor: DICA_COLORS[0],
      }],
    };
  }

  // --------------------------------------------------------------------------
  // Report Methods
  // --------------------------------------------------------------------------

  generateReport(period: PeriodPreset): AnalyticsReport {
    const metrics = this.getGlobalMetrics();
    
    const trends: Record<MetricType, TrendData> = {
      renders: this.getTrend('renders', period),
      projects: this.getTrend('projects', period),
      users: this.getTrend('users', period),
      decors: this.getTrend('decors', period),
    };

    const topItems = {
      decors: this.getTopItems('decors', 10),
      users: this.getTopItems('users', 10),
      projects: this.getTopItems('projects', 10),
    };

    const summary = this.generateSummary(metrics, trends);

    return {
      period,
      generatedAt: new Date(),
      metrics,
      trends,
      topItems,
      summary,
    };
  }

  private generateSummary(metrics: GlobalMetrics, trends: Record<MetricType, TrendData>): string {
    const parts: string[] = [];
    
    parts.push(`Rapport d'activité DICA Decorator`);
    parts.push(`Total: ${metrics.totalProjects} projets, ${metrics.totalRenders} rendus`);
    parts.push(`Utilisateurs: ${metrics.activeUsers}/${metrics.totalUsers} actifs (${metrics.engagementRate.toFixed(0)}%)`);
    
    if (trends.renders.direction === 'up') {
      parts.push(`Tendance rendus: +${trends.renders.percentageChange.toFixed(0)}%`);
    } else if (trends.renders.direction === 'down') {
      parts.push(`Tendance rendus: ${trends.renders.percentageChange.toFixed(0)}%`);
    }
    
    return parts.join('. ');
  }

  formatReportForExport(report: AnalyticsReport, format: ExportFormat): string {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }
    
    // CSV format
    const lines: string[] = [];
    lines.push('Metric,Value');
    lines.push(`Total Projects,${report.metrics.totalProjects}`);
    lines.push(`Total Renders,${report.metrics.totalRenders}`);
    lines.push(`Total Users,${report.metrics.totalUsers}`);
    lines.push(`Active Users,${report.metrics.activeUsers}`);
    lines.push(`Engagement Rate,${report.metrics.engagementRate}%`);
    
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Comparison Methods
  // --------------------------------------------------------------------------

  comparePerids(currentPeriod: PeriodPreset, previousPeriod: string): PeriodComparison {
    if (!this.mockComparison) {
      throw new AnalyticsError('No comparison data available', 'NO_DATA');
    }

    const { current, previous } = this.mockComparison;

    return {
      renders: this.calculateComparison(current.renders, previous.renders),
      projects: this.calculateComparison(current.projects, previous.projects),
      users: this.calculateComparison(current.users, previous.users),
    };
  }

  private calculateComparison(current: number, previous: number): ComparisonMetric {
    const change = previous > 0 
      ? ((current - previous) / previous) * 100 
      : (current > 0 ? 100 : 0);
    
    let direction: TrendDirection;
    if (change > 0) {
      direction = 'up';
    } else if (change < 0) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    return { current, previous, change, direction };
  }

  // --------------------------------------------------------------------------
  // Cache Methods
  // --------------------------------------------------------------------------

  private getFromCache<T = unknown>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > this.config.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    if (!this.config.enableCaching) return;
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  // --------------------------------------------------------------------------
  // Error Handling Methods
  // --------------------------------------------------------------------------

  onError(callback: (error: AnalyticsError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) this.errorListeners.splice(index, 1);
    };
  }

  emitError(error: AnalyticsError): void {
    this.errorListeners.forEach(listener => listener(error));
  }
}

