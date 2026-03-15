import { NextRequest, NextResponse } from 'next/server';
import { supportedLanguages, defaultLanguage } from './i18n';
import { getSecurityHeaders, ensureCsrfCookie } from './lib/security';
import { generateNonce, CSP_NONCE_HEADER } from './lib/csp';

// Language detection and redirection middleware
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Skip for API routes, static files, and other special paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next();
  }

  // Get the preferred language from cookie, header, or default to 'en'
  const cookieLanguage = request.cookies.get('NEXT_LOCALE')?.value;
  const headerLanguage = request.headers.get('accept-language')?.split(',')[0].split('-')[0];

  // Get language from cookie or header
  const detectedLanguage = cookieLanguage ||
    (headerLanguage && supportedLanguages.includes(headerLanguage) ? headerLanguage : defaultLanguage);

  // Generate a unique nonce for CSP
  const nonce = generateNonce();

  // Create a response
  const response = NextResponse.next();

  // Set the language cookie if it doesn't exist
  if (!cookieLanguage) {
    response.cookies.set('NEXT_LOCALE', detectedLanguage, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'strict',
    });
  }

  // Add CSP nonce to headers so it can be accessed in components
  response.headers.set(CSP_NONCE_HEADER, nonce);

  // Add security headers with nonce
  const securityHeaders = getSecurityHeaders(nonce);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Ensure CSRF cookie is set for double-submit pattern
  ensureCsrfCookie(response, request);

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (/api/*)
     * - Static files (/_next/*)
     * - Static files in public (/static/*)
     * - Files with extensions (.jpg, .png, etc.)
     */
    '/((?!api|_next|static|.*\\.).*)',
  ],
};