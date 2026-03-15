/**
 * Tenant-Aware Content Provider
 * Handles tenant-specific content loading and data isolation
 */

import { TenantContext } from "../interfaces/tenant";
import { AuthContext } from "../interfaces/auth";
import { ContentProvider, ContentFilters, PageData, BlockData, SEOData, ContentType, ContentList } from "../interfaces/content-provider";

export interface TenantContentProvider extends ContentProvider {
  /**
   * Get content with tenant isolation
   */
  getTenantContent<T>(
    type: ContentType,
    id: string,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<T | null>;

  /**
   * Set content with tenant isolation
   */
  setTenantContent<T>(
    type: ContentType,
    id: string,
    data: T,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<void>;

  /**
   * List content with tenant filtering
   */
  listTenantContent(
    type: ContentType,
    tenantContext: TenantContext,
    filters?: ContentFilters,
    authContext?: AuthContext
  ): Promise<ContentList>;

  /**
   * Check if user has access to content
   */
  checkContentAccess(
    type: ContentType,
    id: string,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<boolean>;
}

export interface RequestContext {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
  userPermissions?: string[];
  locale?: string;
  preview?: boolean;
}

/**
 * Enhanced Content Provider with tenant awareness
 */
export class EnhancedTenantContentProvider implements TenantContentProvider {
  constructor(private baseProvider: ContentProvider) {}

  /**
   * Get page with tenant context
   */
  async getPage(slug: string, context: RequestContext): Promise<PageData> {
    // Apply tenant-specific slug resolution
    const tenantSlug = this.resolveTenantSlug(slug, context.tenantId);
    
    // Get base page data
    const pageData = await this.baseProvider.getPage(tenantSlug, context);
    
    // Apply tenant-specific transformations
    return this.applyTenantTransformations(pageData, context);
  }

  /**
   * Get block with tenant context
   */
  async getBlock(id: string, context: RequestContext): Promise<BlockData> {
    // Apply tenant-specific block resolution
    const tenantBlockId = this.resolveTenantBlockId(id, context.tenantId);
    
    // Get base block data
    const blockData = await this.baseProvider.getBlock(tenantBlockId, context);
    
    // Apply tenant-specific transformations
    return this.applyTenantBlockTransformations(blockData, context);
  }

  /**
   * Get SEO data with tenant context
   */
  async getSEO(type: string, id: string): Promise<SEOData> {
    // For now, delegate to base provider
    // TODO: Add tenant-specific SEO handling
    return this.baseProvider.getSEO(type, id);
  }

  /**
   * Set content with tenant isolation
   */
  async setContent(type: ContentType, id: string, data: unknown): Promise<void> {
    // For now, delegate to base provider
    // TODO: Add tenant-specific content setting
    return this.baseProvider.setContent(type, id, data);
  }

  /**
   * Delete content with tenant isolation
   */
  async deleteContent(type: ContentType, id: string): Promise<void> {
    // For now, delegate to base provider
    // TODO: Add tenant-specific content deletion
    return this.baseProvider.deleteContent(type, id);
  }

  /**
   * List content with tenant filtering
   */
  async listContent(type: ContentType, filters?: ContentFilters): Promise<ContentList> {
    // For now, delegate to base provider
    // TODO: Add tenant-specific content listing
    return this.baseProvider.listContent(type, filters);
  }

  /**
   * Get content with tenant isolation
   */
  async getTenantContent<T>(
    type: ContentType,
    id: string,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<T | null> {
    // Check access permissions
    const hasAccess = await this.checkContentAccess(type, id, tenantContext, authContext);
    if (!hasAccess) {
      return null;
    }

    // Apply tenant-specific ID resolution
    const tenantId = this.resolveTenantContentId(type, id, tenantContext.id);
    
    // Get content based on type
    switch (type) {
      case 'page':
        return this.getPage(tenantId, {
          tenantId: tenantContext.id,
          userId: authContext?.user?.id,
          userRoles: authContext?.roles,
          userPermissions: authContext?.permissions
        }) as Promise<T>;
      
      case 'block':
        return this.getBlock(tenantId, {
          tenantId: tenantContext.id,
          userId: authContext?.user?.id,
          userRoles: authContext?.roles,
          userPermissions: authContext?.permissions
        }) as Promise<T>;
      
      case 'seo':
        return this.getSEO('page', tenantId) as Promise<T>;
      
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  /**
   * Set content with tenant isolation
   */
  async setTenantContent<T>(
    type: ContentType,
    id: string,
    data: T,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<void> {
    // Check write permissions
    const hasWriteAccess = await this.checkWriteAccess(type, tenantContext, authContext);
    if (!hasWriteAccess) {
      throw new Error('Insufficient permissions to write content');
    }

    // Apply tenant-specific ID resolution
    const tenantId = this.resolveTenantContentId(type, id, tenantContext.id);
    
    // Add tenant metadata to data
    const tenantData = this.addTenantMetadata(data, tenantContext, authContext);
    
    return this.setContent(type, tenantId, tenantData);
  }

  /**
   * List content with tenant filtering
   */
  async listTenantContent(
    type: ContentType,
    tenantContext: TenantContext,
    filters?: ContentFilters,
    authContext?: AuthContext
  ): Promise<ContentList> {
    // Apply tenant-specific filters
    const tenantFilters: ContentFilters = {
      ...filters,
      tenantId: tenantContext.id,
      // Apply user-specific filters based on permissions
      ...(authContext && this.getUserContentFilters(authContext))
    };

    return this.listContent(type, tenantFilters);
  }

  /**
   * Check if user has access to content
   */
  async checkContentAccess(
    type: ContentType,
    id: string,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<boolean> {
    // Check tenant limits
    if (!this.checkTenantLimits(tenantContext, type)) {
      return false;
    }

    // Check user permissions
    if (authContext) {
      const requiredPermission = this.getRequiredPermission(type, 'read');
      if (!authContext.permissions.includes(requiredPermission)) {
        return false;
      }
    }

    // Check content-specific access rules
    return this.checkContentSpecificAccess(type, id, tenantContext, authContext);
  }

  /**
   * Check write access permissions
   */
  private async checkWriteAccess(
    type: ContentType,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<boolean> {
    // Check tenant limits
    if (!this.checkTenantLimits(tenantContext, type)) {
      return false;
    }

    // Check user permissions
    if (authContext) {
      const requiredPermission = this.getRequiredPermission(type, 'write');
      if (!authContext.permissions.includes(requiredPermission)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Resolve tenant-specific slug
   */
  private resolveTenantSlug(slug: string, tenantId?: string): string {
    if (!tenantId || tenantId === 'default') {
      return slug;
    }
    
    // Check if slug already has tenant prefix
    if (slug.startsWith(`tenant-${tenantId}/`)) {
      return slug;
    }
    
    return `tenant-${tenantId}/${slug}`;
  }

  /**
   * Resolve tenant-specific block ID
   */
  private resolveTenantBlockId(blockId: string, tenantId?: string): string {
    if (!tenantId || tenantId === 'default') {
      return blockId;
    }
    
    // Check if block ID already has tenant prefix
    if (blockId.startsWith(`tenant-${tenantId}-`)) {
      return blockId;
    }
    
    return `tenant-${tenantId}-${blockId}`;
  }

  /**
   * Resolve tenant-specific content ID
   */
  private resolveTenantContentId(type: ContentType, id: string, tenantId: string): string {
    switch (type) {
      case 'page':
        return this.resolveTenantSlug(id, tenantId);
      case 'block':
        return this.resolveTenantBlockId(id, tenantId);
      default:
        return `tenant-${tenantId}-${id}`;
    }
  }

  /**
   * Apply tenant-specific transformations to page data
   */
  private applyTenantTransformations(pageData: PageData, context: RequestContext): PageData {
    // Apply tenant-specific settings
    const transformedData = { ...pageData };
    
    // Apply tenant branding if available
    if (context.tenantId) {
      // TODO: Apply tenant-specific branding, themes, etc.
    }
    
    // Apply user-specific personalization
    if (context.userId) {
      // TODO: Apply user-specific content personalization
    }
    
    return transformedData;
  }

  /**
   * Apply tenant-specific transformations to block data
   */
  private applyTenantBlockTransformations(blockData: BlockData, context: RequestContext): BlockData {
    // Apply tenant-specific settings
    const transformedData = { ...blockData };
    
    // Apply tenant-specific block configurations
    if (context.tenantId) {
      // TODO: Apply tenant-specific block settings
    }
    
    return transformedData;
  }

  /**
   * Add tenant metadata to content
   */
  private addTenantMetadata<T>(
    data: T,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): T & { _tenant: { id: string; createdBy?: string; createdAt: string } } {
    return {
      ...data,
      _tenant: {
        id: tenantContext.id,
        createdBy: authContext?.user?.id,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get user-specific content filters
   */
  private getUserContentFilters(authContext: AuthContext): Partial<ContentFilters> {
    const filters: Partial<ContentFilters> = {};
    
    // Apply role-based filtering
    if (authContext.roles.includes('admin')) {
      // Admins can see all content
      return filters;
    }
    
    if (authContext.roles.includes('editor')) {
      // Editors can see published and draft content
      filters.status = ['published', 'draft'];
    } else {
      // Regular users can only see published content
      filters.status = ['published'];
    }
    
    return filters;
  }

  /**
   * Check tenant limits for content type
   */
  private checkTenantLimits(tenantContext: TenantContext, type: ContentType): boolean {
    const limits = tenantContext.limits;
    
    switch (type) {
      case 'page':
        return !limits.maxPages || (limits.maxPages > 0);
      case 'block':
        return !limits.maxBlocks || (limits.maxBlocks > 0);
      case 'component':
        return !limits.maxComponents || (limits.maxComponents > 0);
      default:
        return true;
    }
  }

  /**
   * Get required permission for content operation
   */
  private getRequiredPermission(type: ContentType, operation: 'read' | 'write' | 'delete'): string {
    return `content.${type}.${operation}`;
  }

  /**
   * Check content-specific access rules
   */
  private async checkContentSpecificAccess(
    type: ContentType,
    id: string,
    tenantContext: TenantContext,
    authContext?: AuthContext
  ): Promise<boolean> {
    // For now, allow access if basic checks pass
    // TODO: Implement more sophisticated content-specific access rules
    return true;
  }
}

/**
 * Create tenant-aware content provider
 */
export function createTenantContentProvider(baseProvider: ContentProvider): TenantContentProvider {
  return new EnhancedTenantContentProvider(baseProvider);
}