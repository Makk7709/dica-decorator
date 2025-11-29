/**
 * @fileoverview StatCard - Composant de carte statistique
 * Affiche une métrique avec tendance et icône
 */

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendDirection } from '@/services/analytics.service';

export interface StatCardProps {
  /** Titre de la métrique */
  title: string;
  /** Valeur principale */
  value: string | number;
  /** Icône */
  icon: LucideIcon;
  /** Direction de la tendance */
  trend?: TrendDirection;
  /** Pourcentage de changement */
  trendValue?: number;
  /** Description additionnelle */
  description?: string;
  /** Couleur de l'icône */
  iconColor?: string;
  /** Classe CSS */
  className?: string;
  /** Est en chargement */
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  iconColor = 'text-primary',
  className,
  isLoading = false,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-muted-foreground',
  };

  if (isLoading) {
    return (
      <div className={cn(
        'rounded-xl border bg-card p-6 shadow-sm',
        className
      )}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded-lg" />
          </div>
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md',
      className
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('p-2.5 rounded-lg bg-primary/10', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </p>
      </div>
      
      {(trend || description) && (
        <div className="mt-3 flex items-center gap-2">
          {trend && trendValue !== undefined && (
            <span className={cn('flex items-center gap-1 text-sm font-medium', trendColors[trend])}>
              <TrendIcon className="h-4 w-4" />
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
            </span>
          )}
          {description && (
            <span className="text-sm text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;

