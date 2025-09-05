/**
 * Audit log type definitions for tracking task changes
 */

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted'
}

export interface AuditLog {
  id: string;
  taskId: string;
  action: AuditAction;
  oldValue?: any;
  newValue?: any;
  fieldName?: string;
  timestamp: Date;
}

export interface AuditLogFilter {
  taskId?: string;
  action?: AuditAction[];
  fromDate?: Date;
  toDate?: Date;
}