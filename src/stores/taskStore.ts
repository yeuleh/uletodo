import { create } from 'zustand';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types/task';
import { LoadingState } from '../types/common';
import { TaskService } from '../services/taskService';

interface TaskStore extends LoadingState {
  tasks: Task[];
  
  // Actions
  loadTasks: () => Promise<void>;
  createTask: (request: CreateTaskRequest) => Promise<void>;
  updateTask: (id: number, request: UpdateTaskRequest) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  toggleTaskStatus: (id: number) => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await TaskService.getTasks();
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '加载任务失败',
        isLoading: false 
      });
    }
  },

  createTask: async (request: CreateTaskRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newTask = await TaskService.createTask(request);
      const { tasks } = get();
      set({ 
        tasks: [newTask, ...tasks], // Add new task to the beginning
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '创建任务失败',
        isLoading: false 
      });
      throw error; // Re-throw to handle in component
    }
  },

  updateTask: async (id: number, request: UpdateTaskRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTask = await TaskService.updateTask(id, request);
      const { tasks } = get();
      const updatedTasks = tasks.map(task => 
        task.id === id ? updatedTask : task
      );
      set({ 
        tasks: updatedTasks,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新任务失败',
        isLoading: false 
      });
      throw error; // Re-throw to handle in component
    }
  },

  deleteTask: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await TaskService.deleteTask(id);
      const { tasks } = get();
      const filteredTasks = tasks.filter(task => task.id !== id);
      set({ 
        tasks: filteredTasks,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除任务失败',
        isLoading: false 
      });
      throw error; // Re-throw to handle in component
    }
  },

  toggleTaskStatus: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTask = await TaskService.toggleTaskStatus(id);
      const { tasks } = get();
      const updatedTasks = tasks.map(task => 
        task.id === id ? updatedTask : task
      );
      set({ 
        tasks: updatedTasks,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '切换任务状态失败',
        isLoading: false 
      });
      throw error; // Re-throw to handle in component
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));