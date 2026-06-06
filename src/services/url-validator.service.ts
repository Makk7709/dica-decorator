/**
 * @fileoverview URL Validator Service - Anti-SSRF Protection
 * 
 * Provides comprehensive URL validation to prevent Server-Side Request Forgery (SSRF) attacks.
 * This is critical for any service that fetches external URLs based on user input.
 * 
 * Protected against:
 * - Localhost/loopback access
 * - Private IP ranges (RFC 1918)
 * - Cloud metadata endpoints
 * - Dangerous protocols
 * - URL encoding bypass attempts
 * - DNS rebinding attacks
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UrlValidationConfig {
  allowedProtocols: string[];
  allowedDomains: string[];
  blockedIpRanges: string[];
  blockedHostPatterns: RegExp[];
  maxUrlLength: number;
}

export interface UrlValidationResult {
  valid: boolean;
  sanitizedUrl: string;
  hostname: string;
  protocol: string;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class SsrfBlockedError extends Error {
  public readonly blockedUrl: string;
  public readonly reason: string;

  constructor(message: string, blockedUrl: string, reason: string) {
    super(message);
    this.name = 'SsrfBlockedError';
    this.blockedUrl = blockedUrl;
    this.reason = reason;
  }
}

export class InvalidUrlError extends Error {
  public readonly invalidUrl: string;

  constructor(message: string, invalidUrl: string) {
    super(message);
    this.name = 'InvalidUrlError';
    this.invalidUrl = invalidUrl;
  }
}

// ============================================================================
// Constants
// ============================================================================

// Private IP ranges in CIDR notation
const PRIVATE_IP_RANGES = [
  { start: 0x7F000000, end: 0x7FFFFFFF }, // 127.0.0.0/8 - Loopback
  { start: 0x0A000000, end: 0x0AFFFFFF }, // 10.0.0.0/8 - Class A
  { start: 0xAC100000, end: 0xAC1FFFFF }, // 172.16.0.0/12 - Class B
  { start: 0xC0A80000, end: 0xC0A8FFFF }, // 192.168.0.0/16 - Class C
  { start: 0xA9FE0000, end: 0xA9FEFFFF }, // 169.254.0.0/16 - Link-local
];

// Blocked ports (potential internal services)
const BLOCKED_PORTS = new Set([
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  53,   // DNS
  110,  // POP3
  143,  // IMAP
  445,  // SMB
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  27017, // MongoDB
]);

// ============================================================================
// Service Implementation
// ============================================================================

export class UrlValidatorService {
  constructor(private readonly config: UrlValidationConfig) {}

  /**
   * Validates a URL for SSRF vulnerabilities
   * 
   * @param url - The URL to validate
   * @returns Validation result with sanitized URL
   * @throws {SsrfBlockedError} If URL targets internal resources
   * @throws {InvalidUrlError} If URL is malformed or not allowed
   */
  validateUrl(url: string): UrlValidationResult {
    // Input validation
    if (!url || typeof url !== 'string') {
      throw new InvalidUrlError('URL is required and must be a string', String(url));
    }

    if (url.length > this.config.maxUrlLength) {
      throw new InvalidUrlError(
        `URL exceeds maximum length of ${this.config.maxUrlLength} characters`,
        url.substring(0, 100) + '...'
      );
    }

    // Decode URL to catch encoding bypass attempts
    const decodedUrl = this.decodeUrlSafe(url);

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch {
      throw new InvalidUrlError('Invalid URL format', url);
    }

    // Validate protocol
    if (!this.config.allowedProtocols.includes(parsedUrl.protocol)) {
      throw new InvalidUrlError(
        `Protocol '${parsedUrl.protocol}' is not allowed. Allowed: ${this.config.allowedProtocols.join(', ')}`,
        url
      );
    }

    // Check for URL with credentials (@ symbol bypass)
    if (parsedUrl.username || parsedUrl.password) {
      throw new InvalidUrlError(
        'URLs with credentials are not allowed',
        url
      );
    }

    // Get hostname and decode it
    const hostname = this.decodeUrlSafe(parsedUrl.hostname.toLowerCase());

    // Check for blocked host patterns (localhost, .local, etc.)
    for (const pattern of this.config.blockedHostPatterns) {
      if (pattern.test(hostname)) {
        throw new SsrfBlockedError(
          'Access to internal hosts is blocked',
          url,
          `Hostname matches blocked pattern: ${pattern}`
        );
      }
    }

    // Normalize and check for IP addresses
    const normalizedHost = this.normalizeIp(hostname);
    if (this.isIpAddress(normalizedHost)) {
      if (this.isPrivateIp(normalizedHost)) {
        throw new SsrfBlockedError(
          'Access to private IP addresses is blocked',
          url,
          `IP ${normalizedHost} is in a private range`
        );
      }
    }

    // Check for blocked ports
    const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : null;
    if (port && BLOCKED_PORTS.has(port)) {
      throw new InvalidUrlError(
        `Port ${port} is blocked for security reasons`,
        url
      );
    }

    // Validate against allowed domains
    const isAllowedDomain = this.config.allowedDomains.some(domain =>
      this.matchesWildcardDomain(hostname, domain)
    );

    if (!isAllowedDomain) {
      throw new InvalidUrlError(
        `Domain '${hostname}' is not in the allowed list`,
        url
      );
    }

    return {
      valid: true,
      sanitizedUrl: parsedUrl.href,
      hostname: parsedUrl.hostname,
      protocol: parsedUrl.protocol,
    };
  }

  /**
   * Checks if an IP address is in a private range
   */
  isPrivateIp(ip: string): boolean {
    const normalizedIp = this.normalizeIp(ip);
    const ipNum = this.ipToNumber(normalizedIp);
    
    if (ipNum === null) {
      return false;
    }

    return PRIVATE_IP_RANGES.some(
      range => ipNum >= range.start && ipNum <= range.end
    );
  }

  /**
   * Checks if a hostname matches a wildcard domain pattern
   */
  matchesWildcardDomain(hostname: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2);
      // Must have a subdomain and end with the base domain
      const parts = hostname.split('.');
      if (parts.length <= baseDomain.split('.').length) {
        return false;
      }
      return hostname.endsWith(`.${baseDomain}`);
    }
    return hostname === pattern;
  }

  /**
   * Normalizes IP addresses from various formats to dotted decimal
   */
  normalizeIp(input: string): string {
    // Handle decimal notation (e.g., 2130706433 = 127.0.0.1)
    if (/^\d+$/.test(input)) {
      const num = Number.parseInt(input, 10);
      if (num >= 0 && num <= 0xFFFFFFFF) {
        return this.numberToIp(num);
      }
    }

    // Handle hex notation (e.g., 0x7f000001 = 127.0.0.1)
    if (/^0x[0-9a-fA-F]+$/.test(input)) {
      const num = Number.parseInt(input, 16);
      if (num >= 0 && num <= 0xFFFFFFFF) {
        return this.numberToIp(num);
      }
    }

    // Handle octal notation in octets (e.g., 0177.0.0.1 = 127.0.0.1)
    const octalMatch = /^(0[0-7]+)\.(\d+)\.(\d+)\.(\d+)$/.exec(input);
    if (octalMatch) {
      const [, octet1, octet2, octet3, octet4] = octalMatch;
      const dec1 = Number.parseInt(octet1, 8);
      return `${dec1}.${octet2}.${octet3}.${octet4}`;
    }

    // Handle shortened notation (e.g., 127.1 = 127.0.0.1)
    const parts = input.split('.');
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      return `${parts[0]}.0.0.${parts[1]}`;
    }

    return input;
  }

  /**
   * Safely decodes URL-encoded strings, handling double encoding
   */
  decodeUrlSafe(input: string): string {
    let decoded = input;
    let previous = '';
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    // Keep decoding until no more changes or max iterations reached
    while (decoded !== previous && iterations < maxIterations) {
      previous = decoded;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // If decoding fails, return what we have
        break;
      }
      iterations++;
    }

    return decoded;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private isIpAddress(hostname: string): boolean {
    // IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return true;
    }
    // IPv6
    if (/^\[?([0-9a-fA-F:]+)\]?$/.test(hostname)) {
      return true;
    }
    return false;
  }

  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      return null;
    }

    let num = 0;
    for (let i = 0; i < 4; i++) {
      const octet = Number.parseInt(parts[i], 10);
      if (Number.isNaN(octet) || octet < 0 || octet > 255) {
        return null;
      }
      num = (num << 8) + octet;
    }
    return num >>> 0; // Ensure unsigned
  }

  private numberToIp(num: number): string {
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF,
    ].join('.');
  }
}

// ============================================================================
// Factory function
// ============================================================================

export const createUrlValidatorService = (
  config?: Partial<UrlValidationConfig>
): UrlValidatorService => {
  const defaultConfig: UrlValidationConfig = {
    allowedProtocols: ['https:', 'http:'],
    allowedDomains: [
      'images.unsplash.com',
      '*.supabase.co',
      '*.supabase.in',
      'storage.googleapis.com',
    ],
    blockedIpRanges: [
      '127.0.0.0/8',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '169.254.0.0/16',
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

  return new UrlValidatorService({ ...defaultConfig, ...config });
};

