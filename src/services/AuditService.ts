/**
 * Frontend service for audit log operations
 */

import { invoke } from '@tauri-apps/api/core';
import type { AuditLog, AuditLogFilter, DetailedChangeInfo } from '@/types/AuditLog.types';

export class AuditService {
  /**
   * Get audit history for a specific task
   */
  static async getTaskHistory(
    taskId: string, 
    filter?: AuditLogFilter
  ): Promise<AuditLog[]> {
    return await invoke('get_task_history', { taskId, filter });
  }

  /**
   * Get audit logs with pagination
   */
  static async getAuditLogs(
    filter?: AuditLogFilter,
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]> {
    return await invoke('get_audit_logs', { filter, limit, offset });
  }

  /**
   * Get detailed change information for a specific audit log entry
   */
  static async getDetailedChangeInfo(logId: string): Promise<DetailedChangeInfo | null> {
    return await invoke('get_detailed_change_info', { logId });
  }

  /**
   * Get a human-readable summary of all changes for a task
   */
  static async getChangeSummary(taskId: string): Promise<string> {
    return await invoke('get_change_summary', { taskId });
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Get action display name
   */
  static getActionDisplayName(action: string): string {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'status_changed':
        return 'Status Changed';
      case 'deleted':
        return 'Deleted';
      default:
        return action;
    }
  }

  /**
   * Get action icon for display
   */
  static getActionIcon(action: string): string {
    switch (action) {
      case 'created':
        return '➕';
      case 'updated':
        return '✏️';
      case 'status_changed':
        return '🔄';
      case 'deleted':
        return '🗑️';
      default:
        return '📝';
    }
  }
}