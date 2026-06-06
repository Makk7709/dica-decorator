/**
 * @fileoverview AnalyticsExportService - Export des analytics en JSON, Excel et PDF
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 */

import jsPDF from 'jspdf';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'json' | 'excel' | 'pdf';

export interface AnalyticsMetrics {
  totalProjects: number;
  totalRenders: number;
  totalUsers: number;
  totalDecors: number;
  averageRendersPerProject: number;
  engagementRate: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TopItem {
  id?: string;
  name: string;
  value: number;
}

export interface AnalyticsExportData {
  period: string;
  generatedAt: string;
  metrics: AnalyticsMetrics;
  trends: {
    renders: TrendDataPoint[];
    projects: TrendDataPoint[];
  };
  topDecors: TopItem[];
  topUsers: TopItem[];
}

// ============================================================================
// AnalyticsExportService
// ============================================================================

export class AnalyticsExportService {
  private readonly supportedFormats: ExportFormat[] = ['json', 'excel', 'pdf'];

  /**
   * Check if a format is supported
   */
  supportsFormat(format: ExportFormat): boolean {
    return this.supportedFormats.includes(format);
  }

  /**
   * Generate filename based on format and period
   */
  generateFilename(format: ExportFormat, period: string): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'excel' ? 'csv' : format;
    return `dica-analytics-${period}-${date}.${extension}`;
  }

  /**
   * Create blob for download
   */
  createBlob(data: AnalyticsExportData, format: ExportFormat): Blob {
    switch (format) {
      case 'json':
        return new Blob([this.exportToJSON(data)], { type: 'application/json' });
      case 'excel':
        return new Blob([this.exportToExcel(data)], { type: 'text/csv;charset=utf-8;' });
      default:
        throw new Error(`Format ${format} not supported for sync blob creation`);
    }
  }

  // ============================================================================
  // JSON Export
  // ============================================================================

  /**
   * Export data to formatted JSON string
   */
  exportToJSON(data: AnalyticsExportData): string {
    return JSON.stringify(data, null, 2);
  }

  // ============================================================================
  // Excel (CSV) Export
  // ============================================================================

