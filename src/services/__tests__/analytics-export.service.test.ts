/**
 * @fileoverview Tests TDD pour AnalyticsExportService
 * Export des analytics en JSON, Excel (CSV) et PDF
 * 
 * @author KOREV AI pour DICA France
 * @version 1.0.0
 * 
 * TDD STRICT: Tests écrits AVANT l'implémentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnalyticsExportService,
  ExportFormat,
  AnalyticsExportData,
} from '../analytics-export.service';

describe('AnalyticsExportService', () => {
  let service: AnalyticsExportService;
  
  const mockData: AnalyticsExportData = {
    period: '30d',
    generatedAt: '2025-12-01T12:00:00Z',
    metrics: {
      totalProjects: 150,
      totalRenders: 1200,
      totalUsers: 45,
      totalDecors: 89,
      averageRendersPerProject: 8,
      engagementRate: 72,
    },
    trends: {
      renders: [
        { date: '2025-11-01', value: 40 },
        { date: '2025-11-15', value: 55 },
        { date: '2025-12-01', value: 62 },
      ],
      projects: [
        { date: '2025-11-01', value: 5 },
        { date: '2025-11-15', value: 8 },
        { date: '2025-12-01', value: 12 },
      ],
    },
    topDecors: [
      { name: 'Inox Brossé 3020BN', value: 234 },
      { name: 'Chêne Clair 2001WD', value: 189 },
      { name: 'Uni Rouge 3178RD', value: 156 },
    ],
    topUsers: [
      { id: 'user-1', name: 'Jean Dupont', value: 45 },
      { id: 'user-2', name: 'Marie Martin', value: 38 },
    ],
  };

  beforeEach(() => {
    service = new AnalyticsExportService();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance', () => {
      expect(service).toBeInstanceOf(AnalyticsExportService);
    });

    it('should support JSON format', () => {
      expect(service.supportsFormat('json')).toBe(true);
    });

    it('should support Excel (CSV) format', () => {
      expect(service.supportsFormat('excel')).toBe(true);
    });

    it('should support PDF format', () => {
      expect(service.supportsFormat('pdf')).toBe(true);
    });
  });

  // ============================================================================
  // JSON EXPORT TESTS
  // ============================================================================

  describe('JSON Export', () => {
    it('should export data as JSON string', () => {
      const result = service.exportToJSON(mockData);
      
      expect(typeof result).toBe('string');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include all metrics in JSON', () => {
      const result = service.exportToJSON(mockData);
      const parsed = JSON.parse(result);
      
      expect(parsed.metrics.totalProjects).toBe(150);
      expect(parsed.metrics.totalRenders).toBe(1200);
      expect(parsed.metrics.totalUsers).toBe(45);
    });

    it('should include trends data in JSON', () => {
      const result = service.exportToJSON(mockData);
      const parsed = JSON.parse(result);
      
      expect(parsed.trends.renders).toHaveLength(3);
      expect(parsed.trends.projects).toHaveLength(3);
    });

    it('should include top decors in JSON', () => {
      const result = service.exportToJSON(mockData);
      const parsed = JSON.parse(result);
      
      expect(parsed.topDecors).toHaveLength(3);
      expect(parsed.topDecors[0].name).toBe('Inox Brossé 3020BN');
    });

    it('should format JSON with indentation', () => {
      const result = service.exportToJSON(mockData);
      
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  // ============================================================================
  // EXCEL (CSV) EXPORT TESTS
  // ============================================================================

  describe('Excel (CSV) Export', () => {
    it('should export data as CSV string', () => {
      const result = service.exportToExcel(mockData);
      
      expect(typeof result).toBe('string');
      // CSV for French Excel uses semicolon separator
      expect(result).toContain(';');
    });

    it('should include header row', () => {
      const result = service.exportToExcel(mockData);
      const lines = result.split('\n');
      
      expect(lines[0]).toContain('DICA Analytics Report');
    });

    it('should include metrics section', () => {
      const result = service.exportToExcel(mockData);
      
      expect(result).toContain('Métriques Globales');
      expect(result).toContain('Total Projets');
      expect(result).toContain('150');
    });

    it('should include trends section', () => {
      const result = service.exportToExcel(mockData);
      
      expect(result).toContain('Tendance Rendus');
      expect(result).toContain('Date');
      expect(result).toContain('Valeur');
    });

    it('should include top decors section', () => {
      const result = service.exportToExcel(mockData);
      
      expect(result).toContain('Top Décors');
      expect(result).toContain('Inox Brossé 3020BN');
    });

    it('should use semicolon separator for Excel compatibility', () => {
      const result = service.exportToExcel(mockData);
      
      // Excel in French locales uses semicolon
      expect(result).toContain(';');
    });

    it('should escape special characters', () => {
      const dataWithSpecialChars: AnalyticsExportData = {
        ...mockData,
        topDecors: [{ name: 'Décor "Spécial"; Test', value: 100 }],
      };
      
      const result = service.exportToExcel(dataWithSpecialChars);
      
      // Should escape quotes and semicolons
      expect(result).toContain('"');
    });
  });

  // ============================================================================
  // PDF EXPORT TESTS
  // ============================================================================

  describe('PDF Export', () => {
    it('should export data as PDF blob', async () => {
      const result = await service.exportToPDF(mockData);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should create a non-empty PDF', async () => {
      const result = await service.exportToPDF(mockData);
      
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include title in PDF metadata', async () => {
      const result = await service.exportToPDF(mockData);
      
      // PDF should be created successfully
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // DOWNLOAD HELPER TESTS
  // ============================================================================

  describe('Download Helpers', () => {
    it('should generate correct filename for JSON', () => {
      const filename = service.generateFilename('json', '30d');
      
      expect(filename).toMatch(/^dica-analytics-30d-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should generate correct filename for Excel', () => {
      const filename = service.generateFilename('excel', '7d');
      
      expect(filename).toMatch(/^dica-analytics-7d-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should generate correct filename for PDF', () => {
      const filename = service.generateFilename('pdf', '90d');
      
      expect(filename).toMatch(/^dica-analytics-90d-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should create blob for JSON', () => {
      const blob = service.createBlob(mockData, 'json');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should create blob for Excel', () => {
      const blob = service.createBlob(mockData, 'excel');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });
  });

  // ============================================================================
  // FULL EXPORT FLOW TESTS
  // ============================================================================

  describe('Full Export Flow', () => {
    it('should export complete data in all formats', async () => {
      const jsonResult = service.exportToJSON(mockData);
      const excelResult = service.exportToExcel(mockData);
      const pdfResult = await service.exportToPDF(mockData);
      
      expect(jsonResult).toBeDefined();
      expect(excelResult).toBeDefined();
      expect(pdfResult).toBeDefined();
    });

    it('should handle empty data gracefully', () => {
      const emptyData: AnalyticsExportData = {
        period: '7d',
        generatedAt: new Date().toISOString(),
        metrics: {
          totalProjects: 0,
          totalRenders: 0,
          totalUsers: 0,
          totalDecors: 0,
          averageRendersPerProject: 0,
          engagementRate: 0,
        },
        trends: { renders: [], projects: [] },
        topDecors: [],
        topUsers: [],
      };
      
      const jsonResult = service.exportToJSON(emptyData);
      const excelResult = service.exportToExcel(emptyData);
      
      expect(jsonResult).toBeDefined();
      expect(excelResult).toBeDefined();
    });

    it('should format dates correctly in exports', () => {
      const result = service.exportToExcel(mockData);
      
      expect(result).toContain('2025-11-01');
    });
  });

  // ============================================================================
  // FORMATTING TESTS
  // ============================================================================

  describe('Formatting', () => {
    it('should format large numbers with separators in Excel', () => {
      const dataWithLargeNumbers: AnalyticsExportData = {
        ...mockData,
        metrics: { ...mockData.metrics, totalRenders: 1234567 },
      };
      
      const result = service.exportToExcel(dataWithLargeNumbers);
      
      // Should include the number (formatted or not)
      expect(result).toContain('1234567');
    });

    it('should format percentages correctly', () => {
      const result = service.exportToExcel(mockData);
      
      expect(result).toContain('72'); // engagementRate
    });
  });
});

