/**
 * @upflame/json-cms — Resolver Cache
 *
 * LRU cache with:
 *  - configurable max size (evicts LRU on overflow)
 *  - TTL-based expiry
 *  - stampede protection (in-flight promise deduplication)
 *  - no cross-request contamination (per-instance semantics)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  /** LRU ordering — higher = more recently used */
  lastUsed: number;
}

export interface CacheOptions {
  /** Maximum number of entries before LRU eviction. Default: 256 */
  maxSize?: number;
  /** Default TTL in milliseconds. Default: 5 minutes */
  defaultTtlMs?: number;
}

export class ResolverCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private lruCounter = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 256;
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000;
  }

  /**
   * Get an item from cache. Returns undefined if missing or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    entry.lastUsed = ++this.lruCounter;
    return entry.data;
  }

  /**
   * Set an item in cache with optional TTL override.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictLRU();
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      lastUsed: ++this.lruCounter,
    });
  }

  /**
   * Resolve with stampede protection.
   *
   * If multiple concurrent callers request the same key simultaneously, only
   * one invocation of `resolver` is made — all others await the same promise.
   */
  async resolve<T>(
    key: string,
    resolver: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Fast path: cache hit
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    // Stampede protection: if already in-flight, await the existing promise
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    // Launch the resolver and register it as in-flight
    const promise = resolver()
      .then((data) => {
        this.set(key, data, ttlMs);
        this.inFlight.delete(key);
        return data;
      })
      .catch((err: unknown) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /** Explicitly invalidate a key */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Clear the entire cache */
  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruValue = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastUsed < lruValue) {
        lruValue = entry.lastUsed;
        lruKey = key;
      }
    }
    if (lruKey) this.store.delete(lruKey);
  }
}

/**
 * Singleton resolver cache used across the request lifecycle.
 *
 * In serverless (Vercel/Lambda) the module is re-evaluated per cold start but
 * warm instances share this cache — which is the desired behavior.
 *
 * TTL is short in development (1 s) and longer in production (5 min) so
 * Next.js incremental static regeneration remains responsive.
 */
export const resolverCache = new ResolverCache({
  maxSize: 512,
  defaultTtlMs:
    process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 1_000,
});
