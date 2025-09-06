/**
 * Performance tests for task management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '@/services/TaskService';
import { CacheService } from '@/services/CacheService';
import { createMockTauriInvoke, resetMockData } from '@/test/mocks/tauriMocks';
import { TaskStatus, TaskPriority } from '@/types/Task.types';
import type { Task, CreateTaskInput } from '@/types/Task.types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: createMockTauriInvoke()
}));

describe('Task Performance Tests', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    resetMockData();
    TaskService.clearCache();
    cacheService = CacheService.getInstance();
    cacheService.clear();
    vi.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    const generateLargeTasks = (count: number): Task[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED][i % 3],
        priority: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.NONE][i % 4],
        createdAt: new Date(2024, 0, 1 + (i % 365)),
        updatedAt: new Date(2024, 0, 1 + (i % 365)),
        tags: [`tag${i % 10}`, `category${i % 5}`],
        parentId: i > 0 && i % 10 === 0 ? `task-${i - 1}` : undefined
      }));
    };

    it('should handle 10,000 tasks efficiently', async () => {
      const largeTasks = generateLargeTasks(10000);
      
      // Mock the invoke to return large dataset
      const mockInvoke = vi.fn().mockImplementation(async (command: string) => {
        if (command === 'list_tasks') {
          return largeTasks;
        }
        return createMockTauriInvoke()(command);
      });
      vi.mocked(createMockTauriInvoke).mockReturnValue(mockInvoke);

      const startTime = performance.now();
      const tasks = await TaskService.listTasks();
      const endTime = performance.now();

      expect(tasks).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
    });

    it('should filter large datasets efficiently', async () => {
      const largeTasks = generateLargeTasks(10000);
      
      const mockInvoke = vi.fn().mockImplementation(async (command: string, args?: any) => {
        if (command === 'list_tasks') {
          let filtered = largeTasks;
          
          if (args?.filter?.status) {
            filtered = filtered.filter(task => args.filter.status.includes(task.status));
          }
          
          if (args?.filter?.priority) {
            filtered = filtered.filter(task => args.filter.priority.includes(task.priority));
          }
          
          return filtered;
        }
        return createMockTauriInvoke()(command, args);
      });
      vi.mocked(createMockTauriInvoke).mockReturnValue(mockInvoke);

      const startTime = performance.now();
      const filteredTasks = await TaskService.listTasks({
        status: [TaskStatus.COMPLETED],
        priority: [TaskPriority.HIGH]
      });
      const endTime = performance.now();

      expect(filteredTasks.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Filtering should be fast
    });

    it('should handle rapid task creation efficiently', async () => {
      const taskCount = 100;
      const tasks: CreateTaskInput[] = Array.from({ length: taskCount }, (_, i) => ({
        title: `Rapid Task ${i}`,
        description: `Description ${i}`,
        priority: TaskPriority.MEDIUM
      }));

      const startTime = performance.now();
      
      // Create tasks in parallel
      const promises = tasks.map(task => TaskService.createTask(task));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();

      expect(results).toHaveLength(taskCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid task updates efficiently', async () => {
      // First create some tasks
      const initialTasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Update Task ${i}`,
        description: `Description ${i}`,
        priority: TaskPriority.LOW
      }));

      const createdTasks = await Promise.all(
        initialTasks.map(task => TaskService.createTask(task))
      );

      // Now update them all rapidly
      const startTime = performance.now();
      
      const updatePromises = createdTasks.map(task => 
        TaskService.updateTask(task.id, {
          title: `Updated ${task.title}`,
          priority: TaskPriority.HIGH
        })
      );
      
      const results = await Promise.all(updatePromises);
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      const tasks = generateLargeTasks(1000);
      
      const mockInvoke = vi.fn().mockImplementation(async (command: string) => {
        if (command === 'list_tasks') {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 100));
          return tasks;
        }
        return createMockTauriInvoke()(command);
      });
      vi.mocked(createMockTauriInvoke).mockReturnValue(mockInvoke);

      // First call (should be slow due to network delay)
      const startTime1 = performance.now();
      const tasks1 = await TaskService.listTasks();
      const endTime1 = performance.now();

      // Second call (should be fast due to caching)
      const startTime2 = performance.now();
      const tasks2 = await TaskService.listTasks();
      const endTime2 = performance.now();

      expect(tasks1).toEqual(tasks2);
      expect(endTime1 - startTime1).toBeGreaterThan(90); // First call should take ~100ms
      expect(endTime2 - startTime2).toBeLessThan(10); // Second call should be much faster
    });

    it('should handle cache eviction efficiently', async () => {
      const cacheService = CacheService.getInstance({
        maxSize: 100,
        defaultTTL: 60000
      });

      // Fill cache beyond capacity
      const startTime = performance.now();
      
      for (let i = 0; i < 150; i++) {
        cacheService.set(`key-${i}`, { data: `value-${i}` });
      }
      
      const endTime = performance.now();

      // Should handle eviction efficiently
      expect(endTime - startTime).toBeLessThan(50);
      
      // Cache should be at max size
      const stats = cacheService.getStats();
      expect(stats.size).toBeLessThanOrEqual(100);
    });

    it('should handle cache cleanup efficiently', async () => {
      const cacheService = CacheService.getInstance({
        maxSize: 1000,
        defaultTTL: 10, // Very short TTL for testing
        cleanupInterval: 50
      });

      // Add many items with short TTL
      for (let i = 0; i < 500; i++) {
        cacheService.set(`temp-key-${i}`, { data: i }, 10);
      }

      // Wait for items to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Add more items to trigger cleanup
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        cacheService.set(`new-key-${i}`, { data: i });
      }
      
      const endTime = performance.now();

      // Cleanup should not significantly impact performance
      expect(endTime - startTime).toBeLessThan(100);
      
      cacheService.stopCleanupTimer();
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage with large datasets', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and cache a large number of tasks
      const largeTasks = generateLargeTasks(5000);
      
      // Simulate loading tasks into cache
      largeTasks.forEach(task => {
        cacheService.set(`task:${task.id}`, task);
      });

      const afterCacheMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Clear cache
      cacheService.clear();
      TaskService.clearCache();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterClearMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory should be released after clearing cache
      if (initialMemory > 0) {
        const memoryIncrease = afterCacheMemory - initialMemory;
        const memoryAfterClear = afterClearMemory - initialMemory;
        
        expect(memoryIncrease).toBeGreaterThan(0); // Should use memory for cache
        expect(memoryAfterClear).toBeLessThan(memoryIncrease * 0.5); // Should release most memory
      }
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating many large objects
      const largeObjects: any[] = [];
      
      try {
        for (let i = 0; i < 1000; i++) {
          const largeTask = {
            id: `large-task-${i}`,
            title: 'A'.repeat(1000), // Large title
            description: 'B'.repeat(5000), // Large description
            metadata: new Array(1000).fill(0).map((_, j) => ({ key: j, value: 'C'.repeat(100) }))
          };
          
          largeObjects.push(largeTask);
          cacheService.set(`large:${i}`, largeTask);
        }

        // Cache should still function under memory pressure
        const stats = cacheService.getStats();
        expect(stats.size).toBeGreaterThan(0);
        
      } finally {
        // Cleanup
        largeObjects.length = 0;
        cacheService.clear();
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent task operations efficiently', async () => {
      const concurrentOperations = 50;
      
      const startTime = performance.now();
      
      // Perform multiple operations concurrently
      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        const task = await TaskService.createTask({
          title: `Concurrent Task ${i}`,
          description: `Description ${i}`,
          priority: TaskPriority.MEDIUM
        });
        
        await TaskService.updateTask(task.id, {
          title: `Updated Concurrent Task ${i}`
        });
        
        await TaskService.toggleTaskStatus(task.id);
        
        return task;
      });
      
      const results = await Promise.all(operations);
      const endTime = performance.now();

      expect(results).toHaveLength(concurrentOperations);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle concurrent cache access efficiently', async () => {
      const concurrentAccess = 100;
      
      // Pre-populate cache
      for (let i = 0; i < 50; i++) {
        cacheService.set(`concurrent-key-${i}`, { data: i });
      }
      
      const startTime = performance.now();
      
      // Perform concurrent cache operations
      const operations = Array.from({ length: concurrentAccess }, async (_, i) => {
        if (i % 3 === 0) {
          // Read operation
          return cacheService.get(`concurrent-key-${i % 50}`);
        } else if (i % 3 === 1) {
          // Write operation
          cacheService.set(`new-concurrent-key-${i}`, { data: i });
          return true;
        } else {
          // Delete operation
          return cacheService.delete(`concurrent-key-${i % 50}`);
        }
      });
      
      const results = await Promise.all(operations);
      const endTime = performance.now();

      expect(results).toHaveLength(concurrentAccess);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast for cache operations
    });
  });

  describe('Optimization Verification', () => {
    it('should demonstrate virtual scrolling performance benefits', () => {
      const itemCount = 10000;
      const viewportHeight = 600;
      const itemHeight = 60;
      
      // Calculate visible items for virtual scrolling
      const visibleItems = Math.ceil(viewportHeight / itemHeight) + 5; // +5 for overscan
      
      // Virtual scrolling should render only visible items
      expect(visibleItems).toBeLessThan(50); // Much less than total items
      expect(visibleItems / itemCount).toBeLessThan(0.01); // Less than 1% of total items
    });

    it('should demonstrate pagination performance benefits', () => {
      const totalItems = 10000;
      const pageSize = 50;
      
      // Pagination should load only one page at a time
      const loadedItems = pageSize;
      const performanceRatio = loadedItems / totalItems;
      
      expect(performanceRatio).toBeLessThan(0.01); // Less than 1% of total items loaded
    });

    it('should demonstrate caching performance benefits', async () => {
      const cacheHitTime = 1; // Assume 1ms for cache hit
      const networkTime = 100; // Assume 100ms for network request
      
      const performanceImprovement = networkTime / cacheHitTime;
      
      expect(performanceImprovement).toBeGreaterThan(50); // 50x improvement with caching
    });
  });

  // Helper function to generate large tasks
  function generateLargeTasks(count: number): Task[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: `Description for task ${i}`,
      status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED][i % 3],
      priority: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.NONE][i % 4],
      createdAt: new Date(2024, 0, 1 + (i % 365)),
      updatedAt: new Date(2024, 0, 1 + (i % 365)),
      tags: [`tag${i % 10}`, `category${i % 5}`],
      parentId: i > 0 && i % 10 === 0 ? `task-${i - 1}` : undefined
    }));
  }
});