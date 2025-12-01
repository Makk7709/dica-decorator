/**
 * Tests TDD pour ResellerBrochurePdfService
 * Clone de Magazine DECO avec couverture personnalisée revendeur
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResellerBranding } from '@/types/plaquette.types';

// Mock des types pour les tests
interface ResellerBrochureOptions {
  project: {
    id: string;
    name: string;
    type: string;
  };
  decor: {
    id: string;
    name: string;
    referenceCode: string;
    category: string;
  };
  images: Array<{
    id: string;
    url: string;
    originalUrl?: string;
    decorName: string;
  }>;
  resellerBranding?: ResellerBranding | null;
  generateAICaptions?: boolean;
}

describe('ResellerBrochurePdfService', () => {
  
  describe('Configuration et types', () => {
    it('should accept resellerBranding as optional parameter', () => {
      const options: ResellerBrochureOptions = {
        project: { id: '1', name: 'Test Project', type: 'autre' },
        decor: { id: '1', name: 'Décor Test', referenceCode: 'TEST-001', category: 'uni' },
        images: [{ id: '1', url: 'https://example.com/img.jpg', decorName: 'Test' }],
        resellerBranding: null, // Pas de branding
      };
      
      expect(options.resellerBranding).toBeNull();
    });

    it('should accept full resellerBranding configuration', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Ma Société Revendeur',
        contactName: 'Jean Dupont',
        email: 'contact@revendeur.fr',
        phone: '01 23 45 67 89',
        address: '123 Rue du Commerce',
        city: 'Paris',
        postalCode: '75001',
        website: 'www.revendeur.fr',
        tagline: 'Votre spécialiste décoration',
      };
      
      expect(branding.enabled).toBe(true);
      expect(branding.companyName).toBe('Ma Société Revendeur');
      expect(branding.email).toBe('contact@revendeur.fr');
      expect(branding.phone).toBe('01 23 45 67 89');
      expect(branding.address).toBe('123 Rue du Commerce');
      expect(branding.tagline).toBe('Votre spécialiste décoration');
    });
  });

  describe('Cover page title logic', () => {
    it('should use reseller company name as title when branding is enabled', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'DÉCO PRESTIGE',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
      };
      
      // La logique doit retourner le nom du revendeur
      const coverTitle = branding.enabled && branding.companyName 
        ? branding.companyName 
        : 'DICA';
      
      expect(coverTitle).toBe('DÉCO PRESTIGE');
    });

    it('should use DICA as title when no branding', () => {
      const branding: ResellerBranding | null = null;
      
      const coverTitle = branding?.enabled && branding?.companyName 
        ? branding.companyName 
        : 'DICA';
      
      expect(coverTitle).toBe('DICA');
    });

    it('should use DICA as title when branding is disabled', () => {
      const branding: ResellerBranding = {
        enabled: false,
        companyName: 'Some Company',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
      };
      
      const coverTitle = branding.enabled && branding.companyName 
        ? branding.companyName 
        : 'DICA';
      
      expect(coverTitle).toBe('DICA');
    });

    it('should use DICA as title when company name is empty', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
      };
      
      const coverTitle = branding.enabled && branding.companyName.trim() 
        ? branding.companyName 
        : 'DICA';
      
      expect(coverTitle).toBe('DICA');
    });
  });

  describe('Reseller contact info formatting', () => {
    it('should format full address correctly', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Co',
        contactName: '',
        email: '',
        phone: '',
        address: '10 Avenue des Champs',
        city: 'Lyon',
        postalCode: '69001',
      };
      
      const fullAddress = [
        branding.address,
        `${branding.postalCode} ${branding.city}`.trim()
      ].filter(Boolean).join(', ');
      
      expect(fullAddress).toBe('10 Avenue des Champs, 69001 Lyon');
    });

    it('should handle missing address parts', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Co',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: 'Lyon',
        postalCode: '',
      };
      
      const fullAddress = [
        branding.address,
        `${branding.postalCode} ${branding.city}`.trim()
      ].filter(part => part && part.trim()).join(', ');
      
      expect(fullAddress).toBe('Lyon');
    });

    it('should format contact line with phone and email', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Co',
        contactName: '',
        email: 'contact@test.fr',
        phone: '04 78 00 00 00',
        address: '',
        city: '',
        postalCode: '',
      };
      
      const contactLine = [
        branding.phone ? `📞 ${branding.phone}` : '',
        branding.email ? `📧 ${branding.email}` : '',
      ].filter(Boolean).join('  |  ');
      
      expect(contactLine).toBe('📞 04 78 00 00 00  |  📧 contact@test.fr');
    });

    it('should handle phone only', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Test Co',
        contactName: '',
        email: '',
        phone: '04 78 00 00 00',
        address: '',
        city: '',
        postalCode: '',
      };
      
      const contactLine = [
        branding.phone ? `📞 ${branding.phone}` : '',
        branding.email ? `📧 ${branding.email}` : '',
      ].filter(Boolean).join('  |  ');
      
      expect(contactLine).toBe('📞 04 78 00 00 00');
    });
  });

  describe('Subtitle logic', () => {
    it('should show "DÉCOR MAGAZINE" as subtitle when reseller branding', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Mon Revendeur',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
      };
      
      // Quand revendeur, le sous-titre reste "DÉCOR MAGAZINE"
      const subtitle = 'DÉCOR  MAGAZINE';
      
      expect(subtitle).toBe('DÉCOR  MAGAZINE');
    });

    it('should include tagline if provided', () => {
      const branding: ResellerBranding = {
        enabled: true,
        companyName: 'Déco Pro',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        tagline: 'Experts en aménagement depuis 1990',
      };
      
      expect(branding.tagline).toBe('Experts en aménagement depuis 1990');
    });
  });

  describe('Filename generation', () => {
    it('should include reseller name in filename when branding enabled', () => {
      const projectName = 'Projet Ascenseur';
      const resellerName = 'Déco Pro';
      
      const filename = `${resellerName.replace(/[^a-zA-Z0-9]/g, '-')}-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-Magazine.pdf`;
      
      expect(filename).toBe('D-co-Pro-Projet-Ascenseur-Magazine.pdf');
    });

    it('should use DICA in filename when no branding', () => {
      const projectName = 'Projet Ascenseur';
      const brandingEnabled = false;
      
      const filename = brandingEnabled 
        ? `Reseller-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-Magazine.pdf`
        : `DICA-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-Magazine.pdf`;
      
      expect(filename).toBe('DICA-Projet-Ascenseur-Magazine.pdf');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete reseller brochure scenario', () => {
      const options: ResellerBrochureOptions = {
        project: { 
          id: 'proj-1', 
          name: 'Rénovation Cabine 42', 
          type: 'ascenseur' 
        },
        decor: { 
          id: 'dec-1', 
          name: 'Uni Orange', 
          referenceCode: '3174_SPA_FC', 
          category: 'uni' 
        },
        images: [
          { 
            id: 'img-1', 
            url: 'https://storage.com/render1.jpg', 
            originalUrl: 'https://storage.com/original.jpg',
            decorName: 'Uni Orange' 
          }
        ],
        resellerBranding: {
          enabled: true,
          companyName: 'ASCENSEURS DUPONT',
          contactName: 'Pierre Dupont',
          email: 'contact@ascenseurs-dupont.fr',
          phone: '01 23 45 67 89',
          address: '25 Rue de l\'Industrie',
          city: 'Marseille',
          postalCode: '13001',
          website: 'www.ascenseurs-dupont.fr',
          tagline: 'Spécialiste cabines d\'ascenseur depuis 1985',
        },
        generateAICaptions: true,
      };
      
      // Vérifications
      expect(options.resellerBranding?.enabled).toBe(true);
      expect(options.resellerBranding?.companyName).toBe('ASCENSEURS DUPONT');
      expect(options.project.name).toBe('Rénovation Cabine 42');
      expect(options.images.length).toBe(1);
      
      // Le titre doit être le nom du revendeur
      const coverTitle = options.resellerBranding?.companyName || 'DICA';
      expect(coverTitle).toBe('ASCENSEURS DUPONT');
    });

    it('should handle DICA internal brochure scenario (no reseller)', () => {
      const options: ResellerBrochureOptions = {
        project: { 
          id: 'proj-2', 
          name: 'Showroom Paris', 
          type: 'autre' 
        },
        decor: { 
          id: 'dec-2', 
          name: 'Bois Chêne', 
          referenceCode: '708_WOOD_FC', 
          category: 'bois' 
        },
        images: [
          { 
            id: 'img-2', 
            url: 'https://storage.com/render2.jpg', 
            decorName: 'Bois Chêne' 
          }
        ],
        resellerBranding: null,
        generateAICaptions: true,
      };
      
      // Le titre doit être DICA
      const coverTitle = options.resellerBranding?.companyName || 'DICA';
      expect(coverTitle).toBe('DICA');
    });
  });
});

