/**
 * Time management utilities for task scheduling and duration handling
 */

import { Task, TaskStatus } from '@/types/Task.types';

/**
 * Time duration utilities
 */
export class TimeUtils {
  /**
   * Convert minutes to human-readable duration string
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Parse duration string to minutes
   */
  static parseDuration(durationStr: string): number | null {
    const trimmed = durationStr.trim().toLowerCase();
    
    // Match patterns like "2h 30m", "90m", "1.5h"
    const patterns = [
      /^(\d+(?:\.\d+)?)h?\s*(\d+)m?$/,  // "2h 30m" or "2 30"
      /^(\d+(?:\.\d+)?)h$/,             // "2h" or "2.5h"
      /^(\d+)m$/,                       // "90m"
      /^(\d+)$/                         // "90" (assume minutes)
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        if (pattern === patterns[0]) {
          // Hours and minutes
          const hours = parseFloat(match[1]);
          const minutes = parseInt(match[2], 10);
          return Math.round(hours * 60 + minutes);
        } else if (pattern === patterns[1]) {
          // Hours only
          const hours = parseFloat(match[1]);
          return Math.round(hours * 60);
        } else {
          // Minutes only
          const minutes = parseInt(match[1], 10);
          return minutes;
        }
      }
    }

    return null;
  }

  /**
   * Validate duration is within acceptable range (15 minutes to 24 hours)
   */
  static validateDuration(minutes: number): boolean {
    return minutes >= 15 && minutes <= 24 * 60;
  }

  /**
   * Calculate end time based on start time and duration
   */
  static calculateEndTime(startTime: Date, durationMinutes: number): Date {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    return endTime;
  }

  /**
   * Calculate start time based on end time and duration
   */
  static calculateStartTime(endTime: Date, durationMinutes: number): Date {
    const startTime = new Date(endTime);
    startTime.setMinutes(startTime.getMinutes() - durationMinutes);
    return startTime;
  }

  /**
   * Check if a task is overdue
   */
  static isTaskOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
      return false;
    }
    
    const now = new Date();
    return task.dueDate < now;
  }

  /**
   * Check if a task is due soon (within 24 hours)
   */
  static isTaskDueSoon(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
      return false;
    }
    
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return task.dueDate <= twentyFourHoursFromNow && task.dueDate > now;
  }

  /**
   * Get time status for a task (overdue, due soon, or normal)
   */
  static getTaskTimeStatus(task: Task): 'overdue' | 'due-soon' | 'normal' {
    if (this.isTaskOverdue(task)) {
      return 'overdue';
    }
    if (this.isTaskDueSoon(task)) {
      return 'due-soon';
    }
    return 'normal';
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else if (taskDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date: Date): string {
    return `${this.formatDate(date)} at ${this.formatTime(date)}`;
  }

  /**
   * Get tasks due today
   */
  static getTasksDueToday(tasks: Task[]): Task[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    return tasks.filter(task => {
      if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
        return false;
      }
      return task.dueDate >= startOfDay && task.dueDate <= endOfDay;
    });
  }

  /**
   * Get tasks due this week
   */
  static getTasksDueThisWeek(tasks: Task[]): Task[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setMilliseconds(-1);

    return tasks.filter(task => {
      if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
        return false;
      }
      return task.dueDate >= startOfWeek && task.dueDate <= endOfWeek;
    });
  }

  /**
   * Get overdue tasks
   */
  static getOverdueTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => this.isTaskOverdue(task));
  }

  /**
   * Sort tasks by due date (earliest first)
   */
  static sortTasksByDueDate(tasks: Task[], ascending: boolean = true): Task[] {
    return [...tasks].sort((a, b) => {
      // Tasks without due dates go to the end
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      const diff = a.dueDate.getTime() - b.dueDate.getTime();
      return ascending ? diff : -diff;
    });
  }

  /**
   * Sort tasks by priority (high to low)
   */
  static sortTasksByPriority(tasks: Task[]): Task[] {
    const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
    
    return [...tasks].sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Group tasks by time period
   */
  static groupTasksByTimePeriod(tasks: Task[]): {
    overdue: Task[];
    today: Task[];
    tomorrow: Task[];
    thisWeek: Task[];
    later: Task[];
    noDate: Task[];
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const groups = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      thisWeek: [] as Task[],
      later: [] as Task[],
      noDate: [] as Task[]
    };

    tasks.forEach(task => {
      if (!task.dueDate) {
        groups.noDate.push(task);
        return;
      }

      if (task.status === TaskStatus.COMPLETED) {
        return; // Skip completed tasks in time grouping
      }

      const taskDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate());

      if (task.dueDate < today) {
        groups.overdue.push(task);
      } else if (taskDate.getTime() === today.getTime()) {
        groups.today.push(task);
      } else if (taskDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(task);
      } else if (task.dueDate <= endOfWeek) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  }

  /**
   * Calculate time until due date
   */
  static getTimeUntilDue(dueDate: Date): string {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff < 0) {
      const overdue = Math.abs(diff);
      const days = Math.floor(overdue / (24 * 60 * 60 * 1000));
      const hours = Math.floor((overdue % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      
      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} overdue`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} overdue`;
      } else {
        return 'Overdue';
      }
    }
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Due now';
    }
  }
}