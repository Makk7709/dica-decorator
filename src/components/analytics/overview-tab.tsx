/**
 * @fileoverview OverviewTab - Vue d'ensemble du dashboard analytics
 */

import React from 'react';
import { UserCheck, UserPlus, UserMinus, RotateCcw, Repeat } from 'lucide-react';
import type { AnalyticsResponse } from '@/types/analytics.types';
import { ActivityChart } from './activity-chart';
import { AnalyticsChart } from './analytics-chart';
import { FunnelChart } from './funnel-chart';
import { Panel } from './panel';

export interface OverviewTabProps {
  data: AnalyticsResponse | null;
  isLoading: boolean;
}

export const OverviewTab: React.FC<Readonly<OverviewTabProps>> = ({ data, isLoading }) => {
  const segments = data?.users.segments;
  const segmentRows = [
    { label: 'Nouveaux', hint: 'inscrits et actifs sur la période', value: segments?.new, icon: UserPlus, color: 'text-purple-500' },
    { label: 'Fidèles', hint: 'actifs sur les deux périodes', value: segments?.returning, icon: Repeat, color: 'text-green-500' },
    { label: 'Réactivés', hint: 'inactifs la période précédente', value: segments?.reactivated, icon: RotateCcw, color: 'text-blue-500' },
    { label: 'Perdus', hint: 'actifs avant, plus maintenant', value: segments?.lost, icon: UserMinus, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <ActivityChart data={data?.timeseries ?? []} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FunnelChart steps={data?.funnel ?? []} isLoading={isLoading} className="lg:col-span-2" />

        <Panel title="Profil des utilisateurs actifs" icon={UserCheck} iconColor="text-green-500"
          subtitle="Comparé à la période précédente">
          <div className="space-y-4">
            {segmentRows.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.hint}</p>
                  </div>
                </div>
                <span className="text-xl font-semibold">{isLoading ? '–' : s.value ?? 0}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Rendus par jour de la semaine"
          subtitle="Heure de Paris"
          type="bar"
          data={data?.weekdayActivity ?? []}
          height={260}
          singleColor
          isLoading={isLoading}
        />
        <AnalyticsChart
          title="Rendus par heure"
          subtitle="Heure de Paris"
          type="bar"
          data={data?.hourActivity ?? []}
          height={260}
          singleColor
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default OverviewTab;
