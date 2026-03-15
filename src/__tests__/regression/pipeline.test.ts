/**
 * Pipeline & Cache Regression Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ResolverCache — LRU + Stampede Protection', () => {
  it('returns cached value on second call', async () => {
    const { ResolverCache } = await import('@/lib/compose/cache');
    const cache = new ResolverCache({ maxSize: 10, defaultTtlMs: 5000 });
    const resolver = vi.fn(async () => ({ data: 'hello' }));

    const r1 = await cache.resolve('key1', resolver);
    const r2 = await cache.resolve('key1', resolver);

    expect(r1).toEqual({ data: 'hello' });
    expect(r2).toEqual({ data: 'hello' });
    expect(resolver).toHaveBeenCalledOnce(); // Only one actual call
  });

  it('deduplicates concurrent stampede requests', async () => {
    const { ResolverCache } = await import('@/lib/compose/cache');
    const cache = new ResolverCache({ maxSize: 10, defaultTtlMs: 5000 });
    let resolveCount = 0;
    const resolver = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 10));
      resolveCount++;
      return { count: resolveCount };
    });

    // Fire 10 concurrent requests for same key
    const results = await Promise.all(
      Array.from({ length: 10 }, () => cache.resolve('stampede-key', resolver))
    );

    // All 10 should get the same value
    results.forEach(r => expect(r).toEqual({ count: 1 }));
    // Only 1 actual resolve call
    expect(resolver).toHaveBeenCalledOnce();
    expect(resolveCount).toBe(1);
  });

  it('evicts LRU entries when maxSize exceeded', async () => {
    const { ResolverCache } = await import('@/lib/compose/cache');
    const cache = new ResolverCache({ maxSize: 3, defaultTtlMs: 60000 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // access 'a' to make it recently used

    cache.set('d', 4); // Should evict 'b' (LRU)

    expect(cache.get('a')).toBe(1); // recently used — kept
    expect(cache.get('c')).toBe(3); // kept
    expect(cache.get('d')).toBe(4); // new — kept
    expect(cache.get('b')).toBeUndefined(); // evicted
  });

  it('expires entries after TTL', async () => {
    const { ResolverCache } = await import('@/lib/compose/cache');
    const cache = new ResolverCache({ maxSize: 10, defaultTtlMs: 10 }); // 10ms TTL

    cache.set('expiry-key', 'value');
    expect(cache.get('expiry-key')).toBe('value');

    await new Promise(r => setTimeout(r, 20)); // Wait for expiry
    expect(cache.get('expiry-key')).toBeUndefined();
  });
});

describe('planPage — Constraint & Variant Planning', () => {
  it('filters components by conditions', async () => {
    const { planPage } = await import('@/lib/compose/planner');

    const page = {
      id: 'test',
      title: 'Test',
      blocks: [],
      prepend: [
        {
          id: 'c1', key: 'Hero',
          conditions: [{ when: { op: '==', args: [{ '$ctx': 'device' }, 'mobile'] }, elseHide: true }],
          props: {}, variants: [], weight: 1
        },
        {
          id: 'c2', key: 'CTA',
          conditions: [],
          props: {}, variants: [], weight: 1
        }
      ],
      append: [],
      constraints: []
    } as never;

    const resultMobile = planPage({ page, ctx: { device: 'mobile' } });
    const resultDesktop = planPage({ page, ctx: { device: 'desktop' } });

    expect(resultMobile.components.map(c => c.key)).toContain('Hero');
    expect(resultDesktop.components.map(c => c.key)).not.toContain('Hero');
    expect(resultDesktop.components.map(c => c.key)).toContain('CTA');
  });
});

describe('generateCacheKey — deterministic + collision-resistant', () => {
  it('same inputs produce same key', async () => {
    const { generateCacheKey } = await import('@/lib/compose/resolve');
    const k1 = generateCacheKey('home', { abBucket: 42 }, { locale: 'en', site: 'default' });
    const k2 = generateCacheKey('home', { abBucket: 42 }, { locale: 'en', site: 'default' });
    expect(k1).toBe(k2);
  });

  it('different locales produce different keys', async () => {
    const { generateCacheKey } = await import('@/lib/compose/resolve');
    const en = generateCacheKey('home', {}, { locale: 'en' });
    const fr = generateCacheKey('home', {}, { locale: 'fr' });
    expect(en).not.toBe(fr);
  });

  it('key matches expected format: page:[16 hex chars]', async () => {
    const { generateCacheKey } = await import('@/lib/compose/resolve');
    const k = generateCacheKey('about', {}, {});
    expect(k).toMatch(/^page:[a-f0-9]{16}$/);
  });
});
