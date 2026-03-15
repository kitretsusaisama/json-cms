/**
 * Tenant Management API Routes
 * 
 * Provides REST API endpoints for tenant CRUD operations, settings management,
 * usage tracking, and access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APIEnvelope, createSuccessResponse, createErrorResponse } from './envelope';
import { 
  TenantManager, 
  TenantContext, 
  CreateTenantData, 
  TenantFilters,
  TenantSettings,
  TenantUsage 
} from '../interfaces/tenant';
import { TenantValidator, ValidationResult } from '../tenant/access-control';

// Validation schemas
const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().optional(),
  subdomain: z.string().optional(),
  settings: z.object({}).passthrough().optional(),
  features: z.record(z.boolean()).optional(),
  limits: z.object({
    maxUsers: z.number().min(0).optional(),
    maxPages: z.number().min(0).optional(),
    maxBlocks: z.number().min(0).optional(),
    maxComponents: z.number().min(0).optional(),
    maxStorage: z.number().min(0).optional(),
    maxApiRequests: z.number().min(0).optional(),
    maxBandwidth: z.number().min(0).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

const UpdateTenantSchema = CreateTenantSchema.partial();

const TenantFiltersSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
  domain: z.string().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

const TenantSettingsSchema = z.object({
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional()
  }).optional(),
  branding: z.object({
    companyName: z.string().optional(),
    tagline: z.string().optional(),
    footerText: z.string().optional()
  }).optional(),
  localization: z.object({
    defaultLocale: z.string(),
    supportedLocales: z.array(z.string()),
    timezone: z.string()
  }).optional(),
  content: z.object({
    defaultPageTemplate: z.string().optional(),
    allowedComponents: z.array(z.string()).optional(),
    maxPages: z.number().optional(),
    maxBlocks: z.number().optional()
  }).optional(),
  security: z.object({
    allowedDomains: z.array(z.string()).optional(),
    requireSSL: z.boolean().optional(),
    enableAuditLog: z.boolean().optional()
  }).optional()
}).partial();

const UsageMetricsSchema = z.object({
  users: z.number().min(0).optional(),
  pages: z.number().min(0).optional(),
  blocks: z.number().min(0).optional(),
  components: z.number().min(0).optional(),
  storage: z.number().min(0).optional(),
  apiRequests: z.number().min(0).optional(),
  bandwidth: z.number().min(0).optional()
});

const CheckLimitsSchema = z.object({
  resource: z.string(),
  amount: z.number().min(1).default(1)
});

/**
 * Tenant API Routes Handler
 */
export class TenantAPIRoutes {
  constructor(
    private tenantManager: TenantManager,
    private validator: TenantValidator = new TenantValidator()
  ) {}

