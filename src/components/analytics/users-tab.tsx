/**
 * @fileoverview UsersTab - Engagement et comptes clients
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, Gauge, LogIn, Moon, Users, ImageOff } from 'lucide-react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AnalyticsResponse } from '@/types/analytics.types';
import { StatCard } from './stat-card';
import { EmptyState, Panel } from './panel';

export interface UsersTabProps {
  data: AnalyticsResponse | null;
  isLoading: boolean;
}

const relative = (iso: string | null) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr }) : 'jamais';

const QuotaBar: React.FC<{ used: number | null; limit: number | null }> = ({ used, limit }) => {
  if (used === null || !limit) return <span className="text-xs text-muted-foreground">—</span>;
  const ratio = Math.min(100, (used / limit) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full', ratio >= 90 ? 'bg-red-500' : ratio >= 70 ? 'bg-orange-400' : 'bg-green-500')}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{used}/{limit}</span>
    </div>
  );
};

export const UsersTab: React.FC<Readonly<UsersTabProps>> = ({ data, isLoading }) => {
  const totals = data?.totals;
  const users = data?.users;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Connectés (7 j)" value={totals?.signedInLast7d ?? 0} icon={LogIn}
          description={`sur ${totals?.users ?? 0} comptes`} iconColor="text-green-500" isLoading={isLoading} />
        <StatCard title="Connectés (30 j)" value={totals?.signedInLast30d ?? 0} icon={Users}
          description={`sur ${totals?.users ?? 0} comptes`} iconColor="text-blue-500" isLoading={isLoading} />
        <StatCard title="Dormants" value={totals?.dormant30d ?? 0} icon={Moon}
          description="pas de connexion depuis 30 j" iconColor="text-orange-500" isLoading={isLoading} />
        <StatCard title="Jamais de rendu" value={totals?.neverRendered ?? 0} icon={ImageOff}
          description="comptes à relancer" iconColor="text-red-500" isLoading={isLoading} />
      </div>

      <Panel title="Utilisateurs les plus actifs" icon={Users} iconColor="text-green-500"
        subtitle="Activité sur la période sélectionnée">
        {isLoading && <div className="h-64 animate-pulse rounded bg-muted" />}
        {!isLoading && !users?.top.length && <EmptyState>Aucune activité sur la période</EmptyState>}
        {!isLoading && !!users?.top.length && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead className="text-right">Rendus</TableHead>
                  <TableHead className="text-right">Projets</TableHead>
                  <TableHead className="text-right">Photos</TableHead>
                  <TableHead className="text-right">Favoris</TableHead>
                  <TableHead className="text-right">Jours actifs</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead>Quota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.top.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{u.company ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{u.renders}</TableCell>
                    <TableCell className="text-right">{u.projects}</TableCell>
                    <TableCell className="text-right">{u.photos}</TableCell>
                    <TableCell className="text-right">{u.favorites}</TableCell>
                    <TableCell className="text-right">{u.activeDays}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{relative(u.lastActivityAt)}</TableCell>
                    <TableCell><QuotaBar used={u.quotaUsed} limit={u.quotaLimit} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Sociétés les plus actives" icon={Building2} iconColor="text-blue-500"
          subtitle="Rendus cumulés des utilisateurs de chaque société">
          {!isLoading && !users?.companies.length && <EmptyState>Aucune activité sur la période</EmptyState>}
          <div className="space-y-3">
            {users?.companies.map((c, i) => {
              const max = users.companies[0]?.renders || 1;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      {c.name}
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{c.renders}</span> rendus ·{' '}
                      {c.users} util. · {c.projects} projets
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(c.renders / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Quotas bientôt atteints" icon={Gauge} iconColor="text-red-500"
          subtitle="Comptes ayant consommé 80 % ou plus de leur quota">
          {!isLoading && !users?.quotaAlerts.length && <EmptyState>Aucun compte proche de sa limite</EmptyState>}
          <div className="space-y-3">
            {users?.quotaAlerts.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="font-medium">{q.name}</p>
                  {q.company && <p className="text-xs text-muted-foreground">{q.company}</p>}
                </div>
                <div className="text-right">
                  <p className={cn('font-semibold', q.pct >= 100 ? 'text-red-500' : 'text-orange-500')}>{q.pct}%</p>
                  <p className="text-xs text-muted-foreground">{q.used} / {q.limit}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default UsersTab;
