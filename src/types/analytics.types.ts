/**
 * @fileoverview Types de la réponse de l'edge function get-analytics.
 * Source unique : le module d'agrégation partagé de l'edge function.
 */

export type {
  AnalyticsPeriod,
  AnalyticsResponse,
  CompanyStat,
  DecorStat,
  FunnelStep,
  Granularity,
  Kpi,
  NamedValue,
  QuotaAlert,
  TimeseriesPoint,
  TrendDirection,
  UserStat,
} from '../../supabase/functions/_shared/analytics-aggregate.ts';
