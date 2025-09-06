/**
 * Unit tests for CacheService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService, CacheKeys, CacheTTL } from '../CacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Create a new instance for each test
    cacheService = CacheService.getInstance({
      maxSize: 10,
      defaultTTL: 1000, // 1 second for testing
      cleanupInterval: 100 // 100ms for testing
    });
    cacheService.clear();
  });

  afterEach(() => {
    cacheService.stopCleanupTimer();
    cacheService.clear();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      const key = 'test-key';
      const value = { id: 1, name: 'test' };

      cacheService.set(key, value);
      const retrieved = cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      const value = 'test-value';

      expect(cacheService.has(key)).toBe(false);
      
      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);
    });

    it('should delete keys', () => {
      const key = 'test-key';
      const value = 'test-value';

      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);

      const deleted = cacheService.delete(key);
      expect(deleted).toBe(true);
      expect(cacheService.has(key)).toBe(false);
    });

    it('should clear all entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);

      cacheService.clear();

      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 50; // 50ms

      cacheService.set(key, value, ttl);
      expect(cacheService.get(key)).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cacheService.get(key)).toBeNull();
      expect(cacheService.has(key)).toBe(false);
    });

    it('should use default TTL when not specified', async () => {
      const key = 'test-key';
      const value = 'test-value';

      cacheService.set(key, value);
      expect(cacheService.get(key)).toBe(value);

      // Wait for default TTL (1000ms in test setup)
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cacheService.get(key)).toBeNull();
    });

    it('should update access statistics on get', () => {
      const key = 'test-key';
      const value = 'test-value';

      cacheService.set(key, value);
      
      // Access multiple times
      cacheService.get(key);
      cacheService.get(key);
      cacheService.get(key);

      const stats = cacheService.getStats();
      const entry = stats.entries.find(e => e.key === key);
      
      expect(entry?.accessCount).toBe(3);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when cache is full', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key${i}`, `value${i}`);
      }

      // Access some items to make them more recently used
      cacheService.get('key5');
      cacheService.get('key7');

      // Add one more item to trigger eviction
      cacheService.set('key10', 'value10');

      // The least recently used item should be evicted
      expect(cacheService.has('key0')).toBe(false);
      expect(cacheService.has('key5')).toBe(true);
      expect(cacheService.has('key7')).toBe(true);
      expect(cacheService.has('key10')).toBe(true);
    });
  });

  describe('getOrSet pattern', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedValue = 'cached-value';
      const computeFn = vi.fn().mockResolvedValue('computed-value');

      cacheService.set(key, cachedValue);

      const result = await cacheService.getOrSet(key, computeFn);

      expect(result).toBe(cachedValue);
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const key = 'test-key';
      const computedValue = 'computed-value';
      const computeFn = vi.fn().mockResolvedValue(computedValue);

      const result = await cacheService.getOrSet(key, computeFn);

      expect(result).toBe(computedValue);
      expect(computeFn).toHaveBeenCalledOnce();
      expect(cacheService.get(key)).toBe(computedValue);
    });

    it('should handle synchronous compute functions', async () => {
      const key = 'test-key';
      const computedValue = 'computed-value';
      const computeFn = vi.fn().mockReturnValue(computedValue);

      const result = await cacheService.getOrSet(key, computeFn);

      expect(result).toBe(computedValue);
      expect(cacheService.get(key)).toBe(computedValue);
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate entries matching string pattern', () => {
      cacheService.set('user:1', { id: 1 });
      cacheService.set('user:2', { id: 2 });
      cacheService.set('post:1', { id: 1 });
      cacheService.set('post:2', { id: 2 });

      const count = cacheService.invalidatePattern('user:');

      expect(count).toBe(2);
      expect(cacheService.has('user:1')).toBe(false);
      expect(cacheService.has('user:2')).toBe(false);
      expect(cacheService.has('post:1')).toBe(true);
      expect(cacheService.has('post:2')).toBe(true);
    });

    it('should invalidate entries matching regex pattern', () => {
      cacheService.set('task:list:all', []);
      cacheService.set('task:list:completed', []);
      cacheService.set('task:item:1', {});
      cacheService.set('user:list', []);

      const count = cacheService.invalidatePattern(/^task:list:/);

      expect(count).toBe(2);
      expect(cacheService.has('task:list:all')).toBe(false);
      expect(cacheService.has('task:list:completed')).toBe(false);
      expect(cacheService.has('task:item:1')).toBe(true);
      expect(cacheService.has('user:list')).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh cache entry with new value', async () => {
      const key = 'test-key';
      const oldValue = 'old-value';
      const newValue = 'new-value';

      cacheService.set(key, oldValue);
      expect(cacheService.get(key)).toBe(oldValue);

      const computeFn = vi.fn().mockResolvedValue(newValue);
      const result = await cacheService.refresh(key, computeFn);

      expect(result).toBe(newValue);
      expect(cacheService.get(key)).toBe(newValue);
      expect(computeFn).toHaveBeenCalledOnce();
    });
  });

  describe('preload', () => {
    it('should preload multiple cache entries', async () => {
      const entries = [
        {
          key: 'key1',
          computeFn: vi.fn().mockResolvedValue('value1')
        },
        {
          key: 'key2',
          computeFn: vi.fn().mockResolvedValue('value2'),
          ttl: 500
        }
      ];

      await cacheService.preload(entries);

      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
      expect(entries[0].computeFn).toHaveBeenCalledOnce();
      expect(entries[1].computeFn).toHaveBeenCalledOnce();
    });

    it('should handle preload errors gracefully', async () => {
      const entries = [
        {
          key: 'key1',
          computeFn: vi.fn().mockResolvedValue('value1')
        },
        {
          key: 'key2',
          computeFn: vi.fn().mockRejectedValue(new Error('Compute failed'))
        },
        {
          key: 'key3',
          computeFn: vi.fn().mockResolvedValue('value3')
        }
      ];

      // Should not throw even if one entry fails
      await expect(cacheService.preload(entries)).resolves.toBeUndefined();

      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBeNull(); // Failed to load
      expect(cacheService.get('key3')).toBe('value3');
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // Access key1 multiple times
      cacheService.get('key1');
      cacheService.get('key1');
      cacheService.get('key2');

      const stats = cacheService.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.entries).toHaveLength(2);
      
      const key1Entry = stats.entries.find(e => e.key === 'key1');
      const key2Entry = stats.entries.find(e => e.key === 'key2');
      
      expect(key1Entry?.accessCount).toBe(2);
      expect(key2Entry?.accessCount).toBe(1);
    });
  });

  describe('cache key generators', () => {
    it('should generate consistent cache keys', () => {
      expect(CacheKeys.task('123')).toBe('task:123');
      expect(CacheKeys.taskList('filter')).toBe('tasks:list:filter');
      expect(CacheKeys.taskList()).toBe('tasks:list:all');
      expect(CacheKeys.taskHierarchy('root')).toBe('tasks:hierarchy:root');
      expect(CacheKeys.taskHierarchy()).toBe('tasks:hierarchy:root');
      expect(CacheKeys.auditLog('task1', 1)).toBe('audit:task1:1');
    });
  });

  describe('cache TTL constants', () => {
    it('should provide TTL constants', () => {
      expect(CacheTTL.SHORT).toBe(1 * 60 * 1000);
      expect(CacheTTL.MEDIUM).toBe(5 * 60 * 1000);
      expect(CacheTTL.LONG).toBe(15 * 60 * 1000);
      expect(CacheTTL.VERY_LONG).toBe(60 * 60 * 1000);
    });
  });
});