/**
 * @fileoverview AdminAnalytics - Dashboard Analytics pour administrateurs
 * Métriques globales, tendances et rapports DICA Decorator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Users,
  FolderKanban,
  Palette,
  Image,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PremiumLayout, ContentContainer, SectionTitle } from '@/components/ui/premium-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { StatCard } from '@/components/analytics/stat-card';
import { AnalyticsChart } from '@/components/analytics/analytics-chart';
import {
  AnalyticsService,
  PeriodPreset,
  GlobalMetrics,
  TrendData,
  TopItem,
} from '@/services/analytics.service';

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
// Mock Data (replace with real API calls)
// ============================================================================

const generateMockData = (period: PeriodPreset): AnalyticsData => {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
  
  return {
    metrics: {
      totalProjects: Math.floor(Math.random() * 200) + 100,
      totalRenders: Math.floor(Math.random() * 3000) + 1500,
      totalUsers: Math.floor(Math.random() * 80) + 40,
      activeUsers: Math.floor(Math.random() * 50) + 25,
      totalDecors: 89,
      avgRendersPerProject: Math.floor(Math.random() * 10) + 5,
      engagementRate: Math.floor(Math.random() * 30) + 60,
    },
    trends: {
      renders: {
        data: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
          value: Math.floor(Math.random() * 50) + 20,
        })),
        direction: 'up',
        percentageChange: Math.random() * 30 + 5,
      },
      projects: {
        data: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
          value: Math.floor(Math.random() * 10) + 2,
        })),
        direction: 'up',
        percentageChange: Math.random() * 20 + 3,
      },
      users: {
        data: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
          value: Math.floor(Math.random() * 20) + 10,
        })),
        direction: 'stable',
        percentageChange: Math.random() * 5 - 2.5,
      },
    },
    topDecors: [
      { id: '1', name: 'Inox Brossé Premium', value: 245, code: '3020BN' },
      { id: '2', name: 'Marbre Blanc Carrare', value: 189, code: 'MBC-001' },
      { id: '3', name: 'Chêne Naturel', value: 156, code: 'CN-402' },
      { id: '4', name: 'Béton Ciré', value: 134, code: 'BC-201' },
      { id: '5', name: 'Noir Mat', value: 112, code: 'NM-001' },
    ],
    topUsers: [
      { id: 'u1', name: 'Jean Dupont', value: 45, email: 'jean@example.com' },
      { id: 'u2', name: 'Marie Martin', value: 38, email: 'marie@example.com' },
      { id: 'u3', name: 'Pierre Durand', value: 32, email: 'pierre@example.com' },
      { id: 'u4', name: 'Sophie Bernard', value: 28, email: 'sophie@example.com' },
      { id: 'u5', name: 'Lucas Petit', value: 24, email: 'lucas@example.com' },
    ],
    usageData: [
      { name: 'Métal', value: 35 },
      { name: 'Bois', value: 28 },
      { name: 'Marbre', value: 20 },
      { name: 'Uni', value: 12 },
      { name: 'Autre', value: 5 },
    ],
  };
};

// ============================================================================
// Component
// ============================================================================

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodPreset>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [service] = useState(() => new AnalyticsService());

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockData = generateMockData(period);
      setData(mockData);
      setIsLoading(false);
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

  const handleExport = () => {
    if (!data) return;
    
    const report = service.generateReport(period);
    const json = service.formatReportForExport(report, 'json');
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dica-analytics-${period}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Rapport exporté');
  };

  const handleRefresh = () => {
    service.invalidateCache();
    const mockData = generateMockData(period);
    setData(mockData);
    toast.success('Données actualisées');
  };

  return (
    <PremiumLayout>
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
            
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
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
                          <p className="text-sm text-muted-foreground">{user.email}</p>
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

