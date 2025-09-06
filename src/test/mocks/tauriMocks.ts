/**
 * Mock implementations for Tauri commands and APIs
 */

import { vi } from 'vitest';
import type { Task, CreateTaskInput, UpdateTaskInput, Tag, AuditLog } from '@/types';
import { TaskStatus, TaskPriority } from '@/types/Task.types';

// Mock task data
export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'This is a test task',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tags: ['work', 'important']
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Another test task',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    tags: ['personal'],
    parentId: '1'
  },
  {
    id: '3',
    title: 'Completed Task',
    description: 'This task is done',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.LOW,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    completedAt: new Date('2024-01-03'),
    tags: []
  }
];

export const mockTags: Tag[] = [
  {
    id: '1',
    name: 'work',
    color: '#3b82f6',
    createdAt: new Date('2024-01-01'),
    usageCount: 2
  },
  {
    id: '2',
    name: 'personal',
    color: '#10b981',
    createdAt: new Date('2024-01-01'),
    usageCount: 1
  },
  {
    id: '3',
    name: 'important',
    color: '#ef4444',
    createdAt: new Date('2024-01-01'),
    usageCount: 1
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    taskId: '1',
    action: 'created',
    timestamp: new Date('2024-01-01').getTime() / 1000,
    oldValue: null,
    newValue: null,
    fieldName: null
  },
  {
    id: '2',
    taskId: '1',
    action: 'updated',
    timestamp: new Date('2024-01-02').getTime() / 1000,
    oldValue: 'Test Task',
    newValue: 'Test Task 1',
    fieldName: 'title'
  }
];

// Mock Tauri command implementations
export const createMockTauriInvoke = () => {
  let tasks = [...mockTasks];
  let tags = [...mockTags];
  let auditLogs = [...mockAuditLogs];

  return vi.fn().mockImplementation(async (command: string, args?: any) => {
    console.log(`Mock Tauri command: ${command}`, args);

    switch (command) {
      case 'list_tasks':
        return tasks.filter(task => {
          if (args?.filter?.status && !args.filter.status.includes(task.status)) {
            return false;
          }
          if (args?.filter?.priority && !args.filter.priority.includes(task.priority)) {
            return false;
          }
          if (args?.filter?.tags && args.filter.tags.length > 0) {
            const hasMatchingTag = args.filter.tags.some((tag: string) => task.tags.includes(tag));
            if (!hasMatchingTag) return false;
          }
          return true;
        });

      case 'get_task':
        return tasks.find(t => t.id === args?.id) || null;

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
        tasks.push(newTask);
        return newTask;

      case 'update_task':
        const taskIndex = tasks.findIndex(t => t.id === args?.id);
        if (taskIndex !== -1) {
          tasks[taskIndex] = { 
            ...tasks[taskIndex], 
            ...args.input, 
            updatedAt: new Date() 
          };
          return tasks[taskIndex];
        }
        throw new Error('Task not found');

      case 'delete_task':
        const deleteIndex = tasks.findIndex(t => t.id === args?.id);
        if (deleteIndex !== -1) {
          tasks.splice(deleteIndex, 1);
          return;
        }
        throw new Error('Task not found');

      case 'toggle_task_status':
        const toggleIndex = tasks.findIndex(t => t.id === args?.id);
        if (toggleIndex !== -1) {
          const task = tasks[toggleIndex];
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

      case 'list_tags':
        return tags;

      case 'create_tag':
        const newTag: Tag = {
          id: Date.now().toString(),
          name: args.input.name,
          color: args.input.color || '#3b82f6',
          createdAt: new Date(),
          usageCount: 0
        };
        tags.push(newTag);
        return newTag;

      case 'get_task_history':
        return auditLogs.filter(log => log.taskId === args?.taskId);

      case 'get_audit_logs':
        let filteredLogs = [...auditLogs];
        if (args?.filter?.action) {
          filteredLogs = filteredLogs.filter(log => 
            args.filter.action.includes(log.action)
          );
        }
        if (args?.limit) {
          const offset = args.offset || 0;
          filteredLogs = filteredLogs.slice(offset, offset + args.limit);
        }
        return filteredLogs;

      case 'get_subtasks':
        return tasks.filter(t => t.parentId === args?.parent_id);

      case 'calculate_task_progress':
        const subtasks = tasks.filter(t => t.parentId === args?.task_id);
        if (subtasks.length === 0) return 0;
        const completed = subtasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        return (completed / subtasks.length) * 100;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  });
};

// Reset mock data
export const resetMockData = () => {
  mockTasks.length = 0;
  mockTasks.push(
    {
      id: '1',
      title: 'Test Task 1',
      description: 'This is a test task',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      tags: ['work', 'important']
    },
    {
      id: '2',
      title: 'Test Task 2',
      description: 'Another test task',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      tags: ['personal'],
      parentId: '1'
    },
    {
      id: '3',
      title: 'Completed Task',
      description: 'This task is done',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      completedAt: new Date('2024-01-03'),
      tags: []
    }
  );
};