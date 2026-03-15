// Test setup file for vitest
import { vi } from 'vitest';

// Mock Next.js modules that aren't available in test environment
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    method: string;
    headers: Map<string, string>;
    nextUrl: { pathname: string; searchParams: URLSearchParams };
    
    constructor(input?: any) {
      this.method = input?.method || 'GET';
      this.headers = input?.headers || new Map();
      this.nextUrl = input?.nextUrl || { 
        pathname: '/test', 
        searchParams: new URLSearchParams() 
      };
    }
    
    json() {
      return Promise.resolve({});
    }
  },
  NextResponse: {
    next: () => ({
      status: 200,
      headers: new Map(),
    }),
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      headers: new Map(),
      json: () => Promise.resolve(data),
    }),
  },
}));

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});