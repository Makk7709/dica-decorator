/**
 * @fileoverview AdminAnalytics - Dashboard Analytics pour administrateurs
 * Métriques globales, tendances et rapports DICA Decorator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {ArrowLeft, BarChart3, Users, FolderKanban, Palette, Image, TrendingUp, Download, RefreshCw, Calendar, FileJson, FileSpreadsheet, FileText} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {PremiumLayout, ContentContainer} from '@/components/ui/premium-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { StatCard } from '@/components/analytics/stat-card';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import {AnalyticsService, PeriodPreset, GlobalMetrics, TrendData, TopItem} from '@/services/analytics.service';
import {AnalyticsExportService, AnalyticsExportData, ExportFormat} from '@/services/analytics-export.service';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsData {
  metrics: GlobalMetrics;
  trends: {
    renders: TrendData;
    projects: TrendData;
    users: TrendData;
  };
  topDecors: TopItem[];
  topUsers: TopItem[];
  usageData: Array<{ name: string; value: number }>;
}

// ============================================================================
// Real Analytics Data
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

const fetchRealAnalytics = async (period: PeriodPreset): Promise<AnalyticsData> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("No valid session");
    }

    const { data, error } = await supabase.functions.invoke("get-analytics", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { period },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw error;
  }
};

// ============================================================================
// Component
// ============================================================================

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodPreset>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [service] = useState(() => new AnalyticsService());
  const [exportService] = useState(() => new AnalyticsExportService());

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const realData = await fetchRealAnalytics(period);
        setData(realData);
      } catch (error) {
        toast.error("Erreur lors du chargement des analytics");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [period]);

  // Prepare chart data
  const rendersChartData = useMemo(() => {
    if (!data) return [];
    return data.trends.renders.data.map(d => ({
      name: d.date,
      value: d.value,
    }));
  }, [data]);

  const decorsChartData = useMemo(() => {
    if (!data) return [];
    return data.topDecors.map(d => ({
      name: d.name,
      value: d.value,
    }));
  }, [data]);

  const handleExport = async (format: ExportFormat) => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      // Prepare export data
      const exportData: AnalyticsExportData = {
        period,
        generatedAt: new Date().toISOString(),
        metrics: {
          totalProjects: data.metrics.totalProjects,
          totalRenders: data.metrics.totalRenders,
          totalUsers: data.metrics.totalUsers,
          totalDecors: data.metrics.totalDecors,
          averageRendersPerProject: data.metrics.avgRendersPerProject || 0,
          engagementRate: data.metrics.engagementRate || 0,
        },
        trends: {
          renders: data.trends.renders.data || [],
          projects: data.trends.projects.data || [],
        },
        topDecors: data.topDecors || [],
        topUsers: data.topUsers || [],
      };

      let blob: Blob;
      const filename = exportService.generateFilename(format, period);

      switch (format) {
        case 'json':
          blob = exportService.createBlob(exportData, 'json');
          break;
        case 'excel':
          blob = exportService.createBlob(exportData, 'excel');
          break;
        case 'pdf':
          blob = await exportService.exportToPDF(exportData);
          break;
        default:
          throw new Error(`Format non supporté: ${format}`);
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const formatLabels: Record<ExportFormat, string> = {
        json: 'JSON',
        excel: 'Excel',
        pdf: 'PDF',
      };
      toast.success(`Rapport ${formatLabels[format]} exporté`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      service.invalidateCache();
      const realData = await fetchRealAnalytics(period);
      setData(realData);
      toast.success('Données actualisées');
    } catch (error) {
      toast.error("Erreur lors de l'actualisation");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumLayout backgroundImage="/images/analytics-bg.jpg">
      <ContentContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics DICA
              </h1>
              <p className="text-muted-foreground mt-1">
                Tableau de bord des statistiques et performances
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting || !data}>
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileJson className="h-4 w-4 mr-2 text-yellow-500" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                  Export Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2 text-red-500" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Projets totaux"
            value={data?.metrics.totalProjects || 0}
            icon={FolderKanban}
            trend={data?.trends.projects.direction}
            trendValue={data?.trends.projects.percentageChange}
            description="vs période précédente"
            iconColor="text-blue-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Rendus générés"
            value={data?.metrics.totalRenders || 0}
            icon={Image}
            trend={data?.trends.renders.direction}
            trendValue={data?.trends.renders.percentageChange}
            description="vs période précédente"
            iconColor="text-primary"
            isLoading={isLoading}
          />
          <StatCard
            title="Utilisateurs actifs"
            value={data?.metrics.activeUsers || 0}
            icon={Users}
            trend={data?.trends.users.direction}
            trendValue={data?.trends.users.percentageChange}
            description={`sur ${data?.metrics.totalUsers || 0} total`}
            iconColor="text-green-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Taux d'engagement"
            value={`${data?.metrics.engagementRate || 0}%`}
            icon={TrendingUp}
            description="utilisateurs actifs"
            iconColor="text-purple-500"
            isLoading={isLoading}
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="decors">Décors</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Évolution des rendus"
                type="line"
                data={rendersChartData}
                height={300}
                isLoading={isLoading}
              />
              <AnalyticsChart
                title="Répartition par catégorie"
                type="pie"
                data={data?.usageData || []}
                height={300}
                showLegend
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="decors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Top 5 Décors"
                type="bar"
                data={decorsChartData}
                height={350}
                isLoading={isLoading}
              />
              
              {/* Top Decors List */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Décors les plus utilisés
                </h3>
                <div className="space-y-3">
                  {data?.topDecors.map((decor, index) => (
                    <div
                      key={decor.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{decor.name}</p>
                          <p className="text-sm text-muted-foreground">{decor.code}</p>
                        </div>
                      </div>
                      <span className="font-semibold">{decor.value} rendus</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Users */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Utilisateurs les plus actifs
                </h3>
                <div className="space-y-3">
                  {data?.topUsers.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-500 font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <span className="font-semibold">{user.value} projets</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4">Statistiques d'utilisation</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Moyenne rendus/projet</span>
                    <span className="font-semibold">{data?.metrics.avgRendersPerProject || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Décors disponibles</span>
                    <span className="font-semibold">{data?.metrics.totalDecors || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Utilisateurs totaux</span>
                    <span className="font-semibold">{data?.metrics.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Taux d'engagement</span>
                    <span className="font-semibold text-green-500">{data?.metrics.engagementRate || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ContentContainer>
    </PremiumLayout>
  );
};

export default AdminAnalytics;

