/**
 * Unit tests for TaskService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskService } from '../TaskService';
import { createMockTauriInvoke, resetMockData } from '@/test/mocks/tauriMocks';
import { TaskStatus, TaskPriority } from '@/types/Task.types';
import type { CreateTaskInput, UpdateTaskInput } from '@/types/Task.types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: createMockTauriInvoke()
}));

describe('TaskService', () => {
  beforeEach(() => {
    resetMockData();
    TaskService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TaskService.clearCache();
  });

  describe('createTask', () => {
    it('should create a new task with valid input', async () => {
      const input: CreateTaskInput = {
        title: 'New Test Task',
        description: 'A new task for testing',
        priority: TaskPriority.HIGH,
        tags: ['test']
      };

      const task = await TaskService.createTask(input);

      expect(task).toBeDefined();
      expect(task.title).toBe(input.title);
      expect(task.description).toBe(input.description);
      expect(task.priority).toBe(input.priority);
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.tags).toEqual(['test']);
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should throw validation error for empty title', async () => {
      const input: CreateTaskInput = {
        title: '',
        description: 'Task with empty title'
      };

      await expect(TaskService.createTask(input)).rejects.toThrow();
    });

    it('should throw validation error for title that is too long', async () => {
      const input: CreateTaskInput = {
        title: 'a'.repeat(201), // Exceeds 200 character limit
        description: 'Task with very long title'
      };

      await expect(TaskService.createTask(input)).rejects.toThrow();
    });

    it('should create subtask with parent relationship', async () => {
      const input: CreateTaskInput = {
        title: 'Subtask',
        description: 'A subtask',
        parentId: '1'
      };

      const task = await TaskService.createTask(input);

      expect(task.parentId).toBe('1');
    });
  });

  describe('getTask', () => {
    it('should retrieve existing task by ID', async () => {
      const task = await TaskService.getTask('1');

      expect(task).toBeDefined();
      expect(task?.id).toBe('1');
      expect(task?.title).toBe('Test Task 1');
    });

    it('should return null for non-existent task', async () => {
      const task = await TaskService.getTask('non-existent');

      expect(task).toBeNull();
    });

    it('should throw error for invalid ID', async () => {
      await expect(TaskService.getTask('')).rejects.toThrow();
      await expect(TaskService.getTask(null as any)).rejects.toThrow();
    });

    it('should use cache for repeated requests', async () => {
      // First request
      const task1 = await TaskService.getTask('1');
      
      // Second request should use cache
      const task2 = await TaskService.getTask('1');

      expect(task1).toEqual(task2);
    });
  });

  describe('listTasks', () => {
    it('should return all tasks when no filter is provided', async () => {
      const tasks = await TaskService.listTasks();

      expect(tasks).toHaveLength(3);
      expect(tasks.map(t => t.id)).toEqual(['1', '2', '3']);
    });

    it('should filter tasks by status', async () => {
      const tasks = await TaskService.listTasks({
        status: [TaskStatus.COMPLETED]
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe(TaskStatus.COMPLETED);
    });

    it('should filter tasks by priority', async () => {
      const tasks = await TaskService.listTasks({
        priority: [TaskPriority.HIGH]
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should filter tasks by tags', async () => {
      const tasks = await TaskService.listTasks({
        tags: ['work']
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].tags).toContain('work');
    });

    it('should use cache for repeated requests with same filter', async () => {
      const filter = { status: [TaskStatus.TODO] };
      
      // First request
      const tasks1 = await TaskService.listTasks(filter);
      
      // Second request should use cache
      const tasks2 = await TaskService.listTasks(filter);

      expect(tasks1).toEqual(tasks2);
    });
  });

  describe('updateTask', () => {
    it('should update task with valid input', async () => {
      const input: UpdateTaskInput = {
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: TaskPriority.LOW
      };

      const task = await TaskService.updateTask('1', input);

      expect(task.title).toBe(input.title);
      expect(task.description).toBe(input.description);
      expect(task.priority).toBe(input.priority);
      expect(task.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent task', async () => {
      const input: UpdateTaskInput = {
        title: 'Updated Title'
      };

      await expect(TaskService.updateTask('non-existent', input)).rejects.toThrow();
    });

    it('should validate input before updating', async () => {
      const input: UpdateTaskInput = {
        title: '' // Empty title should fail validation
      };

      await expect(TaskService.updateTask('1', input)).rejects.toThrow();
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      await TaskService.deleteTask('1');

      // Verify task is deleted
      const task = await TaskService.getTask('1');
      expect(task).toBeNull();
    });

    it('should throw error for non-existent task', async () => {
      await expect(TaskService.deleteTask('non-existent')).rejects.toThrow();
    });
  });

  describe('toggleTaskStatus', () => {
    it('should toggle task from TODO to COMPLETED', async () => {
      const task = await TaskService.toggleTaskStatus('1');

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.completedAt).toBeDefined();
    });

    it('should toggle task from COMPLETED to TODO', async () => {
      // First toggle to completed
      await TaskService.toggleTaskStatus('3');
      
      // Then toggle back to todo
      const task = await TaskService.toggleTaskStatus('3');

      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.completedAt).toBeUndefined();
    });

    it('should throw error for non-existent task', async () => {
      await expect(TaskService.toggleTaskStatus('non-existent')).rejects.toThrow();
    });
  });

  describe('addSubtask', () => {
    it('should create subtask with parent relationship', async () => {
      const input: CreateTaskInput = {
        title: 'New Subtask',
        description: 'A new subtask'
      };

      const subtask = await TaskService.addSubtask('1', input);

      expect(subtask.parentId).toBe('1');
      expect(subtask.title).toBe(input.title);
    });
  });

  describe('getSubtasks', () => {
    it('should return subtasks for parent task', async () => {
      const subtasks = await TaskService.getSubtasks('1');

      expect(subtasks).toHaveLength(1);
      expect(subtasks[0].parentId).toBe('1');
    });

    it('should return empty array for task with no subtasks', async () => {
      const subtasks = await TaskService.getSubtasks('3');

      expect(subtasks).toHaveLength(0);
    });
  });

  describe('calculateTaskProgress', () => {
    it('should calculate progress based on completed subtasks', async () => {
      const progress = await TaskService.calculateTaskProgress('1');

      expect(progress).toBe(0); // No completed subtasks initially
    });

    it('should return 0 for task with no subtasks', async () => {
      const progress = await TaskService.calculateTaskProgress('3');

      expect(progress).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache when clearCache is called', async () => {
      // Load task into cache
      await TaskService.getTask('1');
      
      // Clear cache
      TaskService.clearCache();
      
      // Verify cache is empty
      const cachedTasks = TaskService.getCachedTasks();
      expect(cachedTasks).toHaveLength(0);
    });

    it('should return cached tasks', async () => {
      // Load tasks into cache
      await TaskService.listTasks();
      
      // Get cached tasks
      const cachedTasks = TaskService.getCachedTasks();
      expect(cachedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('optimistic updates', () => {
    it('should provide immediate feedback for task creation', async () => {
      const input: CreateTaskInput = {
        title: 'Optimistic Task',
        description: 'Testing optimistic updates'
      };

      // Subscribe to updates
      const updates: any[] = [];
      const unsubscribe = TaskService.subscribe((tasks) => {
        updates.push([...tasks]);
      });

      try {
        await TaskService.createTask(input);

        // Should have received at least one update
        expect(updates.length).toBeGreaterThan(0);
      } finally {
        unsubscribe();
      }
    });

    it('should revert optimistic updates on error', async () => {
      const input: CreateTaskInput = {
        title: '', // This will cause validation error
        description: 'This should fail'
      };

      // Subscribe to updates
      const updates: any[] = [];
      const unsubscribe = TaskService.subscribe((tasks) => {
        updates.push([...tasks]);
      });

      try {
        await expect(TaskService.createTask(input)).rejects.toThrow();

        // Should have reverted the optimistic update
        const finalTasks = TaskService.getCachedTasks();
        expect(finalTasks.some(t => t.title === '')).toBe(false);
      } finally {
        unsubscribe();
      }
    });
  });
});