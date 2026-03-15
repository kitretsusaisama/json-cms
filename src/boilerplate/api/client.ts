/**
 * API Client Utilities
 * 
 * Provides client-side utilities for interacting with the CMS API
 * with caching, retries, and authentication headers
 */

import { 
  APIEnvelope, 
  APIError, 
  ContentType, 
  ContentFilters, 
  ContentList, 
  PageData, 
  BlockData, 
  SEOData 
} from '../interfaces/content-provider';

export interface APIClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
  authToken?: string;
  tenantId?: string;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  cache?: boolean;
  retries?: number;
  timeout?: number;
}

export class APIClient {
  private config: Required<APIClientConfig>;
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/api/cms',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      cache: config.cache !== false,
      cacheTTL: config.cacheTTL || 5 * 60 * 1000, // 5 minutes
      authToken: config.authToken || '',
      tenantId: config.tenantId || '',
      headers: config.headers || {}
    };
  }

  // Configuration methods
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  setTenantId(tenantId: string): void {
    this.config.tenantId = tenantId;
  }

  setHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  // Page operations
  async getPage(slug: string, options?: RequestOptions): Promise<PageData | null> {
    const response = await this.request<PageData>(`/pages/${slug}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  async setPage(slug: string, data: Partial<PageData>, options?: RequestOptions): Promise<PageData> {
    const response = await this.request<PageData>(`/pages/${slug}`, {
      method: 'PUT',
      body: data,
      cache: false,
      ...options
    });
    
    // Invalidate related cache entries
    this.invalidateCache(`/pages/${slug}`);
    this.invalidateCache('/pages');
    
    return response.data;
  }

  async deletePage(slug: string, options?: RequestOptions): Promise<void> {
    await this.request(`/pages/${slug}`, {
      method: 'DELETE',
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/pages/${slug}`);
    this.invalidateCache('/pages');
  }

  async listPages(filters?: ContentFilters, options?: RequestOptions): Promise<ContentList<PageData>> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.request<ContentList<PageData>>(`/pages${queryParams}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  // Block operations
  async getBlock(id: string, options?: RequestOptions): Promise<BlockData | null> {
    const response = await this.request<BlockData>(`/blocks/${id}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  async setBlock(id: string, data: Partial<BlockData>, options?: RequestOptions): Promise<BlockData> {
    const response = await this.request<BlockData>(`/blocks/${id}`, {
      method: 'PUT',
      body: data,
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/blocks/${id}`);
    this.invalidateCache('/blocks');
    
    return response.data;
  }

  async deleteBlock(id: string, options?: RequestOptions): Promise<void> {
    await this.request(`/blocks/${id}`, {
      method: 'DELETE',
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/blocks/${id}`);
    this.invalidateCache('/blocks');
  }

  async listBlocks(filters?: ContentFilters, options?: RequestOptions): Promise<ContentList<BlockData>> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.request<ContentList<BlockData>>(`/blocks${queryParams}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  // SEO operations
  async getSEO(type: string, id: string, options?: RequestOptions): Promise<SEOData | null> {
    const response = await this.request<SEOData>(`/seo/${type}/${id}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  async setSEO(type: string, id: string, data: Partial<SEOData>, options?: RequestOptions): Promise<SEOData> {
    const response = await this.request<SEOData>(`/seo/${type}/${id}`, {
      method: 'PUT',
      body: data,
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/seo/${type}/${id}`);
    this.invalidateCache(`/seo/${type}`);
    
    return response.data;
  }

  async deleteSEO(type: string, id: string, options?: RequestOptions): Promise<void> {
    await this.request(`/seo/${type}/${id}`, {
      method: 'DELETE',
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/seo/${type}/${id}`);
    this.invalidateCache(`/seo/${type}`);
  }

  async listSEO(type: string, filters?: ContentFilters, options?: RequestOptions): Promise<ContentList<SEOData>> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.request<ContentList<SEOData>>(`/seo/${type}${queryParams}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  // Generic content operations
  async getContent(type: ContentType, id: string, options?: RequestOptions): Promise<unknown> {
    const response = await this.request(`/content/${type}/${id}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  async setContent(type: ContentType, id: string, data: unknown, options?: RequestOptions): Promise<unknown> {
    const response = await this.request(`/content/${type}/${id}`, {
      method: 'PUT',
      body: data,
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/content/${type}/${id}`);
    this.invalidateCache(`/content/${type}`);
    
    return response.data;
  }

  async deleteContent(type: ContentType, id: string, options?: RequestOptions): Promise<void> {
    await this.request(`/content/${type}/${id}`, {
      method: 'DELETE',
      cache: false,
      ...options
    });
    
    this.invalidateCache(`/content/${type}/${id}`);
    this.invalidateCache(`/content/${type}`);
  }

  async listContent(type: ContentType, filters?: ContentFilters, options?: RequestOptions): Promise<ContentList<unknown>> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.request<ContentList<unknown>>(`/content/${type}${queryParams}`, {
      method: 'GET',
      ...options
    });
    
    return response.data;
  }

  // Health and status
  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    const response = await this.request<{ healthy: boolean; details?: Record<string, unknown> }>('/health', {
      method: 'GET',
      cache: false
    });
    
    return response.data;
  }

  async getStats(): Promise<Record<string, unknown>> {
    const response = await this.request<Record<string, unknown>>('/stats', {
      method: 'GET'
    });
    
    return response.data;
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Private methods
  private async request<T = unknown>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<APIEnvelope<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;
    
    // Check cache for GET requests
    if ((options.method === 'GET' || !options.method) && 
        (options.cache !== false && this.config.cache)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.data as APIEnvelope<T>;
      }
    }

    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: this.buildHeaders(options.headers),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout)
    };

    if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const retries = options.retries !== undefined ? options.retries : this.config.retries;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new APIClientError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData
          );
        }

        const data: APIEnvelope<T> = await response.json();
        
        // Validate response format
        if (!this.isValidEnvelope(data)) {
          throw new APIClientError('Invalid response format', 0, data);
        }

        // Cache successful GET responses
        if ((options.method === 'GET' || !options.method) && 
            (options.cache !== false && this.config.cache)) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data;
        
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Don't retry client errors (4xx)
        if (error instanceof APIClientError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Wait before retrying
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw new APIClientError('Max retries exceeded', 0);
  }

  private buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers,
      ...additionalHeaders
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    if (this.config.tenantId) {
      headers['X-Tenant-ID'] = this.config.tenantId;
    }

    // Add request ID for tracing
    headers['X-Request-ID'] = this.generateRequestId();

    return headers;
  }

  private buildQueryParams(filters?: ContentFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.createdBy) params.append('createdBy', filters.createdBy);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    
    if (filters.dateRange) {
      params.append('dateFrom', filters.dateRange.from);
      params.append('dateTo', filters.dateRange.to);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private isValidEnvelope(data: unknown): data is APIEnvelope<unknown> {
    return (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      'meta' in data
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class APIClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

// Utility functions for creating API clients
export function createAPIClient(config?: APIClientConfig): APIClient {
  return new APIClient(config);
}

export function createAuthenticatedClient(token: string, config?: APIClientConfig): APIClient {
  return new APIClient({
    ...config,
    authToken: token
  });
}

export function createTenantClient(tenantId: string, config?: APIClientConfig): APIClient {
  return new APIClient({
    ...config,
    tenantId
  });
}

// React hook for API client (if using React)
export function useAPIClient(config?: APIClientConfig): APIClient {
  // This would typically use React.useMemo to memoize the client
  // For now, just return a new instance
  return new APIClient(config);
}

// Default client instance
export const defaultAPIClient = new APIClient();