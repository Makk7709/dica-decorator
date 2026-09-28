/**
 * @fileoverview DecorsTab - Performance du catalogue de décors
 */

import React from 'react';
import { Palette, Rocket, EyeOff } from 'lucide-react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsResponse } from '@/types/analytics.types';
import { AnalyticsChart } from './analytics-chart';
import { EmptyState, Panel, TrendBadge } from './panel';

export interface DecorsTabProps {
  data: AnalyticsResponse | null;
  isLoading: boolean;
}

export const DecorsTab: React.FC<Readonly<DecorsTabProps>> = ({ data, isLoading }) => {
  const decors = data?.decors;

  return (
    <div className="space-y-6">
      <Panel
        title="Top 10 des décors"
        icon={Palette}
        subtitle={
          decors
            ? `${decors.usedCount} décors utilisés sur ${data?.totals.activeDecors ?? 0} actifs au catalogue`
            : undefined
        }
      >
        {isLoading && <div className="h-64 animate-pulse rounded bg-muted" />}
        {!isLoading && !decors?.top.length && <EmptyState>Aucun rendu avec décor sur la période</EmptyState>}
        {!isLoading && !!decors?.top.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Décor</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Rendus</TableHead>
                <TableHead className="w-48">Part des rendus</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
                <TableHead className="text-right">vs préc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decors.top.map((d, i) => (
                <TableRow key={d.id}>
                  <TableCell className="font-semibold text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.code}</p>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{d.category}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{d.renders.toLocaleString('fr-FR')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${d.share}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-muted-foreground">{d.share}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{d.users}</TableCell>
                  <TableCell className="text-right">
                    <TrendBadge change={d.percentageChange} direction={d.direction} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Rendus par catégorie de décor"
          type="pie"
          data={decors?.categories ?? []}
          height={300}
          showLegend
          isLoading={isLoading}
        />
        <AnalyticsChart
          title="Projets par cas d'usage"
          type="pie"
          data={decors?.useCases ?? []}
          height={300}
          showLegend
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Décors en progression" icon={Rocket} iconColor="text-green-500"
          subtitle="Plus forte hausse de rendus vs période précédente">
          {!isLoading && !decors?.rising.length && <EmptyState>Aucun décor en hausse</EmptyState>}
          <div className="space-y-3">
            {decors?.rising.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.code} · {d.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+{d.renders - d.previous} rendus</p>
                  <p className="text-xs text-muted-foreground">{d.previous} → {d.renders}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Décors jamais utilisés"
          icon={EyeOff}
          iconColor="text-orange-500"
          subtitle={decors ? `${decors.unusedCount} décors actifs sans aucun rendu sur la période` : undefined}
        >
          {!isLoading && !decors?.unusedCount && <EmptyState>Tous les décors actifs ont été utilisés</EmptyState>}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {decors?.unused.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.code} · {d.category}</span>
              </div>
            ))}
            {decors && decors.unusedCount > decors.unused.length && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                … et {decors.unusedCount - decors.unused.length} autres
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default DecorsTab;
