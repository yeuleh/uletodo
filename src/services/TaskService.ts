/**
 * Frontend service for task management operations
 * Wraps Tauri commands with type safety and error handling
 */

import { invoke } from '@tauri-apps/api/core';
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskFilter, 
  TaskSortOption 
} from '@/types/Task.types';

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(input: CreateTaskInput): Promise<Task> {
    return await invoke('create_task', { input });
  }

  /**
   * Get a task by ID
   */
  static async getTask(id: string): Promise<Task | null> {
    return await invoke('get_task', { id });
  }

  /**
   * List tasks with optional filtering and sorting
   */
  static async listTasks(
    filter?: TaskFilter, 
    sortBy?: TaskSortOption
  ): Promise<Task[]> {
    return await invoke('list_tasks', { filter, sortBy });
  }

  /**
   * Update an existing task
   */
  static async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    return await invoke('update_task', { id, input });
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: string): Promise<void> {
    return await invoke('delete_task', { id });
  }

  /**
   * Toggle task completion status
   */
  static async toggleTaskStatus(id: string): Promise<Task> {
    return await invoke('toggle_task_status', { id });
  }

  /**
   * Add a subtask to a parent task
   */
  static async addSubtask(parentId: string, input: CreateTaskInput): Promise<Task> {
    return await invoke('add_subtask', { parentId, input });
  }
}