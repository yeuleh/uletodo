// Task related types and interfaces

export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date?: string;
  project_id?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_date?: string;
  project_id?: number;
  completed?: boolean;
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  project_id?: number;
}