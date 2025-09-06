/**
 * Notification utilities for time-sensitive task alerts
 */

import { Task } from '@/types/Task.types';
import { TimeUtils } from './timeUtils';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export interface TaskNotification {
  id: string;
  taskId: string;
  type: 'overdue' | 'due-soon' | 'starting-soon' | 'reminder';
  scheduledTime: Date;
  isShown: boolean;
}

export class NotificationUtils {
  private static readonly STORAGE_KEY = 'uletodo_notifications';
  private static readonly PERMISSION_KEY = 'uletodo_notification_permission';
  private static notifications: Map<string, TaskNotification> = new Map();
  private static checkInterval: number | null = null;

  /**
   * Request notification permission from the user
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    localStorage.setItem(this.PERMISSION_KEY, permission);
    return permission;
  }

  /**
   * Check if notifications are supported and permitted
   */
  static isNotificationSupported(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Show a notification
   */
  static showNotification(options: NotificationOptions): Notification | null {
    if (!this.isNotificationSupported()) {
      console.warn('Notifications not supported or not permitted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        // Note: actions are not widely supported yet
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Schedule notifications for a task
   */
  static scheduleTaskNotifications(task: Task): void {
    if (!task.dueDate) return;

    const now = new Date();
    const notifications: TaskNotification[] = [];

    // Overdue notification (check if already overdue)
    if (TimeUtils.isTaskOverdue(task)) {
      notifications.push({
        id: `${task.id}-overdue`,
        taskId: task.id,
        type: 'overdue',
        scheduledTime: now,
        isShown: false
      });
    }

    // Due soon notification (24 hours before)
    const dueSoonTime = new Date(task.dueDate.getTime() - 24 * 60 * 60 * 1000);
    if (dueSoonTime > now) {
      notifications.push({
        id: `${task.id}-due-soon`,
        taskId: task.id,
        type: 'due-soon',
        scheduledTime: dueSoonTime,
        isShown: false
      });
    }

    // Starting soon notification (if task has start time)
    if (task.startTime) {
      const startingSoonTime = new Date(task.startTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      if (startingSoonTime > now) {
        notifications.push({
          id: `${task.id}-starting-soon`,
          taskId: task.id,
          type: 'starting-soon',
          scheduledTime: startingSoonTime,
          isShown: false
        });
      }
    }

    // Store notifications
    notifications.forEach(notification => {
      this.notifications.set(notification.id, notification);
    });

    this.saveNotifications();
    this.startNotificationChecker();
  }

  /**
   * Cancel notifications for a task
   */
  static cancelTaskNotifications(taskId: string): void {
    const toRemove: string[] = [];
    
    this.notifications.forEach((notification, id) => {
      if (notification.taskId === taskId) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      this.notifications.delete(id);
    });

    this.saveNotifications();
  }

  /**
   * Update notifications when task changes
   */
  static updateTaskNotifications(task: Task): void {
    this.cancelTaskNotifications(task.id);
    this.scheduleTaskNotifications(task);
  }

  /**
   * Check for due notifications and show them
   */
  static checkNotifications(tasks: Task[]): void {
    const now = new Date();
    const tasksMap = new Map(tasks.map(task => [task.id, task]));

    this.notifications.forEach((notification, id) => {
      if (notification.isShown || notification.scheduledTime > now) {
        return;
      }

      const task = tasksMap.get(notification.taskId);
      if (!task) {
        // Task no longer exists, remove notification
        this.notifications.delete(id);
        return;
      }

      // Skip if task is completed
      if (task.status === 'completed') {
        this.notifications.delete(id);
        return;
      }

      this.showTaskNotification(task, notification);
      notification.isShown = true;
    });

    this.saveNotifications();
  }

  /**
   * Show a specific task notification
   */
  private static showTaskNotification(task: Task, notification: TaskNotification): void {
    let title: string;
    let body: string;
    let requireInteraction = false;

    switch (notification.type) {
      case 'overdue':
        title = '⚠️ Task Overdue';
        body = `"${task.title}" is overdue!`;
        requireInteraction = true;
        break;
      
      case 'due-soon':
        title = '⏰ Task Due Soon';
        body = `"${task.title}" is due in 24 hours`;
        break;
      
      case 'starting-soon':
        title = '🚀 Task Starting Soon';
        body = `"${task.title}" starts in 15 minutes`;
        break;
      
      case 'reminder':
        title = '📋 Task Reminder';
        body = `Don't forget: "${task.title}"`;
        break;
      
      default:
        return;
    }

    const notificationObj = this.showNotification({
      title,
      body,
      tag: `task-${task.id}`,
      requireInteraction
    });

    if (notificationObj) {
      notificationObj.onclick = () => {
        // Focus the window and potentially navigate to the task
        window.focus();
        notificationObj.close();
        
        // Dispatch custom event for task selection
        window.dispatchEvent(new CustomEvent('taskNotificationClick', {
          detail: { taskId: task.id, task }
        }));
      };
    }
  }

  /**
   * Start the notification checker interval
   */
  private static startNotificationChecker(): void {
    if (this.checkInterval !== null) {
      return; // Already running
    }

    // Check every minute
    this.checkInterval = window.setInterval(() => {
      // This will be called by the main app with current tasks
      // We can't access tasks directly from here
    }, 60 * 1000);
  }

  /**
   * Stop the notification checker
   */
  static stopNotificationChecker(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get all pending notifications
   */
  static getPendingNotifications(): TaskNotification[] {
    return Array.from(this.notifications.values())
      .filter(notification => !notification.isShown);
  }

  /**
   * Clear all notifications
   */
  static clearAllNotifications(): void {
    this.notifications.clear();
    this.saveNotifications();
  }

  /**
   * Load notifications from storage
   */
  static loadNotifications(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications.clear();
        
        data.forEach((notification: any) => {
          this.notifications.set(notification.id, {
            ...notification,
            scheduledTime: new Date(notification.scheduledTime)
          });
        });
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Save notifications to storage
   */
  private static saveNotifications(): void {
    try {
      const data = Array.from(this.notifications.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Initialize the notification system
   */
  static initialize(): void {
    this.loadNotifications();
    
    // Clean up old notifications on startup
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    this.notifications.forEach((notification, id) => {
      if (notification.scheduledTime < oneDayAgo && notification.isShown) {
        this.notifications.delete(id);
      }
    });
    
    this.saveNotifications();
  }

  /**
   * Get notification settings
   */
  static getNotificationSettings(): {
    enabled: boolean;
    permission: NotificationPermission;
    dueSoonHours: number;
    startingSoonMinutes: number;
  } {
    return {
      enabled: this.isNotificationSupported(),
      permission: Notification.permission,
      dueSoonHours: 24,
      startingSoonMinutes: 15
    };
  }
}

// Initialize on module load
NotificationUtils.initialize();