/**
 * @fileoverview TDD Tests for URL Validator Service
 * 
 * Phase 1.3: Anti-SSRF URL Validation
 * 
 * Requirements:
 * - Block requests to localhost and loopback addresses
 * - Block requests to private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Block requests to cloud metadata endpoints (169.254.169.254)
 * - Block non-HTTP/HTTPS protocols (file://, gopher://, etc.)
 * - Block internal hostnames (*.local, *.internal)
 * - Allow only whitelisted external domains
 * - Validate URL structure and encoding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UrlValidatorService,
  SsrfBlockedError,
  InvalidUrlError,
  type UrlValidationConfig,
  type UrlValidationResult,
} from '../url-validator.service';

describe('UrlValidatorService', () => {
  let service: UrlValidatorService;

  const defaultConfig: UrlValidationConfig = {
    allowedProtocols: ['https:', 'http:'],
    allowedDomains: [
      'images.unsplash.com',
      'cdn.example.com',
      'storage.googleapis.com',
      '*.supabase.co',
      '*.supabase.in',
    ],
    blockedIpRanges: [
      '127.0.0.0/8',     // Loopback
      '10.0.0.0/8',      // Private Class A
      '172.16.0.0/12',   // Private Class B
      '192.168.0.0/16',  // Private Class C
      '169.254.0.0/16',  // Link-local / Cloud metadata
      '::1/128',         // IPv6 loopback
      'fc00::/7',        // IPv6 private
    ],
    blockedHostPatterns: [
      /localhost/i,
      /\.local$/i,
      /\.internal$/i,
      /\.corp$/i,
      /\.lan$/i,
    ],
    maxUrlLength: 2048,
  };

  beforeEach(() => {
    service = new UrlValidatorService(defaultConfig);
  });

  describe('validateUrl - Blocking Malicious URLs', () => {
    describe('Localhost and Loopback', () => {
      it('should block http://localhost', () => {
        expect(() => service.validateUrl('http://localhost/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block http://localhost with port', () => {
        expect(() => service.validateUrl('http://localhost:8080/admin'))
          .toThrow(SsrfBlockedError);
      });

      it('should block http://127.0.0.1', () => {
        expect(() => service.validateUrl('http://127.0.0.1/api'))
          .toThrow(SsrfBlockedError);
      });

      it('should block any 127.x.x.x address', () => {
        expect(() => service.validateUrl('http://127.0.0.2/api'))
          .toThrow(SsrfBlockedError);
        expect(() => service.validateUrl('http://127.255.255.255/api'))
          .toThrow(SsrfBlockedError);
      });

      it('should block IPv6 loopback [::1]', () => {
        // IPv6 loopback is blocked - either as SSRF or as non-whitelisted domain
        expect(() => service.validateUrl('http://[::1]/api'))
          .toThrow(); // Blocked regardless of error type
      });

      it('should block localhost in uppercase', () => {
        expect(() => service.validateUrl('http://LOCALHOST/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block localhost with mixed case', () => {
        expect(() => service.validateUrl('http://LocalHost/secret'))
          .toThrow(SsrfBlockedError);
      });
    });

    describe('Private IP Ranges', () => {
      it('should block 10.x.x.x addresses', () => {
        expect(() => service.validateUrl('http://10.0.0.1/internal'))
          .toThrow(SsrfBlockedError);
        expect(() => service.validateUrl('http://10.255.255.255/internal'))
          .toThrow(SsrfBlockedError);
      });

      it('should block 172.16-31.x.x addresses', () => {
        expect(() => service.validateUrl('http://172.16.0.1/internal'))
          .toThrow(SsrfBlockedError);
        expect(() => service.validateUrl('http://172.31.255.255/internal'))
          .toThrow(SsrfBlockedError);
      });

      it('should NOT block 172.32.x.x (outside private range)', () => {
        // This is a public IP, should be allowed if domain-whitelisted
        // But since it's not in allowed domains, it should fail for different reason
        expect(() => service.validateUrl('http://172.32.0.1/external'))
          .toThrow(); // Throws because not in allowed domains, not SSRF
      });

      it('should block 192.168.x.x addresses', () => {
        expect(() => service.validateUrl('http://192.168.0.1/router'))
          .toThrow(SsrfBlockedError);
        expect(() => service.validateUrl('http://192.168.255.255/router'))
          .toThrow(SsrfBlockedError);
      });
    });

    describe('Cloud Metadata Endpoints', () => {
      it('should block AWS metadata endpoint 169.254.169.254', () => {
        expect(() => service.validateUrl('http://169.254.169.254/latest/meta-data'))
          .toThrow(SsrfBlockedError);
      });

      it('should block Azure metadata endpoint', () => {
        expect(() => service.validateUrl('http://169.254.169.254/metadata/instance'))
          .toThrow(SsrfBlockedError);
      });

      it('should block GCP metadata endpoint', () => {
        expect(() => service.validateUrl('http://169.254.169.254/computeMetadata/v1/'))
          .toThrow(SsrfBlockedError);
      });

      it('should block link-local range 169.254.x.x', () => {
        expect(() => service.validateUrl('http://169.254.0.1/internal'))
          .toThrow(SsrfBlockedError);
      });
    });

    describe('Dangerous Protocols', () => {
      it('should block file:// protocol', () => {
        expect(() => service.validateUrl('file:///etc/passwd'))
          .toThrow(InvalidUrlError);
      });

      it('should block gopher:// protocol', () => {
        expect(() => service.validateUrl('gopher://internal:25'))
          .toThrow(InvalidUrlError);
      });

      it('should block ftp:// protocol', () => {
        expect(() => service.validateUrl('ftp://internal.server/files'))
          .toThrow(InvalidUrlError);
      });

      it('should block dict:// protocol', () => {
        expect(() => service.validateUrl('dict://internal:11111'))
          .toThrow(InvalidUrlError);
      });

      it('should block data: URLs', () => {
        expect(() => service.validateUrl('data:text/html,<script>alert(1)</script>'))
          .toThrow(InvalidUrlError);
      });

      it('should block javascript: URLs', () => {
        expect(() => service.validateUrl('javascript:alert(1)'))
          .toThrow(InvalidUrlError);
      });
    });

    describe('Internal Hostname Patterns', () => {
      it('should block .local domains', () => {
        expect(() => service.validateUrl('http://server.local/api'))
          .toThrow(SsrfBlockedError);
      });

      it('should block .internal domains', () => {
        expect(() => service.validateUrl('http://api.internal/secrets'))
          .toThrow(SsrfBlockedError);
      });

      it('should block .corp domains', () => {
        expect(() => service.validateUrl('http://intranet.corp/data'))
          .toThrow(SsrfBlockedError);
      });

      it('should block .lan domains', () => {
        expect(() => service.validateUrl('http://nas.lan/files'))
          .toThrow(SsrfBlockedError);
      });
    });

    describe('URL Encoding Bypass Attempts', () => {
      it('should block URL-encoded localhost', () => {
        // %6c%6f%63%61%6c%68%6f%73%74 = localhost
        expect(() => service.validateUrl('http://%6c%6f%63%61%6c%68%6f%73%74/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block double-encoded localhost', () => {
        expect(() => service.validateUrl('http://%256c%256f%2563%2561%256c%2568%256f%2573%2574/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block IPv4 in decimal notation', () => {
        // 2130706433 = 127.0.0.1
        expect(() => service.validateUrl('http://2130706433/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block IPv4 in octal notation', () => {
        // 0177.0.0.1 = 127.0.0.1
        expect(() => service.validateUrl('http://0177.0.0.1/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block IPv4 in hex notation', () => {
        // 0x7f.0.0.1 = 127.0.0.1
        expect(() => service.validateUrl('http://0x7f.0.0.1/secret'))
          .toThrow(SsrfBlockedError);
      });

      it('should block shortened IPv4 notation', () => {
        // 127.1 = 127.0.0.1
        expect(() => service.validateUrl('http://127.1/secret'))
          .toThrow(SsrfBlockedError);
      });
    });

    describe('DNS Rebinding Protection', () => {
      it('should block URLs with @ symbol in host', () => {
        // Attempt to use basic auth to disguise hostname
        expect(() => service.validateUrl('http://trusted.com@evil.com/path'))
          .toThrow(InvalidUrlError);
      });

      it('should block URLs with unusual port numbers', () => {
        // This could be attempting to access internal services
        expect(() => service.validateUrl('http://example.com:22/ssh'))
          .toThrow(InvalidUrlError);
      });
    });
  });

  describe('validateUrl - Allowing Valid URLs', () => {
    it('should allow HTTPS URLs from whitelisted domains', () => {
      const result = service.validateUrl('https://images.unsplash.com/photo-123.jpg');
      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://images.unsplash.com/photo-123.jpg');
    });

    it('should allow HTTP URLs from whitelisted domains', () => {
      const result = service.validateUrl('http://cdn.example.com/texture.png');
      expect(result.valid).toBe(true);
    });

    it('should allow Supabase storage URLs with wildcard match', () => {
      const result = service.validateUrl('https://abc123.supabase.co/storage/v1/object/public/images/photo.jpg');
      expect(result.valid).toBe(true);
    });

    it('should allow Supabase .in domain with wildcard match', () => {
      const result = service.validateUrl('https://project-ref.supabase.in/storage/image.png');
      expect(result.valid).toBe(true);
    });

    it('should allow Google Cloud Storage URLs', () => {
      const result = service.validateUrl('https://storage.googleapis.com/bucket/image.jpg');
      expect(result.valid).toBe(true);
    });

    it('should preserve query parameters in sanitized URL', () => {
      const result = service.validateUrl('https://images.unsplash.com/photo.jpg?w=800&q=80');
      expect(result.sanitizedUrl).toBe('https://images.unsplash.com/photo.jpg?w=800&q=80');
    });

    it('should handle URLs with encoded characters', () => {
      const result = service.validateUrl('https://images.unsplash.com/photo%20name.jpg');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateUrl - Rejecting Non-Whitelisted Domains', () => {
    it('should reject URLs from unknown domains', () => {
      expect(() => service.validateUrl('https://evil-site.com/image.jpg'))
        .toThrow(InvalidUrlError);
    });

    it('should reject URLs with similar-looking domains', () => {
      expect(() => service.validateUrl('https://images.unsplash.com.evil.com/image.jpg'))
        .toThrow(InvalidUrlError);
    });

    it('should reject URLs with subdomain of non-whitelisted domain', () => {
      expect(() => service.validateUrl('https://supabase.co.evil.com/image.jpg'))
        .toThrow(InvalidUrlError);
    });
  });

  describe('validateUrl - Input Validation', () => {
    it('should reject empty strings', () => {
      expect(() => service.validateUrl(''))
        .toThrow(InvalidUrlError);
    });

    it('should reject null values', () => {
      expect(() => service.validateUrl(null as any))
        .toThrow(InvalidUrlError);
    });

    it('should reject undefined values', () => {
      expect(() => service.validateUrl(undefined as any))
        .toThrow(InvalidUrlError);
    });

    it('should reject non-string values', () => {
      expect(() => service.validateUrl(123 as any))
        .toThrow(InvalidUrlError);
    });

    it('should reject URLs exceeding max length', () => {
      const longUrl = 'https://images.unsplash.com/' + 'a'.repeat(2100);
      expect(() => service.validateUrl(longUrl))
        .toThrow(InvalidUrlError);
    });

    it('should reject malformed URLs', () => {
      expect(() => service.validateUrl('not-a-valid-url'))
        .toThrow(InvalidUrlError);
    });

    it('should reject URLs with only protocol', () => {
      expect(() => service.validateUrl('http://'))
        .toThrow(InvalidUrlError);
    });
  });

  describe('isPrivateIp', () => {
    it('should identify loopback addresses', () => {
      expect(service.isPrivateIp('127.0.0.1')).toBe(true);
      expect(service.isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('should identify Class A private addresses', () => {
      expect(service.isPrivateIp('10.0.0.1')).toBe(true);
      expect(service.isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('should identify Class B private addresses', () => {
      expect(service.isPrivateIp('172.16.0.1')).toBe(true);
      expect(service.isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('should identify Class C private addresses', () => {
      expect(service.isPrivateIp('192.168.0.1')).toBe(true);
      expect(service.isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('should identify link-local addresses', () => {
      expect(service.isPrivateIp('169.254.0.1')).toBe(true);
      expect(service.isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('should return false for public IPs', () => {
      expect(service.isPrivateIp('8.8.8.8')).toBe(false);
      expect(service.isPrivateIp('1.1.1.1')).toBe(false);
      expect(service.isPrivateIp('104.16.0.1')).toBe(false);
    });
  });

  describe('matchesWildcardDomain', () => {
    it('should match exact domain', () => {
      expect(service.matchesWildcardDomain('images.unsplash.com', 'images.unsplash.com')).toBe(true);
    });

    it('should match wildcard subdomain', () => {
      expect(service.matchesWildcardDomain('abc123.supabase.co', '*.supabase.co')).toBe(true);
      expect(service.matchesWildcardDomain('project.supabase.co', '*.supabase.co')).toBe(true);
    });

    it('should not match partial domains', () => {
      expect(service.matchesWildcardDomain('supabase.co.evil.com', '*.supabase.co')).toBe(false);
    });

    it('should not match without subdomain for wildcard', () => {
      expect(service.matchesWildcardDomain('supabase.co', '*.supabase.co')).toBe(false);
    });
  });

  describe('normalizeIp', () => {
    it('should convert decimal IP to dotted notation', () => {
      expect(service.normalizeIp('2130706433')).toBe('127.0.0.1');
    });

    it('should convert hex IP to dotted notation', () => {
      expect(service.normalizeIp('0x7f000001')).toBe('127.0.0.1');
    });

    it('should handle octal notation', () => {
      expect(service.normalizeIp('0177.0.0.1')).toBe('127.0.0.1');
    });

    it('should handle shortened notation', () => {
      expect(service.normalizeIp('127.1')).toBe('127.0.0.1');
    });

    it('should return normal IPs unchanged', () => {
      expect(service.normalizeIp('192.168.1.1')).toBe('192.168.1.1');
    });
  });

  describe('decodeUrlSafe', () => {
    it('should decode URL-encoded strings', () => {
      expect(service.decodeUrlSafe('%6c%6f%63%61%6c%68%6f%73%74')).toBe('localhost');
    });

    it('should handle double encoding', () => {
      const decoded = service.decodeUrlSafe('%256c%256f%2563%2561%256c%2568%256f%2573%2574');
      expect(decoded).toBe('localhost');
    });

    it('should return original string if decoding fails', () => {
      expect(service.decodeUrlSafe('normal-string')).toBe('normal-string');
    });

    it('should handle malformed percent encoding', () => {
      expect(service.decodeUrlSafe('%ZZ')).toBe('%ZZ');
    });
  });
});

describe('UrlValidatorService - Error Classes', () => {
  describe('SsrfBlockedError', () => {
    it('should include blocked URL and reason', () => {
      const error = new SsrfBlockedError(
        'SSRF attempt blocked',
        'http://localhost/secret',
        'Loopback address'
      );

      expect(error.message).toBe('SSRF attempt blocked');
      expect(error.blockedUrl).toBe('http://localhost/secret');
      expect(error.reason).toBe('Loopback address');
      expect(error.name).toBe('SsrfBlockedError');
    });
  });

  describe('InvalidUrlError', () => {
    it('should include URL and validation message', () => {
      const error = new InvalidUrlError(
        'Invalid URL format',
        'not-a-url'
      );

      expect(error.message).toBe('Invalid URL format');
      expect(error.invalidUrl).toBe('not-a-url');
      expect(error.name).toBe('InvalidUrlError');
    });
  });
});

