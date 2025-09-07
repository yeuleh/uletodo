import { invoke } from '@tauri-apps/api/tauri';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types/task';

export class TaskService {
  /**
   * Get all tasks
   */
  static async getTasks(): Promise<Task[]> {
    try {
      const tasks = await invoke<Task[]>('get_tasks');
      return tasks;
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw new Error(`获取任务失败: ${error}`);
    }
  }

  /**
   * Create a new task
   */
  static async createTask(request: CreateTaskRequest): Promise<Task> {
    try {
      const task = await invoke<Task>('create_task', { request });
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error(`创建任务失败: ${error}`);
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(id: number, request: UpdateTaskRequest): Promise<Task> {
    try {
      const task = await invoke<Task>('update_task', { id, request });
      return task;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error(`更新任务失败: ${error}`);
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: number): Promise<void> {
    try {
      await invoke('delete_task', { id });
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error(`删除任务失败: ${error}`);
    }
  }

  /**
   * Toggle task completion status
   */
  static async toggleTaskStatus(id: number): Promise<Task> {
    try {
      const task = await invoke<Task>('toggle_task_status', { id });
      return task;
    } catch (error) {
      console.error('Failed to toggle task status:', error);
      throw new Error(`切换任务状态失败: ${error}`);
    }
  }
}