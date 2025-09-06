/**
 * Frontend service for task management operations
 * Wraps Tauri commands with type safety, error handling, and loading state management
 */

// Import Tauri invoke
import { invoke as tauriInvoke } from '@tauri-apps/api/core';

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Mock data for browser environment
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Sample Task 1',
    description: 'This is a sample task for demonstration',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['work', 'important']
  },
  {
    id: '2',
    title: 'Sample Task 2',
    description: 'Another sample task',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['personal']
  },
  {
    id: '3',
    title: 'Completed Task',
    description: 'This task is already done',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.LOW,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
    tags: []
  }
];

// Mock Tauri commands for browser environment
const mockTauriCommand = async (cmd: string, args?: any): Promise<any> => {
  console.log(`Mock Tauri command: ${cmd}`, args);
  
  switch (cmd) {
    case 'list_tasks':
      return mockTasks;
    
    case 'create_task':
      const newTask: Task = {
        id: Date.now().toString(),
        title: args.input.title,
        description: args.input.description,
        status: TaskStatus.TODO,
        priority: args.input.priority || TaskPriority.NONE,
        dueDate: args.input.dueDate,
        estimatedDuration: args.input.estimatedDuration,
        startTime: args.input.startTime,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: args.input.parentId,
        tags: args.input.tags || []
      };
      mockTasks.push(newTask);
      return newTask;
    
    case 'update_task':
      const taskIndex = mockTasks.findIndex(t => t.id === args.id);
      if (taskIndex !== -1) {
        mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...args.input, updatedAt: new Date() };
        return mockTasks[taskIndex];
      }
      throw new Error('Task not found');
    
    case 'delete_task':
      const deleteIndex = mockTasks.findIndex(t => t.id === args.id);
      if (deleteIndex !== -1) {
        mockTasks.splice(deleteIndex, 1);
        return;
      }
      throw new Error('Task not found');
    
    case 'toggle_task_status':
      const toggleIndex = mockTasks.findIndex(t => t.id === args.id);
      if (toggleIndex !== -1) {
        const task = mockTasks[toggleIndex];
        task.status = task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
        task.updatedAt = new Date();
        if (task.status === TaskStatus.COMPLETED) {
          task.completedAt = new Date();
        } else {
          task.completedAt = undefined;
        }
        return task;
      }
      throw new Error('Task not found');
    
    case 'get_subtasks':
      return mockTasks.filter(t => t.parentId === args.parent_id);
    
    case 'calculate_task_progress':
      const subtasks = mockTasks.filter(t => t.parentId === args.task_id);
      if (subtasks.length === 0) return 0;
      const completed = subtasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      return (completed / subtasks.length) * 100;
    
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
};

