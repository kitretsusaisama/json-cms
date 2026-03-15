import { NextRequest, NextResponse } from 'next/server';
import { CSPConfig } from './interfaces';

export class CSPManager {
  private config: CSPConfig;

  constructor(config?: Partial<CSPConfig>) {
    this.config = {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https:', 'data:'],
        'connect-src': ["'self'"],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'child-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'manifest-src': ["'self'"]
      },
      reportOnly: false,
      ...config
    };
  }

  /**
   * Generate CSP header value from directives
   */
  generateCSPHeader(): string {
    const directives = Object.entries(this.config.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    return directives;
  }

  /**
   * Apply CSP headers to response
   */
  applyCSPHeaders(response: NextResponse): NextResponse {
    const cspValue = this.generateCSPHeader();
    const headerName = this.config.reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';

    response.headers.set(headerName, cspValue);

    if (this.config.reportUri) {
      response.headers.set('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: this.config.reportUri }]
      }));
    }

    return response;
  }

  /**
   * Add source to specific directive
   */
  addSource(directive: string, source: string): void {
    if (!this.config.directives[directive]) {
      this.config.directives[directive] = [];
    }
    
    if (!this.config.directives[directive].includes(source)) {
      this.config.directives[directive].push(source);
    }
  }

  /**
   * Remove source from specific directive
   */
  removeSource(directive: string, source: string): void {
    if (this.config.directives[directive]) {
      this.config.directives[directive] = this.config.directives[directive]
        .filter(s => s !== source);
    }
  }

  /**
   * Create development-friendly CSP
   */
  static createDevelopmentCSP(): CSPManager {
    return new CSPManager({
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:', 'http:'],
        'font-src': ["'self'", 'https:', 'data:'],
        'connect-src': ["'self'", 'ws:', 'wss:', 'localhost:*'],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'child-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"]
      },
      reportOnly: true
    });
  }

  /**
   * Create production CSP with strict security
   */
  static createProductionCSP(allowedDomains: string[] = []): CSPManager {
    const domains = allowedDomains.length > 0 ? allowedDomains : ["'self'"];
    
    return new CSPManager({
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'", ...domains],
        'style-src': ["'self'", ...domains],
        'img-src': ["'self'", 'data:', 'https:', ...domains],
        'font-src': ["'self'", 'https:', ...domains],
        'connect-src': ["'self'", ...domains],
        'media-src': ["'self'", ...domains],
        'object-src': ["'none'"],
        'child-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'upgrade-insecure-requests': []
      },
      reportOnly: false
    });
  }

  /**
   * Create CSP for Next.js applications
   */
  static createNextJSCSP(): CSPManager {
    return new CSPManager({
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-eval'", // Required for Next.js development
          "'unsafe-inline'" // Required for Next.js inline scripts
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'" // Required for styled-jsx and CSS-in-JS
        ],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'font-src': ["'self'", 'https:', 'data:'],
        'connect-src': ["'self'", 'https:', 'wss:'],
        'media-src': ["'self'", 'https:'],
        'object-src': ["'none'"],
        'child-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'manifest-src': ["'self'"]
      }
    });
  }

  /**
   * Validate CSP configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredDirectives = ['default-src', 'script-src', 'object-src'];

    for (const directive of requiredDirectives) {
      if (!this.config.directives[directive]) {
        errors.push(`Missing required directive: ${directive}`);
      }
    }

    // Check for unsafe directives in production
    if (process.env.NODE_ENV === 'production') {
      const unsafeDirectives = ['script-src', 'style-src'];
      
      for (const directive of unsafeDirectives) {
        const sources = this.config.directives[directive] || [];
        
        if (sources.includes("'unsafe-inline'") || sources.includes("'unsafe-eval'")) {
          errors.push(`Unsafe directive found in production: ${directive}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instances
export const developmentCSP = CSPManager.createDevelopmentCSP();
export const productionCSP = CSPManager.createProductionCSP();
export const nextjsCSP = CSPManager.createNextJSCSP();