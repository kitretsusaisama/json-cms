# Caching and Performance Optimization System

A comprehensive caching system with multiple storage backends, intelligent invalidation, performance monitoring, and optimization recommendations for the JSON CMS Boilerplate.

## Features

- **Multiple Cache Backends**: In-memory, Redis, and multi-level caching
- **Intelligent Invalidation**: Rule-based cache invalidation with tags and patterns
- **Cache Warming**: Proactive cache population for improved performance
- **Performance Monitoring**: Real-time metrics collection and analysis
- **Optimization Recommendations**: AI-driven suggestions for cache improvements
- **TTL Management**: Flexible time-to-live configurations
- **Batch Operations**: Efficient bulk cache operations
- **Memory Management**: LRU eviction and memory usage tracking

## Quick Start

### Basic Memory Cache

```typescript
import { MemoryCache } from '@/boilerplate/cache';

const cache = new MemoryCache(
  { namespace: 'app', keyPrefix: 'cache:' },
  { maxSize: 100 * 1024 * 1024, maxKeys: 10000 } // 100MB, 10k keys
);

// Basic operations
await cache.set('user:123', userData, { ttl: 3600000 }); // 1 hour TTL
const user = await cache.get('user:123');
await cache.delete('user:123');
```

### Redis Cache

```typescript
import { RedisCache } from '@/boilerplate/cache';

const cache = new RedisCache(
  { namespace: 'app' },
  { host: 'localhost', port: 6379, password: 'secret' }
);

// Same API as memory cache
await cache.set('session:abc', sessionData);
const session = await cache.get('session:abc');
```

### Multi-Level Cache

```typescript
import { MultiLevelCache, MemoryCache, RedisCache } from '@/boilerplate/cache';

const l1Cache = new MemoryCache({}, { maxSize: 50 * 1024 * 1024 });
const l2Cache = new RedisCache({}, { host: 'localhost', port: 6379 });

const cache = new MultiLevelCache({}, {
  levels: [
    { name: 'memory', cache: l1Cache, priority: 10 },
    { name: 'redis', cache: l2Cache, priority: 5 }
  ],
  strategy: 'write-through',
  readStrategy: 'first-hit'
});

// Automatically uses both levels
await cache.set('data', complexData);
const data = await cache.get('data'); // Checks memory first, then Redis
```

## Cache Invalidation

### Tag-Based Invalidation

```typescript
// Set cache entries with tags
await cache.set('user:123:profile', profile, { 
  tags: ['user:123', 'profile', 'tenant:abc'] 
});
await cache.set('user:123:settings', settings, { 
  tags: ['user:123', 'settings', 'tenant:abc'] 
});

// Invalidate all entries for a user
await cache.invalidateByTags(['user:123']);

// Invalidate all entries for a tenant
await cache.invalidateByTags(['tenant:abc']);
```

### Pattern-Based Invalidation

```typescript
// Invalidate all user-related cache entries
await cache.invalidateByPattern('user:*');

// Invalidate specific user's data
await cache.invalidateByPattern('user:123:*');
```

### Automatic Invalidation Rules

```typescript
import { CacheInvalidator } from '@/boilerplate/cache';

const invalidator = new CacheInvalidator({ cacheManager: cache });

// Register custom invalidation rule
invalidator.registerRule({
  id: 'user_profile_change',
  name: 'Invalidate user cache on profile change',
  trigger: { type: 'user_action', action: 'profile_update' },
  targets: [
    { type: 'pattern', value: 'user:${userId}:*' },
    { type: 'tags', value: 'user:${userId}' }
  ],
  conditions: [
    { field: 'userId', operator: 'equals', value: '${userId}' }
  ]
});

// Trigger invalidation
await invalidator.onUserAction('123', 'profile_update', 'profile');
```

## Cache Warming

### Manual Warming

