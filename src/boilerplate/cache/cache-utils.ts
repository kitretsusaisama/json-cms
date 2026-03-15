/**
 * Cache Utilities
 * 
 * Utility functions for cache operations including compression, serialization,
 * key generation, and pattern matching.
 */

import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

export class CacheUtils {
  /**
   * Generate cache key from object or string
   */
  generateKey(input: unknown, prefix?: string): string {
    let keyData: string;
    
    if (typeof input === 'string') {
      keyData = input;
    } else {
      keyData = JSON.stringify(input, this.sortObjectKeys);
    }
    
    const hash = createHash('sha256').update(keyData).digest('hex').substring(0, 16);
    
    return prefix ? `${prefix}:${hash}` : hash;
  }

  /**
   * Generate cache key for content
   */
  generateContentKey(
    contentType: string,
    contentId: string,
    context?: Record<string, unknown>
  ): string {
    const keyParts = [contentType, contentId];
    
    if (context) {
      const contextHash = this.generateKey(context);
      keyParts.push(contextHash);
    }
    
    return keyParts.join(':');
  }

  /**
   * Generate cache key for user-specific content
   */
  generateUserKey(
    userId: string,
    resource: string,
    params?: Record<string, unknown>
  ): string {
    const keyParts = ['user', userId, resource];
    
    if (params) {
      const paramsHash = this.generateKey(params);
      keyParts.push(paramsHash);
    }
    
    return keyParts.join(':');
  }

  /**
   * Generate cache key for tenant-specific content
   */
  generateTenantKey(
    tenantId: string,
    resource: string,
    params?: Record<string, unknown>
  ): string {
    const keyParts = ['tenant', tenantId, resource];
    
    if (params) {
      const paramsHash = this.generateKey(params);
      keyParts.push(paramsHash);
    }
    
    return keyParts.join(':');
  }

