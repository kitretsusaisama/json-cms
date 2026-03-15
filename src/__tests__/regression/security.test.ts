/**
 * Security Layer Regression Tests — full coverage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.JWT_SECRET = 'test-secret-minimum-32-chars-long-ok';

describe('assertSafeId', () => {
  it('allows safe slugs', async () => {
    const { assertSafeId } = await import('@/lib/security');
    expect(() => assertSafeId('home', 'slug')).not.toThrow();
    expect(() => assertSafeId('my-page', 'slug')).not.toThrow();
    expect(() => assertSafeId('page.v2', 'slug')).not.toThrow();
    expect(() => assertSafeId('section_1', 'slug')).not.toThrow();
  });

  it('blocks path traversal', async () => {
    const { assertSafeId } = await import('@/lib/security');
    expect(() => assertSafeId('../etc/passwd', 'slug')).toThrow();
    expect(() => assertSafeId('foo/bar', 'slug')).toThrow();
    expect(() => assertSafeId('<script>', 'slug')).toThrow();
    expect(() => assertSafeId('foo bar', 'slug')).toThrow();
  });
});

describe('sanitizeHtml', () => {
  it('strips script tags', async () => {
    const { sanitizeHtml } = await import('@/lib/security');
    const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips javascript: protocol', async () => {
    const { sanitizeHtml } = await import('@/lib/security');
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('strips event handlers', async () => {
    const { sanitizeHtml } = await import('@/lib/security');
    const result = sanitizeHtml('<img onerror="evil()">');
    expect(result).not.toContain('onerror');
  });
});

describe('createCsrfToken', () => {
  it('returns a 32-char hex string', async () => {
    const { createCsrfToken } = await import('@/lib/security');
    const token = createCsrfToken();
    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });

  it('generates unique tokens', async () => {
    const { createCsrfToken } = await import('@/lib/security');
    const tokens = new Set(Array.from({ length: 100 }, () => createCsrfToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('validateStructuredData', () => {
  it('passes valid structured data', async () => {
    const { validateStructuredData } = await import('@/lib/security');
    const data = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Home' }];
    expect(() => validateStructuredData(data)).not.toThrow();
  });

  it('rejects items missing @type', async () => {
    const { validateStructuredData } = await import('@/lib/security');
    expect(() => validateStructuredData([{ '@context': 'https://schema.org' }])).toThrow('@type');
  });

  it('rejects null items', async () => {
    const { validateStructuredData } = await import('@/lib/security');
    expect(() => validateStructuredData([null])).toThrow();
  });
});

describe('getSecurityHeaders', () => {
  it('returns required security headers', async () => {
    const { getSecurityHeaders } = await import('@/lib/security');
    const headers = getSecurityHeaders();
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });

  it('includes CSP header when nonce provided', async () => {
    const { getSecurityHeaders } = await import('@/lib/security');
    const headers = getSecurityHeaders('abc123');
    expect(headers['Content-Security-Policy']).toContain("nonce-abc123");
  });
});