  /**
   * GET /api/cms/tenants - List tenants
   */
  async listTenants(request: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      const filters = TenantFiltersSchema.parse(queryParams);
      const tenants = await this.tenantManager.listTenants(filters);

      return createSuccessResponse(tenants, {
        total: tenants.length,
        filters
      });
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to list tenants',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants - Create tenant
   */
  async createTenant(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const data = CreateTenantSchema.parse(body);

      const tenant = await this.tenantManager.createTenant(data);

      // Validate the created tenant
      const validation = this.validator.validateTenantConfig(tenant);
      if (!validation.valid) {
        return createErrorResponse(
          `Tenant validation failed: ${validation.errors.join(', ')}`,
          400
        );
      }

      return createSuccessResponse(tenant, {
        created: true,
        warnings: validation.warnings
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to create tenant',
        500
      );
    }
  }

  /**
   * GET /api/cms/tenants/[id] - Get tenant by ID
   */
  async getTenant(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const tenant = await this.tenantManager.getTenant(params.id);
      
      if (!tenant) {
        return createErrorResponse('Tenant not found', 404);
      }

      return createSuccessResponse(tenant);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get tenant',
        500
      );
    }
  }

  /**
   * PUT /api/cms/tenants/[id] - Update tenant
   */
  async updateTenant(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const data = UpdateTenantSchema.parse(body);

      const tenant = await this.tenantManager.updateTenant(params.id, data);

      // Validate the updated tenant
      const validation = this.validator.validateTenantConfig(tenant);
      if (!validation.valid) {
        return createErrorResponse(
          `Tenant validation failed: ${validation.errors.join(', ')}`,
          400
        );
      }

      return createSuccessResponse(tenant, {
        updated: true,
        warnings: validation.warnings
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update tenant',
        500
      );
    }
  }

  /**
   * DELETE /api/cms/tenants/[id] - Delete tenant
   */
  async deleteTenant(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      await this.tenantManager.deleteTenant(params.id);
      
      return createSuccessResponse(null, {
        deleted: true,
        tenantId: params.id
      });
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to delete tenant',
        500
      );
    }
  }

  /**
   * GET /api/cms/tenants/[id]/settings - Get tenant settings
   */
  async getTenantSettings(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const settings = await this.tenantManager.getTenantSettings(params.id);
      return createSuccessResponse(settings);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get tenant settings',
        500
      );
    }
  }

  /**
   * PUT /api/cms/tenants/[id]/settings - Update tenant settings
   */
  async updateTenantSettings(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const settings = TenantSettingsSchema.parse(body);

      const updatedSettings = await this.tenantManager.updateTenantSettings(params.id, settings);
      
      return createSuccessResponse(updatedSettings, {
        updated: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update tenant settings',
        500
      );
    }
  }

  /**
   * GET /api/cms/tenants/[id]/usage - Get tenant usage
   */
  async getTenantUsage(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const url = new URL(request.url);
      const period = url.searchParams.get('period') || undefined;
      
      const usage = await this.tenantManager.getTenantUsage(params.id, period);
      
      return createSuccessResponse(usage);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get tenant usage',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants/[id]/usage - Update tenant usage
   */
  async updateTenantUsage(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const metrics = UsageMetricsSchema.parse(body);

      await this.tenantManager.updateTenantUsage(params.id, metrics);
      
      return createSuccessResponse(null, {
        updated: true,
        tenantId: params.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update tenant usage',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants/[id]/limits/check - Check tenant limits
   */
  async checkTenantLimits(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { resource, amount } = CheckLimitsSchema.parse(body);

      const allowed = await this.tenantManager.checkLimits(params.id, resource, amount);
      
      return createSuccessResponse({ allowed }, {
        resource,
        amount,
        tenantId: params.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to check tenant limits',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants/[id]/suspend - Suspend tenant
   */
  async suspendTenant(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { reason } = z.object({ reason: z.string() }).parse(body);

      await this.tenantManager.suspendTenant(params.id, reason);
      
      return createSuccessResponse(null, {
        suspended: true,
        tenantId: params.id,
        reason
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to suspend tenant',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants/[id]/activate - Activate tenant
   */
  async activateTenant(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      await this.tenantManager.activateTenant(params.id);
      
      return createSuccessResponse(null, {
        activated: true,
        tenantId: params.id
      });
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to activate tenant',
        500
      );
    }
  }

  /**
   * POST /api/cms/tenants/[id]/validate - Validate tenant access
   */
  async validateTenantAccess(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { userId } = z.object({ userId: z.string() }).parse(body);

      const hasAccess = await this.tenantManager.validateTenantAccess(params.id, userId);
      
      return createSuccessResponse({ hasAccess }, {
        tenantId: params.id,
        userId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to validate tenant access',
        500
      );
    }
  }

  /**
   * Route handler factory
   */
  createRouteHandler() {
    return {
      GET: async (request: NextRequest, context?: { params: { id: string } }) => {
        if (context?.params?.id) {
          return this.getTenant(request, context);
        }
        return this.listTenants(request);
      },
      
      POST: async (request: NextRequest, context?: { params: { id: string } }) => {
        if (!context?.params?.id) {
          return this.createTenant(request);
        }
        
        // Handle sub-routes
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const action = pathSegments[pathSegments.length - 1];
        
        switch (action) {
          case 'usage':
            return this.updateTenantUsage(request, context);
          case 'check':
            return this.checkTenantLimits(request, context);
          case 'suspend':
            return this.suspendTenant(request, context);
          case 'activate':
            return this.activateTenant(request, context);
          case 'validate':
            return this.validateTenantAccess(request, context);
          default:
            return createErrorResponse('Invalid action', 400);
        }
      },
      
      PUT: async (request: NextRequest, context: { params: { id: string } }) => {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        
        if (pathSegments.includes('settings')) {
          return this.updateTenantSettings(request, context);
        }
        
        return this.updateTenant(request, context);
      },
      
      DELETE: async (request: NextRequest, context: { params: { id: string } }) => {
        return this.deleteTenant(request, context);
      }
    };
  }
}

/**
 * Factory function to create tenant API routes
 */
export function createTenantAPIRoutes(tenantManager: TenantManager): TenantAPIRoutes {
  return new TenantAPIRoutes(tenantManager);
}

/**
 * Utility function to extract tenant ID from request
 */
export function extractTenantIdFromRequest(request: NextRequest): string | null {
  // Try header first
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // Try subdomain
  const url = new URL(request.url);
  const hostname = url.hostname;
  const baseDomain = process.env.BASE_DOMAIN || 'localhost';
  
  if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
    return hostname.replace(`.${baseDomain}`, '');
  }

  // Try path
  const pathSegments = url.pathname.split('/');
  if (pathSegments[1] === 'tenant' && pathSegments[2]) {
    return pathSegments[2];
  }

  return null;
}

/**
 * Middleware to resolve tenant from request
 */
export function createTenantResolutionMiddleware(tenantManager: TenantManager) {
  return async (request: NextRequest) => {
    const tenantRequest = {
      headers: Object.fromEntries(request.headers.entries()),
      hostname: new URL(request.url).hostname,
      pathname: new URL(request.url).pathname,
      query: Object.fromEntries(new URL(request.url).searchParams.entries())
    };

    const tenant = await tenantManager.resolveTenant(tenantRequest);
    
    if (!tenant) {
      return createErrorResponse('Tenant not found or inactive', 404);
    }

    // Add tenant to request context (this would be implementation-specific)
    return { tenant };
  };
}