```typescript
import { CacheWarmer } from '@/boilerplate/cache';

const warmer = new CacheWarmer({
  cacheManager: cache,
  contentProvider: myContentProvider
});

// Warm popular content
await warmer.warmPopularContent();

// Warm user-specific content
await warmer.warmUserContent('user123');

// Warm tenant content
await warmer.warmTenantContent('tenant1');
```

### Scheduled Warming

```typescript
// Schedule daily warming of popular content
warmer.scheduleWarming('daily', {
  type: 'popular',
  priority: 10
});

// Schedule hourly user content warming
warmer.scheduleWarming('hourly', {
  type: 'user',
  identifier: 'user123',
  priority: 8
});
```

### Custom Content Provider

```typescript
const contentProvider = {
  async getPopularContent(limit = 100) {
    return await db.content.findMany({
      orderBy: { accessCount: 'desc' },
      take: limit
    });
  },

  async getUserContent(userId, limit = 50) {
    return await db.content.findMany({
      where: { userId },
      orderBy: { lastAccessed: 'desc' },
      take: limit
    });
  },

  async getTenantContent(tenantId, limit = 100) {
    return await db.content.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
      take: limit
    });
  },

  async getContentById(contentType, contentId) {
    return await db.content.findFirst({
      where: { type: contentType, id: contentId }
    });
  },

  async getContentByType(contentType, limit = 100) {
    return await db.content.findMany({
      where: { type: contentType },
      take: limit
    });
  }
};
```

## Performance Monitoring

### Basic Monitoring

```typescript
import { PerformanceMonitor } from '@/boilerplate/cache';

const monitor = new PerformanceMonitor({
  cacheManager: cache,
  enableLogging: true,
  monitoringInterval: 60000, // 1 minute
  alertThresholds: {
    hitRateWarning: 80,
    hitRateCritical: 60,
    memoryUsageWarning: 80,
    memoryUsageCritical: 95
  }
});

// Record operations
monitor.recordOperation('get', 25, true); // 25ms, successful
monitor.recordOperation('set', 15, true); // 15ms, successful
monitor.recordOperation('get', 100, false); // 100ms, failed

// Get current metrics
const metrics = monitor.getCurrentMetrics();
console.log(`Hit rate: ${metrics.cacheStats.hitRate}%`);
console.log(`Average response time: ${metrics.responseTime.average}ms`);

// Get performance summary
const summary = monitor.getPerformanceSummary();
console.log(`Trend: ${summary.trend}`);
console.log(`Active alerts: ${summary.activeAlerts}`);
```

### Performance Alerts

```typescript
// Get active alerts
const alerts = monitor.getActiveAlerts();
alerts.forEach(alert => {
  console.log(`${alert.type.toUpperCase()}: ${alert.message}`);
});

// Resolve alert
monitor.resolveAlert('alert_id');
```

### Optimization Recommendations

```typescript
// Get all recommendations
const recommendations = monitor.getRecommendations();
recommendations.forEach(rec => {
  console.log(`${rec.priority.toUpperCase()}: ${rec.title}`);
  console.log(`Impact: ${rec.impact}`);
  console.log(`Implementation: ${rec.implementation}`);
  console.log(`Estimated improvement: ${rec.estimatedImprovement}%`);
});

// Get recommendations by category
const cacheRecommendations = monitor.getRecommendations('cache_size');
const ttlRecommendations = monitor.getRecommendations('ttl');
```

## Advanced Usage

### Custom Cache Implementation

```typescript
import { BaseCacheManager } from '@/boilerplate/cache';

class CustomCache extends BaseCacheManager {
  private storage = new Map();

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    this.recordMetric('gets');
    
    const entry = this.storage.get(fullKey);
    if (entry && !this.isExpired(entry.createdAt, entry.ttl)) {
      this.recordMetric('hits');
      return entry.value;
    }
    
    this.recordMetric('misses');
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const entry = this.createCacheEntry(key, value, options);
    this.storage.set(fullKey, entry);
    this.recordMetric('sets');
  }

  // Implement other required methods...
}
```

### Cache Middleware for Express

