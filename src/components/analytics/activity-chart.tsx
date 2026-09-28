/**
 * @fileoverview ActivityChart - Évolution multi-séries avec séries activables
 */

import React, { useState } from 'react';
import {AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import { cn } from '@/lib/utils';
import type { TimeseriesPoint } from '@/types/analytics.types';

type SeriesKey = Exclude<keyof TimeseriesPoint, 'key' | 'label'>;

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'renders', label: 'Rendus', color: '#E94E5D' },
  { key: 'activeUsers', label: 'Utilisateurs actifs', color: '#50C878' },
  { key: 'projects', label: 'Projets', color: '#4A90D9' },
  { key: 'photos', label: 'Photos importées', color: '#FFB347' },
  { key: 'signups', label: 'Inscriptions', color: '#9B59B6' },
  { key: 'favorites', label: 'Favoris', color: '#1ABC9C' },
  { key: 'aiCreations', label: 'Créations IA', color: '#34495E' },
];

export interface ActivityChartProps {
  data: TimeseriesPoint[];
  height?: number;
  isLoading?: boolean;
  className?: string;
}

export const ActivityChart: React.FC<Readonly<ActivityChartProps>> = ({
  data,
  height = 320,
  isLoading = false,
  className,
}) => {
  const [visible, setVisible] = useState<Set<SeriesKey>>(new Set(['renders', 'activeUsers', 'projects']));

  const toggle = (key: SeriesKey) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-lg">Évolution de l'activité</h3>
        <div className="flex flex-wrap gap-2">
          {SERIES.map((s) => {
            const active = visible.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active ? 'bg-muted' : 'text-muted-foreground opacity-60 hover:opacity-100',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded bg-muted" style={{ height }} />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#888888" minTickGap={16} />
              <YAxis tick={{ fontSize: 12 }} stroke="#888888" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                formatter={(value: number, name: string) => [value.toLocaleString('fr-FR'), name]}
              />
              {SERIES.filter((s) => visible.has(s.key)).map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#fill-${s.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ActivityChart;
