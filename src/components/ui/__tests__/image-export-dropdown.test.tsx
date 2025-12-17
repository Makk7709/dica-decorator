/**
 * @fileoverview Tests pour ImageExportDropdown (Unit tests simples)
 * Tests du rendu initial et des propriétés
 * 
 * @author KOREV AI pour DICA France
 * @date Décembre 2025
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageExportDropdown } from '../image-export-dropdown';
import { ImageExportService } from '@/services/image-export.service';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock services
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/image-export.service', () => ({
  ImageExportService: {
    getAvailableFormats: vi.fn(() => [
      {
        value: 'png' as const,
        label: 'PNG — Qualité maximale',
        description: 'Sans perte, idéal pour impression',
        estimatedSize: '2-5 MB',
      },
      {
        value: 'jpeg' as const,
        label: 'JPEG — Optimisé partage',
        description: 'Léger, universel',
        estimatedSize: '200-500 KB',
      },
      {
        value: 'webp' as const,
        label: 'WebP — Ultra-léger',
        description: 'Moderne, meilleur ratio qualité/taille',
        estimatedSize: '100-300 KB',
      },
    ]),
    getRecommendedQuality: vi.fn((format: string) => {
      const qualities: Record<string, number> = { png: 1, jpeg: 0.9, webp: 0.92 };
      return qualities[format] || 0.92;
    }),
    downloadImage: vi.fn(),
    getFormatInfo: vi.fn((format: string) => ({
      name: format.toUpperCase(),
      description: 'Test description',
      estimatedSize: '1 MB',
      supportsTransparency: format !== 'jpeg',
    })),
  },
}));

describe('ImageExportDropdown', () => {
  const mockImageUrl = 'https://example.com/test-image.png';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Rendu initial
  // ========================================================================

  describe('Rendu initial', () => {
    it('devrait afficher le bouton de téléchargement', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Télécharger')).toBeInTheDocument();
    });

    it('devrait masquer le label si showLabel=false', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} showLabel={false} />);
      
      expect(screen.queryByText('Télécharger')).not.toBeInTheDocument();
    });

    it('devrait appliquer une className personnalisée', () => {
      render(
        <ImageExportDropdown imageUrl={mockImageUrl} className="custom-class" />
      );
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('devrait charger les formats disponibles', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} />);
      
      expect(ImageExportService.getAvailableFormats).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Variantes de style
  // ========================================================================

  describe('Variantes de style', () => {
    it('devrait rendre avec variant=outline', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} variant="outline" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait rendre avec variant=ghost', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} variant="ghost" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait rendre avec variant=secondary', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} variant="secondary" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait rendre avec size=sm', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} size="sm" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait rendre avec size=lg', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} size="lg" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait rendre avec size=icon', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} size="icon" showLabel={false} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Propriétés
  // ========================================================================

  describe('Propriétés', () => {
    it('devrait accepter imageUrl', () => {
      const customUrl = 'https://custom.com/image.jpg';
      render(<ImageExportDropdown imageUrl={customUrl} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait accepter filename', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} filename="custom-name" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('devrait accepter showLabel', () => {
      const { rerender } = render(
        <ImageExportDropdown imageUrl={mockImageUrl} showLabel={true} />
      );
      expect(screen.getByText('Télécharger')).toBeInTheDocument();
      
      rerender(<ImageExportDropdown imageUrl={mockImageUrl} showLabel={false} />);
      expect(screen.queryByText('Télécharger')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // État initial
  // ========================================================================

  describe('État initial', () => {
    it('devrait ne pas être en état d\'export au démarrage', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(screen.queryByText('Export...')).not.toBeInTheDocument();
    });

    it('devrait afficher "Télécharger" comme texte par défaut', () => {
      render(<ImageExportDropdown imageUrl={mockImageUrl} />);
      expect(screen.getByText('Télécharger')).toBeInTheDocument();
    });
  });
});

// ========================================================================
// Tests du service ImageExportService (isolés)
// ========================================================================

describe('ImageExportService (mocked)', () => {
  it('devrait retourner les formats disponibles', () => {
    const formats = ImageExportService.getAvailableFormats();
    
    expect(formats).toHaveLength(3);
    expect(formats[0].value).toBe('png');
    expect(formats[1].value).toBe('jpeg');
    expect(formats[2].value).toBe('webp');
  });

  it('devrait retourner la qualité recommandée pour chaque format', () => {
    expect(ImageExportService.getRecommendedQuality('png')).toBe(1);
    expect(ImageExportService.getRecommendedQuality('jpeg')).toBe(0.9);
    expect(ImageExportService.getRecommendedQuality('webp')).toBe(0.92);
  });

  it('devrait retourner les infos de format', () => {
    const pngInfo = ImageExportService.getFormatInfo('png');
    
    expect(pngInfo.name).toBe('PNG');
    expect(pngInfo.supportsTransparency).toBe(true);
  });
});
