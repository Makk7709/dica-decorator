/**
 * @fileoverview AnalyticsChart - Composants de graphiques pour analytics
 * Line, Bar et Pie charts avec styling DICA
 */

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ChartData, ChartType } from '@/services/analytics.service';

// DICA Color Palette
const COLORS = [
  '#E94E5D', // Primary red
  '#4A90D9', // Blue
  '#50C878', // Green
  '#FFB347', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#F39C12', // Yellow
  '#34495E', // Dark blue-gray
];

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsChartProps {
  /** Titre du graphique */
  title: string;
  /** Type de graphique */
  type: ChartType;
  /** Données du graphique */
  data: Array<{ name: string; value: number; [key: string]: string | number }>;
  /** Hauteur du graphique */
  height?: number;
  /** Clé pour la valeur */
  dataKey?: string;
  /** Afficher la légende */
  showLegend?: boolean;
  /** Afficher la grille */
  showGrid?: boolean;
  /** Classe CSS */
  className?: string;
  /** Est en chargement */
  isLoading?: boolean;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry: TooltipEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString('fr-FR')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// Chart Components
// ============================================================================

type ChartDataItem = { name: string; value: number; [key: string]: string | number };

const LineChartComponent: React.FC<{
  data: ChartDataItem[];
  dataKey: string;
  showGrid: boolean;
}> = ({ data, dataKey, showGrid }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12 }}
        stroke="#888888"
      />
      <YAxis 
        tick={{ fontSize: 12 }}
        stroke="#888888"
      />
      <Tooltip content={<CustomTooltip />} />
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={COLORS[0]}
        strokeWidth={3}
        dot={{ fill: COLORS[0], strokeWidth: 2 }}
        activeDot={{ r: 6, fill: COLORS[0] }}
      />
    </LineChart>
  </ResponsiveContainer>
);

const BarChartComponent: React.FC<{
  data: ChartDataItem[];
  dataKey: string;
  showGrid: boolean;
}> = ({ data, dataKey, showGrid }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12 }}
        stroke="#888888"
      />
      <YAxis 
        tick={{ fontSize: 12 }}
        stroke="#888888"
      />
      <Tooltip content={<CustomTooltip />} />
      <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const PieChartComponent: React.FC<{
  data: ChartDataItem[];
  dataKey: string;
  showLegend: boolean;
}> = ({ data, dataKey, showLegend }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        paddingAngle={2}
        dataKey={dataKey}
        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        labelLine={false}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend />}
    </PieChart>
  </ResponsiveContainer>
);

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  type,
  data,
  height = 300,
  dataKey = 'value',
  showLegend = false,
  showGrid = true,
  className,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="h-[300px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div style={{ height }}>
        {type === 'line' && (
          <LineChartComponent data={data} dataKey={dataKey} showGrid={showGrid} />
        )}
        {type === 'bar' && (
          <BarChartComponent data={data} dataKey={dataKey} showGrid={showGrid} />
        )}
        {type === 'pie' && (
          <PieChartComponent data={data} dataKey={dataKey} showLegend={showLegend} />
        )}
        {type === 'area' && (
          <LineChartComponent data={data} dataKey={dataKey} showGrid={showGrid} />
        )}
      </div>
    </div>
  );
};

export default AnalyticsChart;

