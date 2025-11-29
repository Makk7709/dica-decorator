/**
 * @fileoverview ShareLinkService - Service de partage de projets
 * Génération et gestion de liens de partage sécurisés
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ExpirationPreset = '24h' | '7d' | '30d' | '90d' | 'never';

export interface ShareLinkConfig {
  baseUrl: string;
  pathPrefix: string;
  defaultExpiration: number; // days
  maxExpiration: number; // days
  tokenLength: number;
  allowPasswordProtection: boolean;
  trackViews: boolean;
}

export interface ShareLinkPermissions {
  canView: boolean;
  canDownload: boolean;
  canComment: boolean;
  canShare: boolean;
}

export interface ShareLinkData {
  token: string;
  url: string;
  projectId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  isPasswordProtected: boolean;
  passwordHash?: string;
  permissions: ShareLinkPermissions;
  metadata?: Record<string, any>;
  viewCount: number;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;
}

export interface ShareLinkValidation {
  valid: boolean;
  errors: string[];
  requiresPassword?: boolean;
}

export interface CreateShareLinkInput {
  projectId: string;
  createdBy: string;
  expirationDays?: number;
  expirationPreset?: ExpirationPreset;
  password?: string;
  permissions?: Partial<ShareLinkPermissions>;
  metadata?: Record<string, any>;
}

export interface AccessLogInput {
  ipAddress: string;
  userAgent?: string;
  referrer?: string;
}

export interface AccessLog {
  token: string;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  referrer?: string;
}

export interface ShareLinkStats {
  totalViews: number;
  uniqueVisitors: number;
  createdAt: Date;
  daysUntilExpiry: number | null;
  isActive: boolean;
  lastAccessedAt?: Date;
}

export interface BatchCreateInput {
  projectId: string;
  createdBy: string;
  count: number;
  expirationDays?: number;
  permissions?: Partial<ShareLinkPermissions>;
}

export interface ListLinksOptions {
  activeOnly?: boolean;
}

// ============================================================================
// Error Class
// ============================================================================

export class ShareLinkError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ShareLinkError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ShareLinkConfig = {
  baseUrl: 'https://dica.app',
  pathPrefix: '/p/',
  defaultExpiration: 7,
  maxExpiration: 90,
  tokenLength: 12,
  allowPasswordProtection: true,
  trackViews: true,
};

const DEFAULT_PERMISSIONS: ShareLinkPermissions = {
  canView: true,
  canDownload: true,
  canComment: false,
  canShare: false,
};

const EXPIRATION_PRESETS: Record<ExpirationPreset, number | null> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'never': null,
};

// ============================================================================
// Service Implementation
// ============================================================================

export class ShareLinkService {
  private config: ShareLinkConfig;
  private links: Map<string, ShareLinkData> = new Map();
  private accessLogs: Map<string, AccessLog[]> = new Map();
  private errorListeners: Array<(error: ShareLinkError) => void> = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  getConfig(): ShareLinkConfig {
    return { ...this.config };
  }

  configure(options: Partial<ShareLinkConfig>): void {
    if (options.tokenLength !== undefined) {
      if (options.tokenLength < 8 || options.tokenLength > 64) {
        throw new ShareLinkError('Token length must be between 8 and 64', 'INVALID_CONFIG');
      }
    }
    
    if (options.defaultExpiration !== undefined && options.defaultExpiration < 0) {
      throw new ShareLinkError('Default expiration must be non-negative', 'INVALID_CONFIG');
    }
    
    if (options.maxExpiration !== undefined && options.maxExpiration <= 0) {
      throw new ShareLinkError('Max expiration must be positive', 'INVALID_CONFIG');
    }
    
    this.config = { ...this.config, ...options };
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  // --------------------------------------------------------------------------
  // Token Generation Methods
  // --------------------------------------------------------------------------

  generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(this.config.tokenLength);
    crypto.getRandomValues(array);
    
    return Array.from(array)
      .map(x => chars[x % chars.length])
      .join('');
  }

  generateShareUrl(token: string): string {
    return `${this.config.baseUrl}${this.config.pathPrefix}${token}`;
  }

  // --------------------------------------------------------------------------
  // Share Link Creation Methods
  // --------------------------------------------------------------------------

  createShareLink(input: CreateShareLinkInput): ShareLinkData {
    if (!input.projectId || input.projectId.trim() === '') {
      throw new ShareLinkError('Project ID is required', 'INVALID_INPUT');
    }
    
    if (!input.createdBy || input.createdBy.trim() === '') {
      throw new ShareLinkError('Creator ID is required', 'INVALID_INPUT');
    }

    const token = this.generateToken();
    const expiresAt = this.calculateExpiration(input);
    
    let passwordHash: string | undefined;
    let isPasswordProtected = false;
    
    if (input.password) {
      if (!this.config.allowPasswordProtection) {
        throw new ShareLinkError('Password protection is disabled', 'PASSWORD_NOT_ALLOWED');
      }
      if (input.password.length < 6) {
        throw new ShareLinkError('Password must be at least 6 characters', 'WEAK_PASSWORD');
      }
      passwordHash = this.hashPassword(input.password);
      isPasswordProtected = true;
    }

    const link: ShareLinkData = {
      token,
      url: this.generateShareUrl(token),
      projectId: input.projectId,
      createdBy: input.createdBy,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      isPasswordProtected,
      passwordHash,
      permissions: { ...DEFAULT_PERMISSIONS, ...input.permissions },
      metadata: input.metadata,
      viewCount: 0,
    };

    this.links.set(token, link);
    this.accessLogs.set(token, []);
    
    return link;
  }

  private calculateExpiration(input: CreateShareLinkInput): Date | null {
    if (input.expirationPreset) {
      const days = EXPIRATION_PRESETS[input.expirationPreset];
      if (days === null) return null;
      return this.addDays(new Date(), Math.min(days, this.config.maxExpiration));
    }
    
    if (input.expirationDays !== undefined) {
      const cappedDays = Math.min(input.expirationDays, this.config.maxExpiration);
      return this.addDays(new Date(), cappedDays);
    }
    
    return this.addDays(new Date(), this.config.defaultExpiration);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private hashPassword(password: string): string {
    // Simple hash for demonstration - in production, use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  // --------------------------------------------------------------------------
  // Validation Methods
  // --------------------------------------------------------------------------

  validateLink(link: ShareLinkData, password?: string): ShareLinkValidation {
    const errors: string[] = [];
    
    // Check if revoked
    if (!link.isActive) {
      errors.push('link_revoked');
    }
    
    // Check expiration
    if (link.expiresAt && link.expiresAt < new Date()) {
      errors.push('link_expired');
    }
    
    // Check password
    const requiresPassword = link.isPasswordProtected;
    
    if (link.isPasswordProtected && password) {
      if (!this.verifyPassword(password, link.passwordHash!)) {
        errors.push('invalid_password');
      }
    }
    
    return {
      valid: errors.length === 0 && (!requiresPassword || password !== undefined),
      errors,
      requiresPassword,
    };
  }

  isValidTokenFormat(token: string): boolean {
    if (!token || token.length === 0) return false;
    return /^[a-zA-Z0-9]+$/.test(token);
  }

  // --------------------------------------------------------------------------
  // Link Management Methods
  // --------------------------------------------------------------------------

  revokeLink(link: ShareLinkData, revokedBy: string, reason?: string): ShareLinkData {
    link.isActive = false;
    link.revokedAt = new Date();
    link.revokedBy = revokedBy;
    link.revocationReason = reason;
    return link;
  }

  extendExpiration(link: ShareLinkData, additionalDays: number): ShareLinkData {
    const newExpiry = this.addDays(link.expiresAt || new Date(), additionalDays);
    const maxExpiry = this.addDays(new Date(), this.config.maxExpiration);
    
    link.expiresAt = newExpiry > maxExpiry ? maxExpiry : newExpiry;
    return link;
  }

  updatePermissions(link: ShareLinkData, permissions: Partial<ShareLinkPermissions>): ShareLinkData {
    link.permissions = { ...link.permissions, ...permissions };
    return link;
  }

  changePassword(link: ShareLinkData, newPassword: string): ShareLinkData {
    if (newPassword.length < 6) {
      throw new ShareLinkError('Password must be at least 6 characters', 'WEAK_PASSWORD');
    }
    link.passwordHash = this.hashPassword(newPassword);
    link.isPasswordProtected = true;
    return link;
  }

  removePassword(link: ShareLinkData): ShareLinkData {
    link.isPasswordProtected = false;
    link.passwordHash = undefined;
    return link;
  }

  // --------------------------------------------------------------------------
  // Access Tracking Methods
  // --------------------------------------------------------------------------

  logAccess(token: string, input: AccessLogInput): AccessLog {
    const log: AccessLog = {
      token,
      timestamp: new Date(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      referrer: input.referrer,
    };
    
    if (this.config.trackViews) {
      const logs = this.accessLogs.get(token) || [];
      logs.push(log);
      this.accessLogs.set(token, logs);
      
      const link = this.links.get(token);
      if (link) {
        link.viewCount++;
      }
    }
    
    return log;
  }

  getAccessHistory(token: string, limit?: number): AccessLog[] {
    const logs = this.accessLogs.get(token) || [];
    if (limit) {
      return logs.slice(0, limit);
    }
    return [...logs];
  }

  // --------------------------------------------------------------------------
  // Statistics Methods
  // --------------------------------------------------------------------------

  getStats(token: string): ShareLinkStats {
    const link = this.links.get(token);
    const logs = this.accessLogs.get(token) || [];
    
    const uniqueIps = new Set(logs.map(l => l.ipAddress));
    
    let daysUntilExpiry: number | null = null;
    if (link?.expiresAt) {
      const diff = link.expiresAt.getTime() - Date.now();
      daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    
    return {
      totalViews: logs.length,
      uniqueVisitors: uniqueIps.size,
      createdAt: link?.createdAt || new Date(),
      daysUntilExpiry,
      isActive: link?.isActive ?? false,
      lastAccessedAt: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // URL Parsing Methods
  // --------------------------------------------------------------------------

  extractTokenFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const expectedBase = new URL(this.config.baseUrl);
      
      if (urlObj.host !== expectedBase.host) {
        return null;
      }
      
      const path = urlObj.pathname;
      if (!path.startsWith(this.config.pathPrefix)) {
        return null;
      }
      
      const token = path.slice(this.config.pathPrefix.length).split(/[?#]/)[0];
      return token || null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Batch Operations Methods
  // --------------------------------------------------------------------------

  createBatchLinks(input: BatchCreateInput): ShareLinkData[] {
    const links: ShareLinkData[] = [];
    
    for (let i = 0; i < input.count; i++) {
      links.push(this.createShareLink({
        projectId: input.projectId,
        createdBy: input.createdBy,
        expirationDays: input.expirationDays,
        permissions: input.permissions,
      }));
    }
    
    return links;
  }

  revokeAllForProject(projectId: string, revokedBy: string): number {
    let count = 0;
    
    this.links.forEach((link, token) => {
      if (link.projectId === projectId && link.isActive) {
        this.revokeLink(link, revokedBy, 'Batch revocation');
        count++;
      }
    });
    
    return count;
  }

  getLinksForProject(projectId: string, options?: ListLinksOptions): ShareLinkData[] {
    const links: ShareLinkData[] = [];
    
    this.links.forEach(link => {
      if (link.projectId === projectId) {
        if (options?.activeOnly && !link.isActive) {
          return;
        }
        links.push(link);
      }
    });
    
    return links;
  }

  // --------------------------------------------------------------------------
  // Error Handling Methods
  // --------------------------------------------------------------------------

  onError(callback: (error: ShareLinkError) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) this.errorListeners.splice(index, 1);
    };
  }

  emitError(error: ShareLinkError): void {
    this.errorListeners.forEach(listener => listener(error));
  }
}

