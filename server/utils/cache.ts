import { Request, Response, NextFunction } from 'express';

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up expired keys every 60 seconds
    this.sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60000);

    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T = any>(key: string, data: T, ttlSeconds: number = 60): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  delPattern(prefix: string): number {
    let deleted = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const apiCache = new MemoryCache();

/**
 * Express middleware to cache GET requests for a given TTL in seconds.
 */
export function cacheResponse(ttlSeconds: number = 60, prefix: string = 'api') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if requested by user or authenticated admin (fresh data)
    if (req.headers['x-skip-cache'] === 'true' || req.query.skip_cache === 'true') {
      return next();
    }

    const cacheKey = `${prefix}:${req.originalUrl || req.url}`;
    const cached = apiCache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      res.json(cached);
      return;
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to capture and cache output
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(cacheKey, body, ttlSeconds);
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      }
      return originalJson(body);
    };

    next();
  };
}

export function invalidateCachePrefix(prefix: string): void {
  const count = apiCache.delPattern(prefix);
  if (count > 0) {
    console.log(`🧹 [Cache] Cleared ${count} cached items for prefix "${prefix}"`);
  }
}
