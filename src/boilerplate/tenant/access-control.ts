/**
 * Tenant Access Control and Validation
 * 
 * Provides comprehensive access control mechanisms for multi-tenant architecture.
 */

import { NextRequest } from 'next/server';
import { TenantContext, TenantUser } from '../interfaces/tenant';

export interface AccessControlContext {
  tenant: TenantContext;
  user?: TenantUser;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface AccessRule {
  resource: string;
  actions: string[];
  roles: string[];
  conditions?: AccessCondition[];
}

export interface AccessCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'custom';
  value?: unknown;
  customValidator?: (context: AccessControlContext) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Tenant access control manager
 */
export class TenantAccessControl {
  private rules: Map<string, AccessRule[]> = new Map();
  private globalRules: AccessRule[] = [];

  /**
   * Add access rule for specific tenant
   */
  addTenantRule(tenantId: string, rule: AccessRule): void {
    const tenantRules = this.rules.get(tenantId) || [];
    tenantRules.push(rule);
    this.rules.set(tenantId, tenantRules);
  }

  /**
   * Add global access rule (applies to all tenants)
   */
  addGlobalRule(rule: AccessRule): void {
    this.globalRules.push(rule);
  }

  /**
   * Remove access rule for specific tenant
   */
  removeTenantRule(tenantId: string, resource: string, action: string): void {
    const tenantRules = this.rules.get(tenantId) || [];
    const filtered = tenantRules.filter(rule => 
      !(rule.resource === resource && rule.actions.includes(action))
    );
    this.rules.set(tenantId, filtered);
  }

  /**
   * Check if user has access to perform action on resource
   */
  async checkAccess(context: AccessControlContext): Promise<boolean> {
    const { tenant, user, resource, action } = context;

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return false;
    }

    // If no user provided, check tenant-level access only
    if (!user) {
      return this.checkTenantAccess(context);
    }

    // Check if user is active and belongs to tenant
    if (user.status !== 'active' || user.tenantId !== tenant.id) {
      return false;
    }

    // Get applicable rules
    const tenantRules = this.rules.get(tenant.id) || [];
    const allRules = [...this.globalRules, ...tenantRules];

    // Find matching rules
    const matchingRules = allRules.filter(rule => 
      this.matchesResource(rule.resource, resource) && 
      rule.actions.includes(action)
    );

    if (matchingRules.length === 0) {
      return false; // No rules defined = no access
    }