```typescript
import { CacheManager } from '@/boilerplate/cache';

function createCacheMiddleware(cache: CacheManager, ttl = 3600000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `api:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Capture response
    const originalSend = res.json;
    res.json = function(data) {
      // Cache the response
      cache.set(cacheKey, data, { ttl }).catch(console.error);
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Usage
app.get('/api/users', createCacheMiddleware(cache, 300000), getUsersHandler);
```

### Cache Warming with Priorities

```typescript
const warmingTargets = [
  { type: 'popular', priority: 10 },
  { type: 'user', identifier: 'user123', priority: 8 },
  { type: 'tenant', identifier: 'tenant1', priority: 6 },
  { type: 'content', priority: 4 }
];

// Warm cache in priority order
await warmer.warmByPriority(warmingTargets);
```

## Configuration

### Environment Variables

```env
# Cache Configuration
CACHE_TYPE=multi-level # memory, redis, multi-level
CACHE_NAMESPACE=app
CACHE_KEY_PREFIX=cache:
CACHE_DEFAULT_TTL=3600000

# Memory Cache
MEMORY_CACHE_MAX_SIZE=104857600 # 100MB
MEMORY_CACHE_MAX_KEYS=10000
MEMORY_CACHE_USE_CLONES=true

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_KEY_PREFIX=cache:

# Performance Monitoring
PERF_MONITORING_ENABLED=true
PERF_MONITORING_INTERVAL=60000
PERF_HIT_RATE_WARNING=80
PERF_HIT_RATE_CRITICAL=60
PERF_MEMORY_WARNING=80
PERF_MEMORY_CRITICAL=95

# Cache Warming
CACHE_WARMING_ENABLED=true
CACHE_WARMING_CONCURRENCY=5
CACHE_WARMING_BATCH_SIZE=50
```

### Configuration Factory

```typescript
import { 
  MemoryCache, 
  RedisCache, 
  MultiLevelCache,
  CacheInvalidator,
  CacheWarmer,
  PerformanceMonitor
} from '@/boilerplate/cache';

export function createCacheSystem(config: any) {
  let cache;
  
  switch (config.type) {
    case 'memory':
      cache = new MemoryCache(config.cache, config.memory);
      break;
    
    case 'redis':
      cache = new RedisCache(config.cache, config.redis);
      break;
    
    case 'multi-level':
      const l1 = new MemoryCache(config.cache, config.memory);
      const l2 = new RedisCache(config.cache, config.redis);
      cache = new MultiLevelCache(config.cache, {
        levels: [
          { name: 'memory', cache: l1, priority: 10 },
          { name: 'redis', cache: l2, priority: 5 }
        ],
        strategy: config.multiLevel.strategy,
        readStrategy: config.multiLevel.readStrategy
      });
      break;
    
    default:
      throw new Error(`Unknown cache type: ${config.type}`);
  }
  
  const invalidator = new CacheInvalidator({ 
    cacheManager: cache,
    ...config.invalidation 
  });
  
  const warmer = new CacheWarmer({
    cacheManager: cache,
    contentProvider: config.contentProvider,
    ...config.warming
  });
  
  const monitor = new PerformanceMonitor({
    cacheManager: cache,
    ...config.monitoring
  });
  
  return { cache, invalidator, warmer, monitor };
}
```

## Best Practices

### 1. Cache Key Design

```typescript
// Good: Hierarchical, predictable keys
const userProfileKey = `user:${userId}:profile`;
const userPostsKey = `user:${userId}:posts:${page}`;
const tenantConfigKey = `tenant:${tenantId}:config`;

// Bad: Unpredictable, hard to invalidate
const badKey = `${Math.random()}_user_data`;
```

### 2. TTL Strategy

```typescript
// Different TTL for different content types
const ttlConfig = {
  'user:profile': 30 * 60 * 1000,      // 30 minutes
  'user:settings': 60 * 60 * 1000,     // 1 hour
  'content:page': 24 * 60 * 60 * 1000, // 24 hours
  'api:response': 5 * 60 * 1000,       // 5 minutes
  'static:asset': 7 * 24 * 60 * 60 * 1000 // 7 days
};

function getTTL(keyType: string): number {
  return ttlConfig[keyType] || 3600000; // Default 1 hour
}
```

### 3. Tag Strategy

```typescript
// Comprehensive tagging for flexible invalidation
await cache.set('user:123:profile', profile, {
  tags: [
    'user:123',           // User-specific
    'profile',            // Content type
    'tenant:abc',         // Tenant-specific
    'version:1.0',        // Version-specific
    'public'              // Visibility level
  ]
});
```

### 4. Error Handling

```typescript
async function safeGet<T>(key: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.error('Cache get error:', error);
  }
  
  // Fallback to original data source
  const data = await fallback();
  
  // Try to cache for next time
  try {
    await cache.set(key, data);
  } catch (error) {
    console.error('Cache set error:', error);
  }
  
  return data;
}
```

### 5. Monitoring Integration

```typescript
// Integrate with your monitoring system
monitor.on('alert', (alert) => {
  // Send to monitoring service
  monitoringService.sendAlert({
    service: 'cache',
    level: alert.type,
    message: alert.message,
    metadata: alert
  });
});