  /**
   * Generate cache key for API response
   */
  generateAPIKey(
    method: string,
    path: string,
    query?: Record<string, unknown>,
    headers?: Record<string, string>
  ): string {
    const keyParts = ['api', method.toLowerCase(), path.replace(/\//g, '_')];
    
    if (query && Object.keys(query).length > 0) {
      const queryHash = this.generateKey(query);
      keyParts.push(`q:${queryHash}`);
    }
    
    if (headers) {
      // Only include specific headers that affect response
      const relevantHeaders = ['accept', 'accept-language', 'authorization'];
      const headerData: Record<string, string> = {};
      
      relevantHeaders.forEach(header => {
        if (headers[header]) {
          headerData[header] = headers[header];
        }
      });
      
      if (Object.keys(headerData).length > 0) {
        const headerHash = this.generateKey(headerData);
        keyParts.push(`h:${headerHash}`);
      }
    }
    
    return keyParts.join(':');
  }

  /**
   * Check if pattern matches key
   */
  matchesPattern(pattern: string, key: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*') && !pattern.includes('?')) return pattern === key;
    
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    
    return regex.test(key);
  }

  /**
   * Check if tags match
   */
  hasMatchingTags(entryTags: string[], targetTags: string[]): boolean {
    return targetTags.some(tag => entryTags.includes(tag));
  }

  /**
   * Compress string data
   */
  compress(data: string): string {
    try {
      const compressed = gzipSync(Buffer.from(data, 'utf8'));
      return compressed.toString('base64');
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  /**
   * Decompress string data
   */
  decompress(data: string): string {
    try {
      const buffer = Buffer.from(data, 'base64');
      const decompressed = gunzipSync(buffer);
      return decompressed.toString('utf8');
    } catch (error) {
      console.error('Decompression failed:', error);
      return data;
    }
  }

  /**
   * Calculate data size in bytes
   */
  calculateSize(data: unknown): number {
    if (data === null || data === undefined) return 0;
    
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    
    if (typeof data === 'number') {
      return 8; // 64-bit number
    }
    
    if (typeof data === 'boolean') {
      return 1;
    }
    
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    
    // For objects and arrays, serialize and measure
    try {
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, 'utf8');
    } catch (error) {
      console.error('Failed to calculate size:', error);
      return 0;
    }
  }

  /**
   * Format cache size for display
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Parse TTL string to milliseconds
   */
  parseTTL(ttl: string | number): number {
    if (typeof ttl === 'number') {
      return ttl;
    }
    
    const match = ttl.match(/^(\d+)([smhd]?)$/);
    if (!match) {
      throw new Error(`Invalid TTL format: ${ttl}`);
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid TTL unit: ${unit}`);
    }
  }

  /**
   * Generate cache tags for content
   */
  generateContentTags(
    contentType: string,
    contentId: string,
    metadata?: Record<string, unknown>
  ): string[] {
    const tags = [
      `type:${contentType}`,
      `id:${contentId}`,
      `content:${contentType}:${contentId}`
    ];
    
    if (metadata) {
      // Add tags based on metadata
      if (metadata.category) {
        tags.push(`category:${metadata.category}`);
      }
      
      if (metadata.author) {
        tags.push(`author:${metadata.author}`);
      }
      
      if (metadata.tenantId) {
        tags.push(`tenant:${metadata.tenantId}`);
      }
      
      if (metadata.status) {
        tags.push(`status:${metadata.status}`);
      }
    }
    
    return tags;
  }

  /**
   * Generate cache tags for user
   */
  generateUserTags(userId: string, roles?: string[]): string[] {
    const tags = [`user:${userId}`];
    
    if (roles) {
      roles.forEach(role => {
        tags.push(`role:${role}`);
      });
    }
    
    return tags;
  }

  /**
   * Generate cache tags for tenant
   */
  generateTenantTags(tenantId: string, features?: string[]): string[] {
    const tags = [`tenant:${tenantId}`];
    
    if (features) {
      features.forEach(feature => {
        tags.push(`feature:${feature}`);
      });
    }
    
    return tags;
  }

  /**
   * Validate cache key
   */
  validateKey(key: string): boolean {
    // Check key length
    if (key.length === 0 || key.length > 250) {
      return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[\s\n\r\t\0]/;
    if (invalidChars.test(key)) {
      return false;
    }
    
    return true;
  }

  /**
   * Sanitize cache key
   */
  sanitizeKey(key: string): string {
    return key
      .replace(/[\s\n\r\t\0]/g, '_')
      .substring(0, 250);
  }

  /**
   * Sort object keys for consistent serialization
   */
  private sortObjectKeys(key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      Object.keys(value as Record<string, unknown>)
        .sort()
        .forEach(k => {
          sorted[k] = (value as Record<string, unknown>)[k];
        });
      return sorted;
    }
    return value;
  }

  /**
   * Create cache key with timestamp for versioning
   */
  createVersionedKey(baseKey: string, version?: string | number): string {
    const versionStr = version?.toString() || Date.now().toString();
    return `${baseKey}:v:${versionStr}`;
  }

  /**
   * Extract version from versioned key
   */
  extractVersion(versionedKey: string): string | null {
    const match = versionedKey.match(/:v:(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Remove version from versioned key
   */
  removeVersion(versionedKey: string): string {
    return versionedKey.replace(/:v:.+$/, '');
  }

  /**
   * Generate cache warming priority score
   */
  calculateWarmingPriority(
    accessCount: number,
    lastAccessed: number,
    contentType: string,
    userRole?: string
  ): number {
    let score = 0;
    
    // Base score from access count
    score += Math.log(accessCount + 1) * 10;
    
    // Recency bonus
    const hoursSinceAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60);
    score += Math.max(0, 24 - hoursSinceAccess) * 2;
    
    // Content type bonus
    const contentTypeScores: Record<string, number> = {
      'page': 10,
      'block': 8,
      'component': 6,
      'asset': 4,
      'config': 2
    };
    score += contentTypeScores[contentType] || 1;
    
    // User role bonus
    const roleScores: Record<string, number> = {
      'admin': 5,
      'editor': 3,
      'viewer': 1
    };
    if (userRole) {
      score += roleScores[userRole] || 0;
    }
    
    return Math.round(score);
  }
}