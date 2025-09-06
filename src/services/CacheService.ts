/**
 * Caching service for frequently accessed data to improve performance
 * Implements LRU (Least Recently Used) cache with TTL (Time To Live) support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // in milliseconds
  cleanupInterval?: number; // in milliseconds
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout | null;

  private constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    
    this.startCleanupTimer();
  }

  static getInstance(options?: CacheOptions): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(options);
    }
    return CacheService.instance;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    };

    // If cache is at max size, remove least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data as T;
  }

  /**
   * Check if a key exists in the cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      size: number;
      accessCount: number;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries: Array<{
      key: string;
      size: number;
      accessCount: number;
      age: number;
      ttl: number;
    }> = [];

    let totalAccesses = 0;
    let totalHits = 0;

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      const size = this.estimateSize(entry.data);
      
      entries.push({
        key,
        size,
        accessCount: entry.accessCount,
        age,
        ttl: entry.ttl
      });

      totalAccesses += entry.accessCount;
      if (entry.accessCount > 0) {
        totalHits += entry.accessCount;
      }
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }

  /**
   * Get or set pattern - if key exists, return it, otherwise compute and cache
   */
  async getOrSet<T>(
    key: string, 
    computeFn: () => Promise<T> | T, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await computeFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Refresh a cache entry by re-computing its value
   */
  async refresh<T>(key: string, computeFn: () => Promise<T> | T, ttl?: number): Promise<T> {
    this.delete(key);
    const data = await computeFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Preload cache with multiple entries
   */
  async preload<T>(entries: Array<{
    key: string;
    computeFn: () => Promise<T> | T;
    ttl?: number;
  }>): Promise<void> {
    const promises = entries.map(async ({ key, computeFn, ttl }) => {
      try {
        const data = await computeFn();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to preload cache entry for key: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Start the cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Remove expired entries from the cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Estimate the size of data in bytes (rough approximation)
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 0;
    }
  }
}

// Singleton instance
export const cacheService = CacheService.getInstance();

// Cache key generators for common patterns
export const CacheKeys = {
  task: (id: string) => `task:${id}`,
  taskList: (filter?: string) => `tasks:list:${filter || 'all'}`,
  taskHierarchy: (rootId?: string) => `tasks:hierarchy:${rootId || 'root'}`,
  taskProgress: (id: string) => `task:progress:${id}`,
  tag: (id: string) => `tag:${id}`,
  tagList: () => 'tags:list',
  auditLog: (taskId: string, page: number) => `audit:${taskId}:${page}`,
  auditLogList: (filter?: string, page?: number) => `audit:list:${filter || 'all'}:${page || 1}`,
  taskStats: () => 'tasks:stats',
  tagStats: () => 'tags:stats'
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000  // 1 hour
};