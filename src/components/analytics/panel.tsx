/**
 * @fileoverview Panel - Conteneur de section du dashboard analytics
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<Readonly<PanelProps>> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  action,
  className,
  children,
}) => (
  <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {Icon && <Icon className={cn('h-5 w-5', iconColor)} />}
          {title}
        </h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
);

export const TrendBadge: React.FC<{ change: number; direction: 'up' | 'down' | 'stable' }> = ({
  change,
  direction,
}) => (
  <span
    className={cn(
      'text-xs font-medium',
      direction === 'up' && 'text-green-600',
      direction === 'down' && 'text-red-500',
      direction === 'stable' && 'text-muted-foreground',
    )}
  >
    {change > 0 ? '+' : ''}
    {change.toFixed(0)}%
  </span>
);

export default Panel;
