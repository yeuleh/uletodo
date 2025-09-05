/**
 * Frontend service for audit log operations
 */

import { invoke } from '@tauri-apps/api/core';
import type { AuditLog, AuditLogFilter } from '@/types/AuditLog.types';

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
}