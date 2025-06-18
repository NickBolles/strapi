/**
 * Security and Authentication Manager for MCP Conductor
 * Handles credential storage, encryption, and access control
 */

import { EventEmitter } from 'events';
import { createHash, createCipher, createDecipher, randomBytes } from 'crypto';
import { Logger } from 'winston';
import { ConductorConfig, SecurityContext, AuditLogEntry } from '@/core/interfaces';
import { createLogger } from '@/utils/logger';

/**
 * Security manager for handling authentication and authorization
 */
export class SecurityManager extends EventEmitter {
  private readonly logger: Logger;
  private readonly auditLogs: AuditLogEntry[] = [];
  private encryptionKey: string | null = null;
  private config: ConductorConfig | null = null;

  constructor() {
    super();
    this.logger = createLogger('SecurityManager');
  }

  /**
   * Initialize the security manager
   */
  async initialize(config: ConductorConfig): Promise<void> {
    this.config = config;
    
    // Initialize encryption key
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    
    if (!process.env.ENCRYPTION_KEY) {
      this.logger.warn('No ENCRYPTION_KEY environment variable set. Generated a temporary key.');
      this.logger.warn('For production use, set ENCRYPTION_KEY environment variable.');
    }

    this.logger.info('Security manager initialized');
  }

  /**
   * Start the security manager
   */
  async start(): Promise<void> {
    this.logger.info('Security manager started');
  }

  /**
   * Stop the security manager
   */
  async stop(): Promise<void> {
    this.logger.info('Security manager stopped');
  }

  /**
   * Generate a random encryption key
   */
  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const cipher = createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get credentials for a server
   */
  async getCredentials(serverId: string): Promise<Record<string, string>> {
    if (!this.config) {
      throw new Error('Security manager not initialized');
    }

    const server = this.config.servers.find(s => s.id === serverId);
    if (!server || !server.auth?.credentials) {
      return {};
    }

    const credentials: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(server.auth.credentials)) {
      try {
        // Try to decrypt the value (it might be encrypted)
        credentials[key] = this.decrypt(value);
      } catch {
        // If decryption fails, assume it's plain text (for backward compatibility)
        credentials[key] = value;
      }
    }

    return credentials;
  }

  /**
   * Store encrypted credentials for a server
   */
  async storeCredentials(serverId: string, credentials: Record<string, string>): Promise<void> {
    if (!this.config) {
      throw new Error('Security manager not initialized');
    }

    const server = this.config.servers.find(s => s.id === serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (!server.auth) {
      server.auth = { type: 'none' };
    }

    // Encrypt all credential values
    const encryptedCredentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      encryptedCredentials[key] = this.encrypt(value);
    }

    server.auth.credentials = encryptedCredentials;

    this.auditLog({
      timestamp: new Date(),
      action: 'credentials:store',
      resource: serverId,
      source: 'security-manager',
      success: true
    });

    this.logger.info(`Credentials stored for server: ${serverId}`);
  }

  /**
   * Check if a security context has a specific permission
   */
  hasPermission(context: SecurityContext, permission: string): boolean {
    // For now, implement a simple permission system
    // In a real implementation, this would check against a more sophisticated RBAC system
    
    if (!context.permissions) {
      return false;
    }

    // Check for exact permission match
    if (context.permissions.includes(permission)) {
      return true;
    }

    // Check for wildcard permissions
    const permissionParts = permission.split(':');
    for (let i = permissionParts.length - 1; i >= 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i).join(':') + ':*';
      if (context.permissions.includes(wildcardPermission)) {
        return true;
      }
    }

    // Check for admin permission
    if (context.permissions.includes('admin:*')) {
      return true;
    }

    return false;
  }

  /**
   * Create a security context for a user/session
   */
  createSecurityContext(
    userId?: string,
    sessionId?: string,
    permissions: string[] = [],
    source: SecurityContext['source'] = 'api'
  ): SecurityContext {
    return {
      userId,
      sessionId: sessionId || this.generateSessionId(),
      permissions,
      source
    };
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Hash a password
   */
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(password + salt).digest('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) {
      return false;
    }

    const computedHash = createHash('sha256').update(password + salt).digest('hex');
    return computedHash === hash;
  }

  /**
   * Add an audit log entry
   */
  auditLog(entry: Omit<AuditLogEntry, 'timestamp'> & { timestamp?: Date }): void {
    const logEntry: AuditLogEntry = {
      timestamp: new Date(),
      ...entry
    };

    this.auditLogs.push(logEntry);

    // Keep only the last 10000 entries in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs.splice(0, this.auditLogs.length - 10000);
    }

    // Log to winston as well
    this.logger.info('Audit log entry', logEntry);

    // TODO: Persist audit logs to database/file
  }

  /**
   * Get audit logs
   */
  getAuditLogs(
    limit = 100,
    offset = 0,
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      success?: boolean;
      since?: Date;
    }
  ): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    // Apply filters
    if (filters) {
      logs = logs.filter(log => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.action && !log.action.includes(filters.action)) return false;
        if (filters.resource && !log.resource.includes(filters.resource)) return false;
        if (filters.success !== undefined && log.success !== filters.success) return false;
        if (filters.since && log.timestamp < filters.since) return false;
        return true;
      });
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    return logs.slice(offset, offset + limit);
  }

  /**
   * Validate API key (placeholder implementation)
   */
  validateApiKey(apiKey: string): SecurityContext | null {
    // TODO: Implement proper API key validation
    // For now, return a basic context for any non-empty key
    if (!apiKey) {
      return null;
    }

    return this.createSecurityContext(
      'api-user',
      undefined,
      ['tool:execute', 'resource:read', 'workflow:execute'],
      'api'
    );
  }

  /**
   * Validate web session (placeholder implementation)
   */
  validateWebSession(sessionId: string): SecurityContext | null {
    // TODO: Implement proper session validation
    // For now, return a basic context for any non-empty session
    if (!sessionId) {
      return null;
    }

    return this.createSecurityContext(
      'web-user',
      sessionId,
      ['tool:execute', 'resource:read', 'workflow:execute', 'admin:read'],
      'web'
    );
  }
}