  /**
   * Escape special characters for CSV
   */
  private escapeCSV(value: string | number): string {
    const str = String(value);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Export data to CSV format (Excel compatible)
   */
  exportToExcel(data: AnalyticsExportData): string {
    const lines: string[] = [];
    const sep = ';'; // French Excel uses semicolon

    // Header
    lines.push(`DICA Analytics Report`);
    lines.push(`Période: ${data.period}`);
    lines.push(`Généré le: ${new Date(data.generatedAt).toLocaleDateString('fr-FR')}`);
    lines.push('');

    // Metrics Section
    lines.push('=== Métriques Globales ===');
    lines.push(`Métrique${sep}Valeur`);
    lines.push(`Total Projets${sep}${data.metrics.totalProjects}`);
    lines.push(`Total Rendus${sep}${data.metrics.totalRenders}`);
    lines.push(`Total Utilisateurs${sep}${data.metrics.totalUsers}`);
    lines.push(`Total Décors${sep}${data.metrics.totalDecors}`);
    lines.push(`Moyenne Rendus/Projet${sep}${data.metrics.averageRendersPerProject}`);
    lines.push(`Taux d'engagement${sep}${data.metrics.engagementRate}%`);
    lines.push('');

    // Renders Trend Section
    if (data.trends.renders.length > 0) {
      lines.push('=== Tendance Rendus ===');
      lines.push(`Date${sep}Valeur`);
      data.trends.renders.forEach(point => {
        lines.push(`${point.date}${sep}${point.value}`);
      });
      lines.push('');
    }

    // Projects Trend Section
    if (data.trends.projects.length > 0) {
      lines.push('=== Tendance Projets ===');
      lines.push(`Date${sep}Valeur`);
      data.trends.projects.forEach(point => {
        lines.push(`${point.date}${sep}${point.value}`);
      });
      lines.push('');
    }

    // Top Decors Section
    if (data.topDecors.length > 0) {
      lines.push('=== Top Décors ===');
      lines.push(`Nom${sep}Utilisations`);
      data.topDecors.forEach(decor => {
        lines.push(`${this.escapeCSV(decor.name)}${sep}${decor.value}`);
      });
      lines.push('');
    }

    // Top Users Section
    if (data.topUsers.length > 0) {
      lines.push('=== Utilisateurs les plus actifs ===');
      lines.push(`Nom${sep}Rendus`);
      data.topUsers.forEach(user => {
        lines.push(`${this.escapeCSV(user.name)}${sep}${user.value}`);
      });
    }

    return lines.join('\n');
  }

  // ============================================================================
  // PDF Export
  // ============================================================================

  /**
   * Export data to PDF
   */
  async exportToPDF(data: AnalyticsExportData): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(233, 78, 93); // DICA Red
    pdf.text('DICA Analytics', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Subtitle
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Rapport - Période: ${this.formatPeriodLabel(data.period)}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text(`Généré le ${new Date(data.generatedAt).toLocaleDateString('fr-FR')}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Horizontal line
    pdf.setDrawColor(233, 78, 93);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Metrics Section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text('Métriques Globales', margin, y);
    y += 10;

    // Metrics Grid
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const metrics = [
      { label: 'Total Projets', value: data.metrics.totalProjects.toString() },
      { label: 'Total Rendus', value: data.metrics.totalRenders.toString() },
      { label: 'Utilisateurs', value: data.metrics.totalUsers.toString() },
      { label: 'Décors', value: data.metrics.totalDecors.toString() },
      { label: 'Moy. Rendus/Projet', value: data.metrics.averageRendersPerProject.toString() },
      { label: "Taux d'engagement", value: `${data.metrics.engagementRate}%` },
    ];

    const colWidth = (pageWidth - 2 * margin) / 3;
    metrics.forEach((metric, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + col * colWidth;
      const yPos = y + row * 20;

      // Box
      pdf.setFillColor(248, 248, 248);
      pdf.roundedRect(x, yPos, colWidth - 5, 15, 2, 2, 'F');

      // Value
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(233, 78, 93);
      pdf.text(metric.value, x + 5, yPos + 6);

      // Label
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(metric.label, x + 5, yPos + 11);
      pdf.setFontSize(11);
    });

    y += 45;

    // Top Decors Section
    if (data.topDecors.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      pdf.text('Top Décors', margin, y);
      y += 10;

      pdf.setFontSize(10);
      data.topDecors.slice(0, 10).forEach((decor, index) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        pdf.text(`${index + 1}. ${decor.name}`, margin, y);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(233, 78, 93);
        pdf.text(`${decor.value} utilisations`, pageWidth - margin - 40, y);
        y += 6;
      });
      y += 10;
    }

    // Top Users Section
    if (data.topUsers.length > 0) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      pdf.text('Utilisateurs les plus actifs', margin, y);
      y += 10;

      pdf.setFontSize(10);
      data.topUsers.slice(0, 5).forEach((user, index) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        pdf.text(`${index + 1}. ${user.name}`, margin, y);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(233, 78, 93);
        pdf.text(`${user.value} rendus`, pageWidth - margin - 30, y);
        y += 6;
      });
    }

    // Footer
    const footerY = pdf.internal.pageSize.getHeight() - 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text('DICA France - Rapport généré par DICA Decorator', pageWidth / 2, footerY, { align: 'center' });
    pdf.text('Développé par KOREV AI', pageWidth / 2, footerY + 4, { align: 'center' });

    return pdf.output('blob');
  }

  /**
   * Format period label for display
   */
  private formatPeriodLabel(period: string): string {
    const labels: Record<string, string> = {
      '7d': '7 derniers jours',
      '30d': '30 derniers jours',
      '90d': '90 derniers jours',
      '1y': 'Année en cours',
    };
    return labels[period] || period;
  }
}

// Export default instance
export const analyticsExportService = new AnalyticsExportService();

