/**
 * Example API Routes
 * 
 * Demonstrates how to create CMS API routes using the enhanced API bridge system
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createProviderFromEnv,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  extractRequestMeta,
  getHTTPStatus,
  APIEnvelopeBuilder,
  APIErrorBuilder
} from '../api';
import type { ContentProvider, RequestContext, ContentFilters } from '../interfaces/content-provider';

// Global provider instance (in a real app, this might be managed differently)
let providerInstance: ContentProvider | null = null;

async function getProvider(): Promise<ContentProvider> {
  if (!providerInstance) {
    providerInstance = await createProviderFromEnv();
  }
  return providerInstance;
}

function extractRequestContext(request: NextRequest): RequestContext {
  return {
    tenantId: request.headers.get('x-tenant-id') || undefined,
    userId: request.headers.get('x-user-id') || undefined,
    locale: request.headers.get('x-locale') || 'en',
    environment: process.env.NODE_ENV || 'development',
    preview: request.headers.get('x-preview') === 'true',
    headers: Object.fromEntries(request.headers.entries())
  };
}

function extractContentFilters(request: NextRequest): ContentFilters {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  const filters: ContentFilters = {};
  
  if (params.get('status')) {
    filters.status = params.get('status') as 'draft' | 'published' | 'archived';
  }
  
  if (params.get('category')) {
    filters.category = params.get('category');
  }
  
  if (params.get('createdBy')) {
    filters.createdBy = params.get('createdBy');
  }
  
  if (params.get('limit')) {
    filters.limit = parseInt(params.get('limit')!);
  }
  
  if (params.get('offset')) {
    filters.offset = parseInt(params.get('offset')!);
  }
  
  const tags = params.getAll('tags');
  if (tags.length > 0) {
    filters.tags = tags;
  }
  
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  if (dateFrom && dateTo) {
    filters.dateRange = { from: dateFrom, to: dateTo };
  }
  
  return filters;
}

// Example: GET /api/cms/pages/[slug]
export async function handleGetPage(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const meta = extractRequestMeta(request);
    
    const page = await provider.getPage(params.slug, context);
    
    if (!page) {
      const envelope = notFoundResponse('Page', params.slug);
      return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    }
    
    const envelope = APIEnvelopeBuilder
      .success(page)
      .withMeta(meta)
      .withCacheKey(`page:${params.slug}:${context.tenantId || 'default'}`)
      .build();
    
    return NextResponse.json(envelope, { 
      status: getHTTPStatus(envelope),
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
    
  } catch (error) {
    console.error('Error getting page:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to retrieve page').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: PUT /api/cms/pages/[slug]
export async function handleSetPage(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const meta = extractRequestMeta(request);
    
    const body = await request.json();
    
    // Basic validation
    if (!body.title) {
      const envelope = validationErrorResponse('Page title is required');
      return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    }
    
    const page = await provider.setPage(params.slug, body, context);
    
    const envelope = APIEnvelopeBuilder
      .success(page)
      .withMeta({ ...meta, status: 'updated' })
      .build();
    
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    
  } catch (error) {
    console.error('Error setting page:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to save page').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: DELETE /api/cms/pages/[slug]
export async function handleDeletePage(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const meta = extractRequestMeta(request);
    
    await provider.deletePage(params.slug, context);
    
    const envelope = APIEnvelopeBuilder
      .success(null)
      .withMeta({ ...meta, status: 'deleted' })
      .build();
    
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    
  } catch (error) {
    console.error('Error deleting page:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to delete page').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: GET /api/cms/pages
export async function handleListPages(request: NextRequest) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const filters = extractContentFilters(request);
    const meta = extractRequestMeta(request);
    
    const result = await provider.listPages(filters, context);
    
    const envelope = APIEnvelopeBuilder
      .success(result)
      .withMeta(meta)
      .withCacheKey(`pages:${JSON.stringify(filters)}:${context.tenantId || 'default'}`)
      .build();
    
    return NextResponse.json(envelope, { 
      status: getHTTPStatus(envelope),
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30'
      }
    });
    
  } catch (error) {
    console.error('Error listing pages:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to list pages').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: GET /api/cms/blocks/[id]
export async function handleGetBlock(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const meta = extractRequestMeta(request);
    
    const block = await provider.getBlock(params.id, context);
    
    if (!block) {
      const envelope = notFoundResponse('Block', params.id);
      return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    }
    
    const envelope = APIEnvelopeBuilder
      .success(block)
      .withMeta(meta)
      .withCacheKey(`block:${params.id}:${context.tenantId || 'default'}`)
      .build();
    
    return NextResponse.json(envelope, { 
      status: getHTTPStatus(envelope),
      headers: {
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=120'
      }
    });
    
  } catch (error) {
    console.error('Error getting block:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to retrieve block').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: GET /api/cms/seo/[type]/[id]
export async function handleGetSEO(request: NextRequest, { params }: { params: { type: string; id: string } }) {
  try {
    const provider = await getProvider();
    const context = extractRequestContext(request);
    const meta = extractRequestMeta(request);
    
    const seo = await provider.getSEO(params.type, params.id, context);
    
    if (!seo) {
      const envelope = notFoundResponse('SEO', `${params.type}/${params.id}`);
      return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    }
    
    const envelope = APIEnvelopeBuilder
      .success(seo)
      .withMeta(meta)
      .withCacheKey(`seo:${params.type}:${params.id}:${context.tenantId || 'default'}`)
      .build();
    
    return NextResponse.json(envelope, { 
      status: getHTTPStatus(envelope),
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
    
  } catch (error) {
    console.error('Error getting SEO:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to retrieve SEO data').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: GET /api/cms/health
export async function handleHealthCheck(request: NextRequest) {
  try {
    const provider = await getProvider();
    const meta = extractRequestMeta(request);
    
    const health = await provider.healthCheck();
    
    const envelope = APIEnvelopeBuilder
      .success(health)
      .withMeta(meta)
      .build();
    
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
    
  } catch (error) {
    console.error('Error in health check:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Health check failed').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Example: GET /api/cms/stats
export async function handleGetStats(request: NextRequest) {
  try {
    const provider = await getProvider();
    const meta = extractRequestMeta(request);
    
    const stats = await provider.getStats();
    
    const envelope = APIEnvelopeBuilder
      .success(stats)
      .withMeta(meta)
      .build();
    
    return NextResponse.json(envelope, { 
      status: getHTTPStatus(envelope),
      headers: {
        'Cache-Control': 'public, max-age=60'
      }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    const envelope = errorResponse(
      APIErrorBuilder.internal('Failed to retrieve stats').build()
    );
    return NextResponse.json(envelope, { status: getHTTPStatus(envelope) });
  }
}

// Utility function to create a complete API route handler
export function createCMSRouteHandler(
  handlers: {
    GET?: (request: NextRequest, context: any) => Promise<NextResponse>;
    POST?: (request: NextRequest, context: any) => Promise<NextResponse>;
    PUT?: (request: NextRequest, context: any) => Promise<NextResponse>;
    DELETE?: (request: NextRequest, context: any) => Promise<NextResponse>;
  }
) {
  return async function handler(request: NextRequest, context: any) {
    const method = request.method as keyof typeof handlers;
    const handlerFn = handlers[method];
    
    if (!handlerFn) {
      const envelope = errorResponse(
        APIErrorBuilder.badRequest(`Method ${method} not allowed`).build()
      );
      return NextResponse.json(envelope, { status: 405 });
    }
    
    try {
      return await handlerFn(request, context);
    } catch (error) {
      console.error(`Error in ${method} handler:`, error);
      const envelope = errorResponse(
        APIErrorBuilder.internal('Internal server error').build()
      );
      return NextResponse.json(envelope, { status: 500 });
    }
  };
}