/**
 * @fileoverview FunnelChart - Entonnoir d'activation des nouveaux inscrits
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { FunnelStep } from '@/types/analytics.types';

export interface FunnelChartProps {
  steps: FunnelStep[];
  isLoading?: boolean;
  className?: string;
}

export const FunnelChart: React.FC<Readonly<FunnelChartProps>> = ({ steps, isLoading = false, className }) => {
  const total = steps[0]?.users ?? 0;

  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      <h3 className="font-semibold text-lg">Entonnoir d'activation</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Parcours des utilisateurs inscrits sur la période
      </p>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-9 rounded bg-muted" />)}
        </div>
      )}

      {!isLoading && total === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Aucune inscription sur la période</p>
      )}

      {!isLoading && total > 0 && (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{step.label}</span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{step.users}</span>
                  {' · '}
                  {step.pctOfTotal}%
                  {i > 0 && (
                    <span className={cn('ml-2 text-xs', step.pctOfPrevious < 50 ? 'text-red-500' : 'text-green-600')}>
                      ({step.pctOfPrevious}% de l'étape préc.)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(step.pctOfTotal, step.users > 0 ? 2 : 0)}%`, opacity: 1 - i * 0.12 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