    // Check if user has required role and conditions are met
    for (const rule of matchingRules) {
      if (this.hasRequiredRole(user, rule.roles) && 
          await this.evaluateConditions(rule.conditions || [], context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check tenant-level access (without user context)
   */
  private checkTenantAccess(context: AccessControlContext): boolean {
    const { tenant, resource, action } = context;

    // Basic tenant status check
    if (tenant.status !== 'active') {
      return false;
    }

    // Check tenant features for resource access
    const featureKey = `access_${resource}`;
    if (tenant.features[featureKey] === false) {
      return false;
    }

    // Check tenant limits
    // This would typically integrate with usage tracking
    return true;
  }

  /**
   * Check if resource pattern matches
   */
  private matchesResource(pattern: string, resource: string): boolean {
    if (pattern === '*') return true;
    if (pattern === resource) return true;
    
    // Support wildcard patterns like "pages.*"
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return resource.startsWith(prefix);
    }
    
    return false;
  }

  /**
   * Check if user has required role
   */
  private hasRequiredRole(user: TenantUser, requiredRoles: string[]): boolean {
    if (requiredRoles.includes('*')) return true;
    return requiredRoles.includes(user.role);
  }

  /**
   * Evaluate access conditions
   */
  private async evaluateConditions(conditions: AccessCondition[], context: AccessControlContext): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate single access condition
   */
  private async evaluateCondition(condition: AccessCondition, context: AccessControlContext): Promise<boolean> {
    const { field, operator, value, customValidator } = condition;

    if (operator === 'custom' && customValidator) {
      return customValidator(context);
    }

    const fieldValue = this.getFieldValue(field, context);

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string, context: AccessControlContext): unknown {
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Get all permissions for user
   */
  async getUserPermissions(tenant: TenantContext, user: TenantUser): Promise<string[]> {
    const permissions: Set<string> = new Set();
    const tenantRules = this.rules.get(tenant.id) || [];
    const allRules = [...this.globalRules, ...tenantRules];

    for (const rule of allRules) {
      if (this.hasRequiredRole(user, rule.roles)) {
        for (const action of rule.actions) {
          permissions.add(`${rule.resource}:${action}`);
        }
      }
    }

    return Array.from(permissions);
  }
}

/**
 * Tenant validator for data integrity and business rules
 */
export class TenantValidator {
  /**
   * Validate tenant configuration
   */
  validateTenantConfig(tenant: TenantContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!tenant.id) errors.push('Tenant ID is required');
    if (!tenant.name) errors.push('Tenant name is required');

    // Domain validation
    if (tenant.domain && !this.isValidDomain(tenant.domain)) {
      errors.push('Invalid domain format');
    }

    // Subdomain validation
    if (tenant.subdomain && !this.isValidSubdomain(tenant.subdomain)) {
      errors.push('Invalid subdomain format');
    }

    // Settings validation
    const settingsValidation = this.validateTenantSettings(tenant.settings);
    errors.push(...settingsValidation.errors);
    warnings.push(...settingsValidation.warnings);

    // Limits validation
    const limitsValidation = this.validateTenantLimits(tenant.limits);
    errors.push(...limitsValidation.errors);
    warnings.push(...limitsValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tenant settings
   */
  validateTenantSettings(settings: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (settings.localization) {
      if (!settings.localization.defaultLocale) {
        errors.push('Default locale is required');
      }
      
      if (!Array.isArray(settings.localization.supportedLocales)) {
        errors.push('Supported locales must be an array');
      }
    }

    if (settings.theme) {
      if (settings.theme.primaryColor && !this.isValidColor(settings.theme.primaryColor)) {
        warnings.push('Invalid primary color format');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate tenant limits
   */
  validateTenantLimits(limits: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (limits) {
      const numericFields = ['maxUsers', 'maxPages', 'maxBlocks', 'maxComponents', 'maxStorage', 'maxApiRequests', 'maxBandwidth'];
      
      for (const field of numericFields) {
        if (limits[field] !== undefined && (typeof limits[field] !== 'number' || limits[field] < 0)) {
          errors.push(`${field} must be a non-negative number`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  /**
   * Validate subdomain format
   */
  private isValidSubdomain(subdomain: string): boolean {
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;
    return subdomainRegex.test(subdomain);
  }

  /**
   * Validate color format (hex, rgb, etc.)
   */
  private isValidColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
    
    return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
  }
}

/**
 * Middleware for tenant access control
 */
export class TenantAccessMiddleware {
  private accessControl: TenantAccessControl;
  private validator: TenantValidator;

  constructor(accessControl: TenantAccessControl, validator: TenantValidator) {
    this.accessControl = accessControl;
    this.validator = validator;
  }

  /**
   * Create middleware function for Next.js API routes
   */
  createMiddleware() {
    return async (request: NextRequest, context: { tenant: TenantContext; user?: TenantUser }) => {
      const { tenant, user } = context;

      // Validate tenant
      const validation = this.validator.validateTenantConfig(tenant);
      if (!validation.valid) {
        throw new Error(`Invalid tenant configuration: ${validation.errors.join(', ')}`);
      }

      // Extract resource and action from request
      const resource = this.extractResource(request);
      const action = this.extractAction(request);

      // Check access
      const accessContext: AccessControlContext = {
        tenant,
        user,
        resource,
        action,
        metadata: {
          ip: request.ip,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      };

      const hasAccess = await this.accessControl.checkAccess(accessContext);
      if (!hasAccess) {
        throw new Error(`Access denied: ${action} on ${resource}`);
      }

      return { tenant, user, resource, action };
    };
  }

  /**
   * Extract resource from request path
   */
  private extractResource(request: NextRequest): string {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract resource from API path like /api/cms/pages -> pages
    if (pathSegments.length >= 3 && pathSegments[0] === 'api' && pathSegments[1] === 'cms') {
      return pathSegments[2];
    }
    
    return 'unknown';
  }

  /**
   * Extract action from request method
   */
  private extractAction(request: NextRequest): string {
    const method = request.method.toLowerCase();
    
    switch (method) {
      case 'get':
        return 'read';
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return method;
    }
  }
}

/**
 * Default access rules for common resources
 */
export const DefaultAccessRules = {
  admin: [
    { resource: '*', actions: ['*'], roles: ['admin'] },
  ],
  
  editor: [
    { resource: 'pages', actions: ['read', 'create', 'update'], roles: ['editor', 'admin'] },
    { resource: 'blocks', actions: ['read', 'create', 'update'], roles: ['editor', 'admin'] },
    { resource: 'components', actions: ['read'], roles: ['editor', 'admin'] },
    { resource: 'seo', actions: ['read', 'update'], roles: ['editor', 'admin'] },
  ],
  
  viewer: [
    { resource: 'pages', actions: ['read'], roles: ['viewer', 'editor', 'admin'] },
    { resource: 'blocks', actions: ['read'], roles: ['viewer', 'editor', 'admin'] },
    { resource: 'components', actions: ['read'], roles: ['viewer', 'editor', 'admin'] },
    { resource: 'seo', actions: ['read'], roles: ['viewer', 'editor', 'admin'] },
  ],
};

/**
 * Factory function to create access control with default rules
 */
export function createTenantAccessControl(): TenantAccessControl {
  const accessControl = new TenantAccessControl();
  
  // Add default global rules
  [...DefaultAccessRules.admin, ...DefaultAccessRules.editor, ...DefaultAccessRules.viewer]
    .forEach(rule => accessControl.addGlobalRule(rule));
  
  return accessControl;
}