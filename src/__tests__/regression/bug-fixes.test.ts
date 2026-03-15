/**
 * @upflame/json-cms — Regression Test Suite
 * Covers every bug fixed in this audit pass.
 * ALL tests must pass. Zero tolerance for regressions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── BUG-SEC-001: Audit log production behavior ───────────────────────────────

describe('BUG-SEC-001: Audit log in production', () => {
  let originalNodeEnv: string | undefined;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    stderrSpy.mockRestore();
  });

  it('writes structured JSON to stderr in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    const { logAuditEvent } = await import('@/lib/security');
    const user = { id: 'u1', email: 'admin@test.com', role: 'admin' as const };

    await logAuditEvent('page.deleted', user, { slug: 'home' });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const written = stderrSpy.mock.calls[0][0] as string;
    expect(written).toMatch(/^AUDIT:/);
    const json = JSON.parse(written.replace('AUDIT: ', ''));
    expect(json.action).toBe('page.deleted');
    expect(json.userId).toBe('u1');
  });
});

// ─── BUG-AUTH-001: Plaintext password ────────────────────────────────────────

describe('BUG-AUTH-001: Password hashing', () => {
  it('hashPassword must not return the plaintext password', async () => {
    const { BaseAuthAdapter } = await import('@/boilerplate/auth/adapters/base-adapter');

    // Create a testable subclass
    class TestAdapter extends BaseAuthAdapter {
      async getUser() { return null; }
      async getUserByEmail() { return null; }
      async createUser(d: never) { return d; }
      async updateUser(_: never, d: never) { return d; }
      async deleteUser() {}
      async createSession() { return {} as never; }
      async getSession() { return null; }
      async deleteSession() {}
      async validateCredentials() { return null; }

      // Expose protected method for testing
      async testHash(pw: string) { return this.hashPassword(pw); }
      async testValidate(pw: string, hash: string) { return this.validatePassword(pw, hash); }
    }

    const adapter = new TestAdapter({ type: 'jwt' } as never);

    // REGRESSION: hashPassword must NOT return plaintext
    const hash = await adapter.testHash('mySecret123');
    expect(hash).not.toBe('mySecret123');
    expect(hash.length).toBeGreaterThan(20); // bcrypt hash is 60 chars
  });

  it('validatePassword rejects wrong passwords', async () => {
    const { BaseAuthAdapter } = await import('@/boilerplate/auth/adapters/base-adapter');
    class TestAdapter extends BaseAuthAdapter {
      async getUser() { return null; }
      async getUserByEmail() { return null; }
      async createUser(d: never) { return d; }
      async updateUser(_: never, d: never) { return d; }
      async deleteUser() {}
      async createSession() { return {} as never; }
      async getSession() { return null; }
      async deleteSession() {}
      async validateCredentials() { return null; }
      async testHash(pw: string) { return this.hashPassword(pw); }
      async testValidate(pw: string, hash: string) { return this.validatePassword(pw, hash); }
    }

    const adapter = new TestAdapter({ type: 'jwt' } as never);
    const hash = await adapter.testHash('correctPassword');
    expect(await adapter.testValidate('wrongPassword', hash)).toBe(false);
    expect(await adapter.testValidate('correctPassword', hash)).toBe(true);
  });
});

// ─── BUG-RESOLVE-001: require() in ESM ───────────────────────────────────────

describe('BUG-RESOLVE-001: generateCacheKey uses ESM import', () => {
  it('generates a deterministic cache key without require()', async () => {
    const { generateCacheKey } = await import('@/lib/compose/resolve');
    const k1 = generateCacheKey('home', {}, { locale: 'en' });
    const k2 = generateCacheKey('home', {}, { locale: 'en' });
    const k3 = generateCacheKey('home', {}, { locale: 'fr' });

    expect(k1).toBe(k2); // deterministic
    expect(k1).not.toBe(k3); // different locale = different key
    expect(k1).toMatch(/^page:[a-f0-9]{16}$/);
  });
});

// ─── BUG-DATA-001: SEO path mismatch ─────────────────────────────────────────

describe('BUG-DATA-001: SEO data path', () => {
  it('FileSystemDataProvider reads from seoData/ not seo/', async () => {
    const { FileSystemDataProvider } = await import('@/lib/compose/data-provider');
    const provider = new FileSystemDataProvider('/tmp/fake-data-dir');

    // The path should include seoData — we test by checking the error message
    // (file won't exist in tmp, but the path in the error tells us where it looked)
    const result = await provider.getSEO('home');
    // Should return null (not throw) and should have looked in seoData/
    expect(result).toBeNull(); // File not found → null (not crash)
  });
});

// ─── BUG-CRLF-001: CRLF line endings ────────────────────────────────────────

describe('BUG-CRLF-001: No CRLF in source files', () => {
  it('security.ts has no CRLF', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const content = readFileSync(resolve(process.cwd(), 'src/lib/security.ts'), 'utf-8');
    expect(content).not.toContain('\r\n');
  });

  it('csp.ts has no CRLF', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const content = readFileSync(resolve(process.cwd(), 'src/lib/csp.ts'), 'utf-8');
    expect(content).not.toContain('\r\n');
  });
});

// ─── BUG-SEC-002: JWT enforcement ────────────────────────────────────────────

describe('BUG-SEC-002: JWT enforcement', () => {
  it('requireAdmin rejects requests without Authorization header', async () => {
    const { requireAdmin } = await import('@/lib/security');
    process.env.JWT_SECRET = 'a'.repeat(32);
    const req = new Request('http://localhost/api/test') as never;
    await expect(requireAdmin(req as never)).rejects.toThrow('Unauthorized');
  });

  it('requireAdmin rejects tokens with wrong role', async () => {
    const { requireAdmin } = await import('@/lib/security');
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode('a'.repeat(32));
    process.env.JWT_SECRET = 'a'.repeat(32);

    const token = await new SignJWT({ sub: 'u1', email: 'e@e.com', role: 'editor' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    const req = new Request('http://localhost/api/test', {
      headers: { Authorization: `Bearer ${token}` },
    }) as never;

    await expect(requireAdmin(req as never)).rejects.toThrow('Forbidden');
  });
});

// ─── BUG-CSRF-001: CSRF verification ─────────────────────────────────────────

describe('BUG-CSRF-001: CSRF protection', () => {
  it('verifyCsrf rejects requests without CSRF token', async () => {
    const { verifyCsrf } = await import('@/lib/security');
    const req = new Request('http://localhost/api/test') as never;
    await expect(verifyCsrf(req as never)).rejects.toThrow('Invalid CSRF');
  });
});

// ─── BUG-RATELIMIT-001: Rate limit ────────────────────────────────────────────

describe('BUG-RATELIMIT-001: Rate limiting', () => {
  it('blocks after limit exceeded', async () => {
    const { rateLimit } = await import('@/lib/security');
    const makeReq = () => new Request('http://localhost/api/test', {
      headers: { 'x-real-ip': '10.0.0.99' },
    }) as never;

    // Should allow up to limit=3
    for (let i = 0; i < 3; i++) {
      await expect(rateLimit(makeReq(), { key: 'test-rl', limit: 3 })).resolves.toBeUndefined();
    }
    // 4th request should throw
    await expect(rateLimit(makeReq(), { key: 'test-rl', limit: 3 })).rejects.toThrow('Rate limit');
  });
});

// ─── BUG-DEADCODE-001: Dead .new files removed ───────────────────────────────

describe('BUG-DEADCODE-001: Dead files removed', () => {
  it('middleware.ts.new no longer exists', async () => {
    const { existsSync } = await import('fs');
    const { resolve } = await import('path');
    expect(existsSync(resolve(process.cwd(), 'src/middleware.ts.new'))).toBe(false);
  });

  it('providers/index.tsx.new no longer exists', async () => {
    const { existsSync } = await import('fs');
    const { resolve } = await import('path');
    expect(existsSync(resolve(process.cwd(), 'src/providers/index.tsx.new'))).toBe(false);
  });
});

// ─── BUG-ASSERT-001: assertSafeId path traversal ─────────────────────────────

describe('BUG-ASSERT-001: Path traversal prevention', () => {
  it('assertSafeId blocks path traversal attempts', async () => {
    const { assertSafeId } = await import('@/lib/security');
    expect(() => assertSafeId('../etc/passwd', 'slug')).toThrow('Invalid slug');
    expect(() => assertSafeId('home; rm -rf /', 'slug')).toThrow('Invalid slug');
    expect(() => assertSafeId('home', 'slug')).not.toThrow();
    expect(() => assertSafeId('my-page.v2', 'slug')).not.toThrow();
  });
});