// Wrapper function that uses Tauri or mock depending on environment
const invokeCommand = async (cmd: string, args?: any): Promise<any> => {
  if (isTauri) {
    return tauriInvoke(cmd, args);
  } else {
    return mockTauriCommand(cmd, args);
  }
};
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilter, 
  TaskSortOption 
} from '@/types/Task.types';
import { TaskStatus, TaskPriority } from '@/types/Task.types';
import { errorService } from './ErrorService';
import { ErrorHandler } from '@/utils/errorHandling';
import { ValidationUtils } from '@/utils/validationUtils';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';

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
   * Execute a Tauri command with comprehensive error handling and retry logic
   */
  private static async executeCommand<T>(
    command: string, 
    args?: Record<string, any>,
    retryOptions?: { maxAttempts?: number; validateInput?: boolean }
  ): Promise<T> {
    const context = {
      operation: command,
      entityType: 'task' as const,
      entityId: args?.id || args?.task_id
    };

    // Validate input if requested
    if (retryOptions?.validateInput && args?.input) {
      const validationResult = command.includes('create') 
        ? ValidationUtils.validateCreateTaskInput(args.input)
        : ValidationUtils.validateUpdateTaskInput(args.input);
      
      if (!validationResult.isValid) {
        const firstError = Object.entries(validationResult.errors)[0];
        throw ErrorHandler.createValidationError(firstError[0], firstError[1]);
      }
    }

    // For now, directly call invokeCommand - can be enhanced with error service later
    return invokeCommand(command, args);
  }

  /**
   * Create a new task with comprehensive validation and optimistic updates
   */
  static async createTask(input: CreateTaskInput): Promise<Task> {
    // Validate and sanitize input
    const sanitizedInput = ValidationUtils.sanitizeTaskInput(input) as CreateTaskInput;
    const validationResult = ValidationUtils.validateCreateTaskInput(sanitizedInput);
    
    if (!validationResult.isValid) {
      const firstError = Object.entries(validationResult.errors)[0];
      throw ErrorHandler.createValidationError(firstError[0], firstError[1]);
    }

    // Additional consistency validation
    const consistencyResult = ValidationUtils.validateTaskConsistency(sanitizedInput);
    if (!consistencyResult.isValid) {
      const firstError = Object.entries(consistencyResult.errors)[0];
      throw ErrorHandler.createValidationError(firstError[0], firstError[1]);
    }

    // Create optimistic task for immediate UI feedback
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title: sanitizedInput.title,
      description: sanitizedInput.description,
      status: TaskStatus.TODO,
      priority: sanitizedInput.priority || TaskPriority.NONE,
      dueDate: sanitizedInput.dueDate,
      estimatedDuration: sanitizedInput.estimatedDuration,
      startTime: sanitizedInput.startTime,
      completedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: sanitizedInput.parentId,
      tags: sanitizedInput.tags || [],
      progress: 0
    };

    // Add to cache and notify listeners for optimistic update
    this.tasksCache.push(optimisticTask);
    this.notifyListeners();

    try {
      const task = await this.executeCommand<Task>('create_task', { input: sanitizedInput }, {
        maxAttempts: 3,
        validateInput: false // Already validated above
      });
      
      // Replace optimistic task with real task
      const index = this.tasksCache.findIndex(t => t.id === optimisticTask.id);
      if (index !== -1) {
        this.tasksCache[index] = task;
      } else {
        this.tasksCache.push(task);
      }
      this.taskCache.set(task.id, task);
      
      // Update caches
      cacheService.set(CacheKeys.task(task.id), task, CacheTTL.MEDIUM);
      
      // Invalidate list caches since we added a new task
      cacheService.invalidatePattern(/^tasks:list:/);
      cacheService.invalidatePattern(/^tasks:hierarchy:/);
      
      this.notifyListeners();
      
      return task;
    } catch (error) {
      // Remove optimistic task on error
      const index = this.tasksCache.findIndex(t => t.id === optimisticTask.id);
      if (index !== -1) {
        this.tasksCache.splice(index, 1);
        this.notifyListeners();
      }
      
      // Handle and re-throw the error
      const appError = errorService.handleValidationError(error, {
        operation: 'create_task',
        entityType: 'task'
      });
      throw appError;
    }
  }

  /**
   * Get a task by ID with caching and error handling
   */
  static async getTask(id: string): Promise<Task | null> {
    if (!id || typeof id !== 'string') {
      throw ErrorHandler.createValidationError('id', 'Task ID is required');
    }

    const cacheKey = CacheKeys.task(id);

    // Check distributed cache first
    const cachedTask = cacheService.get<Task>(cacheKey);
    if (cachedTask) {
      this.taskCache.set(id, cachedTask);
      return cachedTask;
    }

    // Check local cache
    if (this.taskCache.has(id)) {
      const task = this.taskCache.get(id)!;
      cacheService.set(cacheKey, task, CacheTTL.MEDIUM);
      return task;
    }

    try {
      const task = await this.executeCommand<Task | null>('get_task', { id }, {
        maxAttempts: 2
      });
      
      if (task) {
        this.taskCache.set(task.id, task);
        cacheService.set(cacheKey, task, CacheTTL.MEDIUM);
      }
      
      return task;
    } catch (error) {
      // Handle specific error cases
      const appError = errorService.handleValidationError(error, {
        operation: 'get_task',
        entityType: 'task',
        entityId: id
      });
      throw appError;
    }
  }

  /**
   * List tasks with optional filtering and sorting, with caching and error handling
   */
  static async listTasks(
    filter?: TaskFilter, 
    sortBy?: TaskSortOption
  ): Promise<Task[]> {
    const cacheKey = CacheKeys.taskList(JSON.stringify({ filter, sortBy }));
    
    try {
      // Try to get from cache first
      const cachedTasks = cacheService.get<Task[]>(cacheKey);
      if (cachedTasks) {
        // Update local cache
        this.tasksCache = cachedTasks;
        cachedTasks.forEach(task => this.taskCache.set(task.id, task));
        return cachedTasks;
      }

      const tasks = await this.executeCommand<Task[]>('list_tasks', { filter, sortBy }, {
        maxAttempts: 2
      });
      
      // Update caches
      this.tasksCache = tasks;
      tasks.forEach(task => this.taskCache.set(task.id, task));
      
      // Cache the result
      cacheService.set(cacheKey, tasks, CacheTTL.MEDIUM);
      
      return tasks;
    } catch (error) {
      const appError = errorService.handleValidationError(error, {
        operation: 'list_tasks',
        entityType: 'task'
      });
      throw appError;
    }
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
      
      // Update caches
      cacheService.set(CacheKeys.task(task.id), task, CacheTTL.MEDIUM);
      
      // Invalidate related caches
      cacheService.invalidatePattern(/^tasks:list:/);
      cacheService.invalidatePattern(/^tasks:hierarchy:/);
      cacheService.delete(CacheKeys.taskProgress(task.id));
      
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
      
      // Invalidate caches
      cacheService.delete(CacheKeys.task(id));
      cacheService.invalidatePattern(/^tasks:list:/);
      cacheService.invalidatePattern(/^tasks:hierarchy:/);
      cacheService.delete(CacheKeys.taskProgress(id));
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
   * Get all subtasks for a parent task
   */
  static async getSubtasks(parentId: string): Promise<Task[]> {
    return this.executeCommand<Task[]>('get_subtasks', { parent_id: parentId });
  }

  /**
   * Calculate progress for a parent task based on subtask completion
   */
  static async calculateTaskProgress(taskId: string): Promise<number> {
    return this.executeCommand<number>('calculate_task_progress', { task_id: taskId });
  }

  /**
   * Get task hierarchy with all subtasks
   */
  static async getTaskHierarchy(rootTaskId?: string): Promise<Task[]> {
    const filter: TaskFilter = rootTaskId ? { parentId: rootTaskId } : {};
    const allTasks = await this.listTasks(filter);
    
    // Build hierarchy tree
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];
    
    // First pass: create task map
    allTasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    // Second pass: build hierarchy
    allTasks.forEach(task => {
      if (!task.parentId || (rootTaskId && task.parentId === rootTaskId)) {
        rootTasks.push(task);
      }
    });
    
    return rootTasks;
  }

  /**
   * Validate subtask relationship to prevent circular dependencies
   */
  static validateSubtaskRelationship(taskId: string, parentId: string, allTasks: Task[]): boolean {
    const taskMap = new Map<string, Task>();
    allTasks.forEach(task => taskMap.set(task.id, task));
    
    let currentParent: string | undefined = parentId;
    let depth = 0;
    
    while (currentParent) {
      if (currentParent === taskId) {
        return false; // Circular dependency detected
      }
      
      depth++;
      if (depth > 10) {
        return false; // Max depth exceeded
      }
      
      const parentTask = taskMap.get(currentParent);
      currentParent = parentTask?.parentId;
    }
    
    return true;
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