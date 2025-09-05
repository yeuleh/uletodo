/**
 * Frontend service for task management operations
 * Wraps Tauri commands with type safety, error handling, and loading state management
 */

import { invoke } from '@tauri-apps/api/core';
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilter, 
  TaskSortOption 
} from '@/types/Task.types';
import { TaskStatus, TaskPriority } from '@/types/Task.types';

export interface TaskError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResult<T> {
  data?: T;
  error?: TaskError;
  loading: boolean;
}

export type TaskServiceListener = (tasks: Task[]) => void;

export class TaskService {
  private static listeners: Set<TaskServiceListener> = new Set();
  private static taskCache: Map<string, Task> = new Map();
  private static tasksCache: Task[] = [];

  /**
   * Subscribe to task updates for optimistic UI updates
   */
  static subscribe(listener: TaskServiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of task changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.tasksCache]));
  }

  /**
   * Handle Tauri command errors with proper error mapping
   */
  private static handleError(error: any): TaskError {
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error);
        return {
          code: parsed.code || 'UNKNOWN_ERROR',
          message: parsed.message || error,
          details: parsed.details
        };
      } catch {
        return {
          code: 'UNKNOWN_ERROR',
          message: error
        };
      }
    }
    
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details
    };
  }

  /**
   * Execute a Tauri command with error handling
   */
  private static async executeCommand<T>(
    command: string, 
    args?: Record<string, any>
  ): Promise<T> {
    try {
      return await invoke(command, args);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new task with optimistic updates
   */
  static async createTask(input: CreateTaskInput): Promise<Task> {
    // Create optimistic task for immediate UI feedback
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title: input.title,
      description: input.description,
      status: TaskStatus.TODO,
      priority: input.priority || TaskPriority.NONE,
      dueDate: input.dueDate,
      estimatedDuration: input.estimatedDuration,
      startTime: input.startTime,
      completedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: input.parentId,
      tags: input.tags || [],
      progress: 0
    };

    // Add to cache and notify listeners for optimistic update
    this.tasksCache.push(optimisticTask);
    this.notifyListeners();

    try {
      const task = await this.executeCommand<Task>('create_task', { input });
      
      // Replace optimistic task with real task
      const index = this.tasksCache.findIndex(t => t.id === optimisticTask.id);
      if (index !== -1) {
        this.tasksCache[index] = task;
      } else {
        this.tasksCache.push(task);
      }
      this.taskCache.set(task.id, task);
      this.notifyListeners();
      
      return task;
    } catch (error) {
      // Remove optimistic task on error
      const index = this.tasksCache.findIndex(t => t.id === optimisticTask.id);
      if (index !== -1) {
        this.tasksCache.splice(index, 1);
        this.notifyListeners();
      }
      throw error;
    }
  }

  /**
   * Get a task by ID with caching
   */
  static async getTask(id: string): Promise<Task | null> {
    // Check cache first
    if (this.taskCache.has(id)) {
      return this.taskCache.get(id)!;
    }

    const task = await this.executeCommand<Task | null>('get_task', { id });
    
    if (task) {
      this.taskCache.set(task.id, task);
    }
    
    return task;
  }

  /**
   * List tasks with optional filtering and sorting, with caching
   */
  static async listTasks(
    filter?: TaskFilter, 
    sortBy?: TaskSortOption
  ): Promise<Task[]> {
    const tasks = await this.executeCommand<Task[]>('list_tasks', { filter, sortBy });
    
    // Update cache
    this.tasksCache = tasks;
    tasks.forEach(task => this.taskCache.set(task.id, task));
    
    return tasks;
  }

  /**
   * Update an existing task with optimistic updates
   */
  static async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    // Get current task for optimistic update
    const currentTask = this.taskCache.get(id);
    if (currentTask) {
      // Create optimistic updated task
      const optimisticTask: Task = {
        ...currentTask,
        ...input,
        updatedAt: new Date()
      };

      // Update cache and notify listeners
      this.taskCache.set(id, optimisticTask);
      const index = this.tasksCache.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasksCache[index] = optimisticTask;
      }
      this.notifyListeners();
    }

    try {
      const task = await this.executeCommand<Task>('update_task', { id, input });
      
      // Update with real task data
      this.taskCache.set(task.id, task);
      const index = this.tasksCache.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasksCache[index] = task;
      }
      this.notifyListeners();
      
      return task;
    } catch (error) {
      // Revert optimistic update on error
      if (currentTask) {
        this.taskCache.set(id, currentTask);
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index !== -1) {
          this.tasksCache[index] = currentTask;
        }
        this.notifyListeners();
      }
      throw error;
    }
  }

  /**
   * Delete a task with optimistic updates
   */
  static async deleteTask(id: string): Promise<void> {
    // Store task for potential rollback
    const taskToDelete = this.taskCache.get(id);
    
    // Optimistically remove from cache
    this.taskCache.delete(id);
    const index = this.tasksCache.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tasksCache.splice(index, 1);
    }
    this.notifyListeners();

    try {
      await this.executeCommand<void>('delete_task', { id });
    } catch (error) {
      // Restore task on error
      if (taskToDelete) {
        this.taskCache.set(id, taskToDelete);
        this.tasksCache.push(taskToDelete);
        this.notifyListeners();
      }
      throw error;
    }
  }

  /**
   * Toggle task completion status with optimistic updates
   */
  static async toggleTaskStatus(id: string): Promise<Task> {
    const currentTask = this.taskCache.get(id);
    if (currentTask) {
      // Create optimistic updated task
      const newStatus = currentTask.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
      const optimisticTask: Task = {
        ...currentTask,
        status: newStatus,
        completedAt: newStatus === TaskStatus.COMPLETED ? new Date() : undefined,
        updatedAt: new Date()
      };

      // Update cache and notify listeners
      this.taskCache.set(id, optimisticTask);
      const index = this.tasksCache.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasksCache[index] = optimisticTask;
      }
      this.notifyListeners();
    }

    try {
      const task = await this.executeCommand<Task>('toggle_task_status', { id });
      
      // Update with real task data
      this.taskCache.set(task.id, task);
      const index = this.tasksCache.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasksCache[index] = task;
      }
      this.notifyListeners();
      
      return task;
    } catch (error) {
      // Revert optimistic update on error
      if (currentTask) {
        this.taskCache.set(id, currentTask);
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index !== -1) {
          this.tasksCache[index] = currentTask;
        }
        this.notifyListeners();
      }
      throw error;
    }
  }

  /**
   * Add a subtask to a parent task with optimistic updates
   */
  static async addSubtask(parentId: string, input: CreateTaskInput): Promise<Task> {
    // Create input with parent ID
    const subtaskInput: CreateTaskInput = {
      ...input,
      parentId
    };

    return this.createTask(subtaskInput);
  }

  /**
   * Clear all caches (useful for testing or data refresh)
   */
  static clearCache(): void {
    this.taskCache.clear();
    this.tasksCache = [];
  }

  /**
   * Get cached tasks (useful for immediate UI updates)
   */
  static getCachedTasks(): Task[] {
    return [...this.tasksCache];
  }
}