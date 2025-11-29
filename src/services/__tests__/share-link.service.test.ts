/**
 * @fileoverview Tests TDD pour ShareLinkService
 * Service de partage de projets par lien sécurisé
 * 
 * Fonctionnalités testées:
 * - Génération de liens uniques
 * - Configuration d'expiration
 * - Permissions et accès
 * - Validation des tokens
 * - Révocation de liens
 * - Statistiques de consultation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ShareLinkService,
  ShareLinkConfig,
  ShareLinkData,
  ShareLinkPermissions,
  ShareLinkValidation,
  ShareLinkError,
  ExpirationPreset,
  AccessLog,
  ShareLinkStats,
} from '../share-link.service';

describe('ShareLinkService', () => {
  let service: ShareLinkService;

  beforeEach(() => {
    service = new ShareLinkService();
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    it('should create service with default configuration', () => {
      const config = service.getConfig();
      
      expect(config.baseUrl).toBe('https://dica.app');
      expect(config.pathPrefix).toBe('/p/');
      expect(config.defaultExpiration).toBe(7); // 7 days
      expect(config.maxExpiration).toBe(90); // 90 days
      expect(config.tokenLength).toBe(12);
      expect(config.allowPasswordProtection).toBe(true);
      expect(config.trackViews).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customConfig: Partial<ShareLinkConfig> = {
        baseUrl: 'https://custom.dica.fr',
        pathPrefix: '/share/',
        defaultExpiration: 14,
        tokenLength: 16,
      };
      
      service.configure(customConfig);
      const config = service.getConfig();
      
      expect(config.baseUrl).toBe('https://custom.dica.fr');
      expect(config.pathPrefix).toBe('/share/');
      expect(config.defaultExpiration).toBe(14);
      expect(config.tokenLength).toBe(16);
    });

    it('should validate token length', () => {
      expect(() => service.configure({ tokenLength: 4 }))
        .toThrow(ShareLinkError);
      expect(() => service.configure({ tokenLength: 100 }))
        .toThrow(ShareLinkError);
    });

    it('should validate expiration values', () => {
      expect(() => service.configure({ defaultExpiration: -1 }))
        .toThrow(ShareLinkError);
      expect(() => service.configure({ maxExpiration: 0 }))
        .toThrow(ShareLinkError);
    });

    it('should reset configuration to defaults', () => {
      service.configure({ baseUrl: 'https://test.com', defaultExpiration: 30 });
      service.resetConfig();
      
      const config = service.getConfig();
      expect(config.baseUrl).toBe('https://dica.app');
      expect(config.defaultExpiration).toBe(7);
    });
  });

  // ============================================================================
  // Token Generation Tests
  // ============================================================================
  describe('Token Generation', () => {
    it('should generate unique token', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate token with configured length', () => {
      service.configure({ tokenLength: 16 });
      const token = service.generateToken();
      
      expect(token.length).toBe(16);
    });

    it('should generate URL-safe token', () => {
      const token = service.generateToken();
      
      // Should only contain alphanumeric characters
      expect(token).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate cryptographically random token', () => {
      const tokens = new Set<string>();
      
      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateToken());
      }
      
      // All should be unique
      expect(tokens.size).toBe(100);
    });

    it('should generate full share URL', () => {
      const token = 'abc123xyz789';
      const url = service.generateShareUrl(token);
      
      expect(url).toBe('https://dica.app/p/abc123xyz789');
    });

    it('should generate share URL with custom base', () => {
      service.configure({ baseUrl: 'https://share.dica.fr', pathPrefix: '/link/' });
      const url = service.generateShareUrl('token123');
      
      expect(url).toBe('https://share.dica.fr/link/token123');
    });
  });

  // ============================================================================
  // Share Link Creation Tests
  // ============================================================================
  describe('Share Link Creation', () => {
    it('should create share link with minimal data', () => {
      const link = service.createShareLink({
        projectId: 'project-uuid-123',
        createdBy: 'user-uuid-456',
      });
      
      expect(link.token).toBeDefined();
      expect(link.token.length).toBe(12);
      expect(link.projectId).toBe('project-uuid-123');
      expect(link.createdBy).toBe('user-uuid-456');
      expect(link.url).toContain('dica.app/p/');
      expect(link.expiresAt).toBeDefined();
      expect(link.isActive).toBe(true);
    });

    it('should create share link with custom expiration', () => {
      const link = service.createShareLink({
        projectId: 'project-123',
        createdBy: 'user-123',
        expirationDays: 30,
      });
      
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 30);
      
      // Should be within 1 second of expected
      expect(Math.abs(link.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should use expiration presets', () => {
      const presets: ExpirationPreset[] = ['24h', '7d', '30d', '90d', 'never'];
      
      presets.forEach(preset => {
        const link = service.createShareLink({
          projectId: 'p1',
          createdBy: 'u1',
          expirationPreset: preset,
        });
        
        if (preset === 'never') {
          expect(link.expiresAt).toBeNull();
        } else {
          expect(link.expiresAt).toBeInstanceOf(Date);
        }
      });
    });

    it('should cap expiration at maximum', () => {
      service.configure({ maxExpiration: 30 });
      
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 100, // Exceeds max
      });
      
      const maxExpiry = new Date();
      maxExpiry.setDate(maxExpiry.getDate() + 30);
      
      expect(link.expiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime() + 1000);
    });

    it('should create share link with password protection', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'secret123',
      });
      
      expect(link.isPasswordProtected).toBe(true);
      expect(link.passwordHash).toBeDefined();
      expect(link.passwordHash).not.toBe('secret123'); // Should be hashed
    });

    it('should reject password when protection is disabled', () => {
      service.configure({ allowPasswordProtection: false });
      
      expect(() => service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'secret',
      })).toThrow(ShareLinkError);
    });

    it('should validate password strength', () => {
      expect(() => service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: '123', // Too short
      })).toThrow(ShareLinkError);
    });

    it('should create share link with custom permissions', () => {
      const permissions: ShareLinkPermissions = {
        canView: true,
        canDownload: true,
        canComment: false,
        canShare: false,
      };
      
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        permissions,
      });
      
      expect(link.permissions.canView).toBe(true);
      expect(link.permissions.canDownload).toBe(true);
      expect(link.permissions.canComment).toBe(false);
      expect(link.permissions.canShare).toBe(false);
    });

    it('should use default permissions when not specified', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      expect(link.permissions.canView).toBe(true);
      expect(link.permissions.canDownload).toBe(true);
      expect(link.permissions.canComment).toBe(false);
      expect(link.permissions.canShare).toBe(false);
    });

    it('should add optional metadata', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        metadata: {
          clientName: 'Client ABC',
          purpose: 'Présentation commerciale',
        },
      });
      
      expect(link.metadata?.clientName).toBe('Client ABC');
      expect(link.metadata?.purpose).toBe('Présentation commerciale');
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================
  describe('Validation', () => {
    it('should validate active link', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 7,
      });
      
      const result = service.validateLink(link);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect expired link', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 0, // Expires immediately
      });
      
      // Manually set expired date
      link.expiresAt = new Date(Date.now() - 1000);
      
      const result = service.validateLink(link);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('link_expired');
    });

    it('should detect revoked link', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      link.isActive = false;
      link.revokedAt = new Date();
      
      const result = service.validateLink(link);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('link_revoked');
    });

    it('should validate link with no expiration', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationPreset: 'never',
      });
      
      const result = service.validateLink(link);
      
      expect(result.valid).toBe(true);
    });

    it('should check password requirement', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'secret123',
      });
      
      const resultWithoutPassword = service.validateLink(link);
      expect(resultWithoutPassword.requiresPassword).toBe(true);
      
      const resultWithWrongPassword = service.validateLink(link, 'wrong');
      expect(resultWithWrongPassword.valid).toBe(false);
      expect(resultWithWrongPassword.errors).toContain('invalid_password');
      
      const resultWithCorrectPassword = service.validateLink(link, 'secret123');
      expect(resultWithCorrectPassword.valid).toBe(true);
    });

    it('should validate token format', () => {
      expect(service.isValidTokenFormat('abc123xyz789')).toBe(true);
      expect(service.isValidTokenFormat('ABC123XYZ789')).toBe(true);
      expect(service.isValidTokenFormat('abc-123')).toBe(false); // Contains dash
      expect(service.isValidTokenFormat('abc 123')).toBe(false); // Contains space
      expect(service.isValidTokenFormat('')).toBe(false); // Empty
    });
  });

  // ============================================================================
  // Link Management Tests
  // ============================================================================
  describe('Link Management', () => {
    it('should revoke a link', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      const revokedLink = service.revokeLink(link, 'u1', 'No longer needed');
      
      expect(revokedLink.isActive).toBe(false);
      expect(revokedLink.revokedAt).toBeInstanceOf(Date);
      expect(revokedLink.revokedBy).toBe('u1');
      expect(revokedLink.revocationReason).toBe('No longer needed');
    });

    it('should extend link expiration', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 7,
      });
      
      const originalExpiry = link.expiresAt;
      const extendedLink = service.extendExpiration(link, 7);
      
      expect(extendedLink.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });

    it('should not extend beyond max expiration', () => {
      service.configure({ maxExpiration: 30 });
      
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 25,
      });
      
      const extendedLink = service.extendExpiration(link, 30);
      
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      
      expect(extendedLink.expiresAt.getTime()).toBeLessThanOrEqual(maxDate.getTime() + 1000);
    });

    it('should update permissions', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        permissions: { canView: true, canDownload: false, canComment: false, canShare: false },
      });
      
      const updatedLink = service.updatePermissions(link, {
        canDownload: true,
        canComment: true,
      });
      
      expect(updatedLink.permissions.canView).toBe(true);
      expect(updatedLink.permissions.canDownload).toBe(true);
      expect(updatedLink.permissions.canComment).toBe(true);
    });

    it('should change password', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'oldpassword',
      });
      
      const oldHash = link.passwordHash;
      const updatedLink = service.changePassword(link, 'newpassword');
      
      expect(updatedLink.passwordHash).not.toBe(oldHash);
      expect(updatedLink.isPasswordProtected).toBe(true);
    });

    it('should remove password protection', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'secret',
      });
      
      const updatedLink = service.removePassword(link);
      
      expect(updatedLink.isPasswordProtected).toBe(false);
      expect(updatedLink.passwordHash).toBeUndefined();
    });
  });

  // ============================================================================
  // Access Tracking Tests
  // ============================================================================
  describe('Access Tracking', () => {
    it('should log access', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      const accessLog = service.logAccess(link.token, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
      });
      
      expect(accessLog.token).toBe(link.token);
      expect(accessLog.timestamp).toBeInstanceOf(Date);
      expect(accessLog.ipAddress).toBe('192.168.1.1');
    });

    it('should increment view count', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      expect(link.viewCount).toBe(0);
      
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      service.logAccess(link.token, { ipAddress: '2.2.2.2' });
      
      const stats = service.getStats(link.token);
      expect(stats.totalViews).toBe(2);
    });

    it('should track unique visitors', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      // Same IP twice
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      // Different IP
      service.logAccess(link.token, { ipAddress: '2.2.2.2' });
      
      const stats = service.getStats(link.token);
      expect(stats.totalViews).toBe(3);
      expect(stats.uniqueVisitors).toBe(2);
    });

    it('should not track when disabled', () => {
      service.configure({ trackViews: false });
      
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      
      const stats = service.getStats(link.token);
      expect(stats.totalViews).toBe(0);
    });

    it('should get access history', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      service.logAccess(link.token, { ipAddress: '1.1.1.1', userAgent: 'Chrome' });
      service.logAccess(link.token, { ipAddress: '2.2.2.2', userAgent: 'Firefox' });
      
      const history = service.getAccessHistory(link.token);
      
      expect(history).toHaveLength(2);
      expect(history[0].userAgent).toBe('Chrome');
    });

    it('should limit access history', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      // Log 20 accesses
      for (let i = 0; i < 20; i++) {
        service.logAccess(link.token, { ipAddress: `1.1.1.${i}` });
      }
      
      const history = service.getAccessHistory(link.token, 10);
      
      expect(history).toHaveLength(10);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================
  describe('Statistics', () => {
    it('should calculate link statistics', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 7,
      });
      
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      service.logAccess(link.token, { ipAddress: '2.2.2.2' });
      
      const stats = service.getStats(link.token);
      
      expect(stats.totalViews).toBe(2);
      expect(stats.uniqueVisitors).toBe(2);
      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.daysUntilExpiry).toBeDefined();
      expect(stats.isActive).toBe(true);
    });

    it('should calculate days until expiry', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationDays: 7,
      });
      
      const stats = service.getStats(link.token);
      
      expect(stats.daysUntilExpiry).toBeGreaterThanOrEqual(6);
      expect(stats.daysUntilExpiry).toBeLessThanOrEqual(7);
    });

    it('should show negative days for expired links', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
      });
      
      // Set expired 2 days ago
      link.expiresAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      const stats = service.getStats(link.token);
      
      expect(stats.daysUntilExpiry).toBeLessThan(0);
    });

    it('should return null days for never-expiring links', () => {
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        expirationPreset: 'never',
      });
      
      const stats = service.getStats(link.token);
      
      expect(stats.daysUntilExpiry).toBeNull();
    });
  });

  // ============================================================================
  // URL Parsing Tests
  // ============================================================================
  describe('URL Parsing', () => {
    it('should extract token from URL', () => {
      const token = service.extractTokenFromUrl('https://dica.app/p/abc123xyz789');
      expect(token).toBe('abc123xyz789');
    });

    it('should extract token from custom URL', () => {
      service.configure({ baseUrl: 'https://share.dica.fr', pathPrefix: '/link/' });
      const token = service.extractTokenFromUrl('https://share.dica.fr/link/xyz456');
      expect(token).toBe('xyz456');
    });

    it('should return null for invalid URL', () => {
      const token = service.extractTokenFromUrl('https://other.com/abc123');
      expect(token).toBeNull();
    });

    it('should handle URL with query params', () => {
      const token = service.extractTokenFromUrl('https://dica.app/p/abc123?ref=email');
      expect(token).toBe('abc123');
    });

    it('should handle URL with hash', () => {
      const token = service.extractTokenFromUrl('https://dica.app/p/abc123#section');
      expect(token).toBe('abc123');
    });
  });

  // ============================================================================
  // Batch Operations Tests
  // ============================================================================
  describe('Batch Operations', () => {
    it('should create multiple links for same project', () => {
      const links = service.createBatchLinks({
        projectId: 'p1',
        createdBy: 'u1',
        count: 3,
        expirationDays: 7,
      });
      
      expect(links).toHaveLength(3);
      links.forEach(link => {
        expect(link.projectId).toBe('p1');
      });
      
      // All tokens should be unique
      const tokens = links.map(l => l.token);
      expect(new Set(tokens).size).toBe(3);
    });

    it('should revoke all links for a project', () => {
      const link1 = service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      const link2 = service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      const link3 = service.createShareLink({ projectId: 'p2', createdBy: 'u1' }); // Different project
      
      const revokedCount = service.revokeAllForProject('p1', 'u1');
      
      expect(revokedCount).toBe(2);
      expect(link1.isActive).toBe(false);
      expect(link2.isActive).toBe(false);
      expect(link3.isActive).toBe(true);
    });

    it('should list all links for a project', () => {
      service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      service.createShareLink({ projectId: 'p2', createdBy: 'u1' });
      
      const links = service.getLinksForProject('p1');
      
      expect(links).toHaveLength(2);
    });

    it('should filter active links only', () => {
      const link1 = service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      service.createShareLink({ projectId: 'p1', createdBy: 'u1' });
      
      service.revokeLink(link1, 'u1');
      
      const activeLinks = service.getLinksForProject('p1', { activeOnly: true });
      
      expect(activeLinks).toHaveLength(1);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw ShareLinkError with code', () => {
      try {
        service.configure({ tokenLength: 3 });
      } catch (error) {
        expect(error).toBeInstanceOf(ShareLinkError);
        expect((error as ShareLinkError).code).toBe('INVALID_CONFIG');
      }
    });

    it('should throw for invalid project ID', () => {
      expect(() => service.createShareLink({
        projectId: '',
        createdBy: 'u1',
      })).toThrow(ShareLinkError);
    });

    it('should throw for invalid user ID', () => {
      expect(() => service.createShareLink({
        projectId: 'p1',
        createdBy: '',
      })).toThrow(ShareLinkError);
    });

    it('should emit error events', () => {
      const errorCallback = vi.fn();
      service.onError(errorCallback);
      
      service.emitError(new ShareLinkError('Test', 'TEST_ERROR'));
      
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    it('should complete full share workflow', () => {
      // 1. Create link
      const link = service.createShareLink({
        projectId: 'project-123',
        createdBy: 'user-456',
        expirationDays: 7,
        permissions: { canView: true, canDownload: true, canComment: false, canShare: false },
        metadata: { clientName: 'Client ABC' },
      });
      
      expect(link.token).toBeDefined();
      expect(link.url).toContain(link.token);
      
      // 2. Validate link
      const validation = service.validateLink(link);
      expect(validation.valid).toBe(true);
      
      // 3. Log access
      service.logAccess(link.token, { ipAddress: '1.1.1.1' });
      
      // 4. Get stats
      const stats = service.getStats(link.token);
      expect(stats.totalViews).toBe(1);
      
      // 5. Extract token from URL
      const extractedToken = service.extractTokenFromUrl(link.url);
      expect(extractedToken).toBe(link.token);
    });

    it('should handle password-protected workflow', () => {
      // 1. Create with password
      const link = service.createShareLink({
        projectId: 'p1',
        createdBy: 'u1',
        password: 'secretpassword',
      });
      
      // 2. Validate without password
      const withoutPwd = service.validateLink(link);
      expect(withoutPwd.requiresPassword).toBe(true);
      
      // 3. Validate with wrong password
      const wrongPwd = service.validateLink(link, 'wrong');
      expect(wrongPwd.valid).toBe(false);
      
      // 4. Validate with correct password
      const correctPwd = service.validateLink(link, 'secretpassword');
      expect(correctPwd.valid).toBe(true);
    });
  });
});