monitor.on('recommendation', (rec) => {
  // Log optimization opportunities
  logger.info('Cache optimization opportunity', {
    category: rec.category,
    priority: rec.priority,
    improvement: rec.estimatedImprovement
  });
});
```

## Testing

### Unit Tests

```typescript
import { MemoryCache } from '@/boilerplate/cache';

describe('Cache Integration', () => {
  let cache: MemoryCache;
  
  beforeEach(() => {
    cache = new MemoryCache();
  });
  
  afterEach(async () => {
    await cache.destroy();
  });
  
  it('should cache and retrieve data', async () => {
    await cache.set('test', { value: 42 });
    const result = await cache.get('test');
    expect(result).toEqual({ value: 42 });
  });
});
```

### Performance Tests

```typescript
describe('Cache Performance', () => {
  it('should handle high throughput', async () => {
    const cache = new MemoryCache();
    const operations = 10000;
    
    const start = Date.now();
    
    // Parallel operations
    const promises = Array.from({ length: operations }, (_, i) => 
      cache.set(`key${i}`, `value${i}`)
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - start;
    const opsPerSecond = operations / (duration / 1000);
    
    expect(opsPerSecond).toBeGreaterThan(1000); // At least 1k ops/sec
    
    await cache.destroy();
  });
});
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check cache size limits
   - Review TTL settings
   - Monitor eviction rates

2. **Low Hit Rates**
   - Verify cache warming
   - Check invalidation rules
   - Review key generation logic

3. **Performance Degradation**
   - Monitor response times
   - Check for cache hotspots
   - Review concurrency settings

### Debug Mode

```typescript
const cache = new MemoryCache({
  enableLogging: true,
  enableMetrics: true
});

// Enable detailed logging
cache.updateConfig({ enableLogging: true });

// Get detailed statistics
const stats = await cache.getStats();
console.log('Cache Statistics:', stats);
```

## Migration Guide

### From Simple Cache to Multi-Level

```typescript
// Before: Simple memory cache
const cache = new MemoryCache();

// After: Multi-level cache
const memoryCache = new MemoryCache({}, { maxSize: 50 * 1024 * 1024 });
const redisCache = new RedisCache({}, { host: 'localhost', port: 6379 });

const cache = new MultiLevelCache({}, {
  levels: [
    { name: 'memory', cache: memoryCache, priority: 10 },
    { name: 'redis', cache: redisCache, priority: 5 }
  ],
  strategy: 'write-through'
});

// API remains the same
await cache.set('key', 'value');
const value = await cache.get('key');
```

## Contributing

When extending the cache system:

1. **Follow the CacheManager interface**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Consider performance implications**
5. **Implement proper error handling**

For new cache backends:
1. Extend `BaseCacheManager`
2. Implement all required methods
3. Add configuration options
4. Include monitoring support
5. Write integration tests