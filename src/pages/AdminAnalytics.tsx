/**
 * @fileoverview AdminAnalytics - Dashboard Analytics pour administrateurs
 * Métriques globales, tendances et rapports DICA Decorator
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {ArrowLeft, BarChart3, Users, FolderKanban, Image, Download, RefreshCw, Calendar, FileJson, FileSpreadsheet, FileText, UserPlus, Zap, Camera, Heart, Sparkles} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {PremiumLayout, ContentContainer} from '@/components/ui/premium-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { StatCard } from '@/components/analytics/stat-card';
import { OverviewTab } from '@/components/analytics/overview-tab';
import { DecorsTab } from '@/components/analytics/decors-tab';
import { UsersTab } from '@/components/analytics/users-tab';
import {AnalyticsExportService, AnalyticsExportData, ExportFormat} from '@/services/analytics-export.service';
import type { AnalyticsPeriod, AnalyticsResponse, Kpi } from '@/types/analytics.types';
import { supabase } from "@/integrations/supabase/client";

const fetchAnalytics = async (period: AnalyticsPeriod, excludeAdmins: boolean): Promise<AnalyticsResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No valid session");
  }

  const { data, error } = await supabase.functions.invoke("get-analytics", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { period, excludeAdmins },
  });

  if (error) throw error;
  return data;
};

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [excludeAdmins, setExcludeAdmins] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [exportService] = useState(() => new AnalyticsExportService());

  const load = useCallback(async (notify = false) => {
    setIsLoading(true);
    try {
      setData(await fetchAnalytics(period, excludeAdmins));
      if (notify) toast.success('Données actualisées');
    } catch (error) {
      toast.error("Erreur lors du chargement des analytics");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [period, excludeAdmins]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (format: ExportFormat) => {
    if (!data) return;

    setIsExporting(true);
    try {
      const { kpis } = data;
      const exportData: AnalyticsExportData = {
        period,
        generatedAt: new Date().toISOString(),
        metrics: {
          totalProjects: kpis.projects.value,
          totalRenders: kpis.renders.value,
          totalUsers: data.totals.users,
          totalDecors: data.totals.activeDecors,
          averageRendersPerProject: kpis.projects.value > 0
            ? Math.round((kpis.renders.value / kpis.projects.value) * 10) / 10
            : 0,
          engagementRate: data.totals.users > 0
            ? Math.round((kpis.activeUsers.value / data.totals.users) * 100)
            : 0,
        },
        trends: {
          renders: data.timeseries.map((p) => ({ date: p.label, value: p.renders })),
          projects: data.timeseries.map((p) => ({ date: p.label, value: p.projects })),
        },
        topDecors: data.decors.top.map((d) => ({ id: d.id, name: `${d.name} (${d.code})`, value: d.renders })),
        topUsers: data.users.top.map((u) => ({ id: u.id, name: u.company ? `${u.name} — ${u.company}` : u.name, value: u.renders })),
      };

      let blob: Blob;
      if (format === 'pdf') blob = await exportService.exportToPDF(exportData);
      else blob = exportService.createBlob(exportData, format);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportService.generateFilename(format, period);
      a.click();
      URL.revokeObjectURL(url);

      const formatLabels: Record<ExportFormat, string> = { json: 'JSON', excel: 'Excel', pdf: 'PDF' };
      toast.success(`Rapport ${formatLabels[format]} exporté`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const kpi = (k?: Kpi) => ({ trend: k?.direction, trendValue: k?.percentageChange });
  const kpis = data?.kpis;

  return (
    <PremiumLayout backgroundImage="/images/analytics-bg.jpg">
      <ContentContainer>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics DICA
              </h1>
              <p className="text-muted-foreground mt-1">
                {data?.meta
                  ? `Du ${formatDay(data.meta.start)} au ${formatDay(data.meta.end)} · comparé au ${formatDay(data.meta.previousStart)} – ${formatDay(data.meta.previousEnd)}`
                  : 'Tableau de bord des statistiques et performances'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />

            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch id="exclude-admins" checked={excludeAdmins} onCheckedChange={setExcludeAdmins} />
              <Label htmlFor="exclude-admins" className="text-sm cursor-pointer">Exclure les comptes admin</Label>
            </div>

            <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
              <SelectTrigger className="w-[170px]">
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

            <Button variant="outline" size="icon" onClick={() => load(true)} disabled={isLoading}>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Rendus générés" value={kpis?.renders.value ?? 0} icon={Image} {...kpi(kpis?.renders)}
            description={`${kpis?.rendersPerActiveUser.value ?? 0} par utilisateur actif`}
            iconColor="text-primary" isLoading={isLoading} />
          <StatCard title="Utilisateurs actifs" value={kpis?.activeUsers.value ?? 0} icon={Users} {...kpi(kpis?.activeUsers)}
            description={`sur ${data?.totals.users ?? 0} comptes`} iconColor="text-green-500" isLoading={isLoading} />
          <StatCard title="Nouveaux inscrits" value={kpis?.signups.value ?? 0} icon={UserPlus} {...kpi(kpis?.signups)}
            description="vs période préc." iconColor="text-purple-500" isLoading={isLoading} />
          <StatCard title="Taux d'activation" value={`${kpis?.activationRate.value ?? 0}%`} icon={Zap} {...kpi(kpis?.activationRate)}
            description="inscrits ayant fait un rendu" iconColor="text-yellow-500" isLoading={isLoading} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Projets créés" value={kpis?.projects.value ?? 0} icon={FolderKanban} {...kpi(kpis?.projects)}
            description="vs période préc." iconColor="text-blue-500" isLoading={isLoading} />
          <StatCard title="Photos importées" value={kpis?.photos.value ?? 0} icon={Camera} {...kpi(kpis?.photos)}
            description="vs période préc." iconColor="text-orange-500" isLoading={isLoading} />
          <StatCard title="Rendus en favoris" value={kpis?.favorites.value ?? 0} icon={Heart} {...kpi(kpis?.favorites)}
            description={`${kpis?.favoriteRate.value ?? 0}% des rendus`} iconColor="text-pink-500" isLoading={isLoading} />
          <StatCard title="Créations IA" value={kpis?.aiCreations.value ?? 0} icon={Sparkles} {...kpi(kpis?.aiCreations)}
            description="mode créatif" iconColor="text-teal-500" isLoading={isLoading} />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="decors">Décors</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab data={data} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="decors">
            <DecorsTab data={data} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab data={data} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </ContentContainer>
    </PremiumLayout>
  );
};

export default AdminAnalytics;
