/**
 * Audit logging service
 */

use crate::database::{
    AuditLogModel, TaskModel, AuditLogFilter, AuditRepository, AuditAction
};
use crate::error::AuditError;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use chrono::Utc;

#[async_trait]
pub trait AuditService: Send + Sync {
    async fn log_task_created(&self, task: &TaskModel) -> Result<(), AuditError>;
    async fn log_task_updated(&self, old_task: &TaskModel, new_task: &TaskModel) -> Result<(), AuditError>;
    async fn log_task_deleted(&self, task: &TaskModel) -> Result<(), AuditError>;
    async fn log_custom_action(&self, task_id: &str, action: AuditAction, old_value: Option<String>, new_value: Option<String>, field_name: Option<String>) -> Result<(), AuditError>;
    async fn get_task_history(&self, task_id: &str, filter: Option<AuditLogFilter>) -> Result<Vec<AuditLogModel>, AuditError>;
    async fn get_audit_logs(&self, filter: Option<AuditLogFilter>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<AuditLogModel>, AuditError>;
    async fn cleanup_old_logs(&self, retention_days: i32) -> Result<usize, AuditError>;
    async fn get_change_summary(&self, task_id: &str) -> Result<String, AuditError>;
}

pub struct AuditServiceImpl {
    audit_repo: Arc<dyn AuditRepository>,
}

impl AuditServiceImpl {
    pub fn new(audit_repo: Arc<dyn AuditRepository>) -> Self {
        Self { audit_repo }
    }

    /// Converts a TaskModel to a JSON value for logging
    fn task_to_json(task: &TaskModel) -> Result<Value, AuditError> {
        serde_json::to_value(task)
            .map_err(|e| AuditError::Serialization { message: e.to_string() })
    }

    /// Detects and logs field-level changes between two tasks
    async fn log_field_changes(&self, old_task: &TaskModel, new_task: &TaskModel) -> Result<(), AuditError> {
        let mut changes = Vec::new();

        // Compare each field and log changes
        if old_task.title != new_task.title {
            changes.push(("title", old_task.title.clone(), new_task.title.clone()));
        }

        if old_task.description != new_task.description {
            let old_desc = old_task.description.clone().unwrap_or_default();
            let new_desc = new_task.description.clone().unwrap_or_default();
            if old_desc != new_desc {
                changes.push(("description", old_desc, new_desc));
            }
        }

        if old_task.status != new_task.status {
            changes.push(("status", old_task.status.to_string(), new_task.status.to_string()));
        }

        if old_task.priority != new_task.priority {
            changes.push(("priority", old_task.priority.to_string(), new_task.priority.to_string()));
        }

        if old_task.due_date != new_task.due_date {
            let old_date = old_task.due_date.map(|d| d.to_string()).unwrap_or_default();
            let new_date = new_task.due_date.map(|d| d.to_string()).unwrap_or_default();
            changes.push(("due_date", old_date, new_date));
        }

        if old_task.estimated_duration != new_task.estimated_duration {
            let old_duration = old_task.estimated_duration.map(|d| d.to_string()).unwrap_or_default();
            let new_duration = new_task.estimated_duration.map(|d| d.to_string()).unwrap_or_default();
            changes.push(("estimated_duration", old_duration, new_duration));
        }

        if old_task.start_time != new_task.start_time {
            let old_time = old_task.start_time.map(|t| t.to_string()).unwrap_or_default();
            let new_time = new_task.start_time.map(|t| t.to_string()).unwrap_or_default();
            changes.push(("start_time", old_time, new_time));
        }

        if old_task.parent_id != new_task.parent_id {
            let old_parent = old_task.parent_id.clone().unwrap_or_default();
            let new_parent = new_task.parent_id.clone().unwrap_or_default();
            changes.push(("parent_id", old_parent, new_parent));
        }

        // Log each change as a separate audit entry
        for (field_name, old_value, new_value) in changes {
            let action = if field_name == "status" {
                AuditAction::StatusChanged
            } else {
                AuditAction::Updated
            };

            self.audit_repo.log(
                &new_task.id,
                action,
                if old_value.is_empty() { None } else { Some(old_value) },
                if new_value.is_empty() { None } else { Some(new_value) },
                Some(field_name.to_string())
            ).await.map_err(|e| AuditError::Database { message: e.to_string() })?;
        }

        Ok(())
    }

    /// Generates a human-readable description of changes
    fn generate_change_description(logs: &[AuditLogModel]) -> String {
        if logs.is_empty() {
            return "No changes recorded".to_string();
        }

        let mut descriptions = Vec::new();

        for log in logs {
            let description = match log.action {
                AuditAction::Created => "Task created".to_string(),
                AuditAction::Deleted => "Task deleted".to_string(),
                AuditAction::StatusChanged => {
                    if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                        format!("Status changed from {} to {}", old_val, new_val)
                    } else {
                        "Status changed".to_string()
                    }
                },
                AuditAction::Updated => {
                    if let Some(field) = &log.field_name {
                        match field.as_str() {
                            "title" => "Title updated".to_string(),
                            "description" => "Description updated".to_string(),
                            "priority" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    format!("Priority changed from {} to {}", old_val, new_val)
                                } else {
                                    "Priority updated".to_string()
                                }
                            },
                            "due_date" => "Due date updated".to_string(),
                            "estimated_duration" => "Estimated duration updated".to_string(),
                            "start_time" => "Start time updated".to_string(),
                            "parent_id" => "Parent task changed".to_string(),
                            _ => format!("{} updated", field),
                        }
                    } else {
                        "Task updated".to_string()
                    }
                },
            };
            descriptions.push(description);
        }

        descriptions.join(", ")
    }
}

#[async_trait]
impl AuditService for AuditServiceImpl {
    async fn log_task_created(&self, task: &TaskModel) -> Result<(), AuditError> {
        let task_json = Self::task_to_json(task)?;
        
        self.audit_repo.log(
            &task.id,
            AuditAction::Created,
            None,
            Some(task_json.to_string()),
            None
        ).await.map_err(|e| AuditError::Database { message: e.to_string() })
    }

    async fn log_task_updated(&self, old_task: &TaskModel, new_task: &TaskModel) -> Result<(), AuditError> {
        // Log field-level changes
        self.log_field_changes(old_task, new_task).await?;
        
        // Also log a general update entry with full task data
        let old_json = Self::task_to_json(old_task)?;
        let new_json = Self::task_to_json(new_task)?;
        
        self.audit_repo.log(
            &new_task.id,
            AuditAction::Updated,
            Some(old_json.to_string()),
            Some(new_json.to_string()),
            None
        ).await.map_err(|e| AuditError::Database { message: e.to_string() })
    }

    async fn log_task_deleted(&self, task: &TaskModel) -> Result<(), AuditError> {
        let task_json = Self::task_to_json(task)?;
        
        self.audit_repo.log(
            &task.id,
            AuditAction::Deleted,
            Some(task_json.to_string()),
            None,
            None
        ).await.map_err(|e| AuditError::Database { message: e.to_string() })
    }

    async fn log_custom_action(
        &self,
        task_id: &str,
        action: AuditAction,
        old_value: Option<String>,
        new_value: Option<String>,
        field_name: Option<String>
    ) -> Result<(), AuditError> {
        self.audit_repo.log(
            task_id,
            action,
            old_value,
            new_value,
            field_name
        ).await.map_err(|e| AuditError::Database { message: e.to_string() })
    }

    async fn get_task_history(&self, task_id: &str, filter: Option<AuditLogFilter>) -> Result<Vec<AuditLogModel>, AuditError> {
        let mut filter = filter.unwrap_or_default();
        filter.task_id = Some(task_id.to_string());
        
        // Default limit to 100 for performance
        let limit = Some(100);
        
        self.audit_repo.get_task_history(task_id, limit).await
            .map_err(|e| AuditError::Database { message: e.to_string() })
    }

    async fn get_audit_logs(&self, filter: Option<AuditLogFilter>, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<AuditLogModel>, AuditError> {
        let filter = filter.unwrap_or_default();
        
        // Get all logs matching filter first
        let all_logs = self.audit_repo.get_logs(filter).await
            .map_err(|e| AuditError::Database { message: e.to_string() })?;
        
        // Apply pagination manually since repository doesn't support it yet
        let limit = limit.unwrap_or(1000);
        let offset = offset.unwrap_or(0);
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, all_logs.len());
        
        if start >= all_logs.len() {
            Ok(Vec::new())
        } else {
            Ok(all_logs[start..end].to_vec())
        }
    }

    async fn cleanup_old_logs(&self, retention_days: i32) -> Result<usize, AuditError> {
        let cutoff_timestamp = Utc::now().timestamp() - (retention_days as i64 * 24 * 60 * 60);
        
        let filter = AuditLogFilter {
            task_id: None,
            action: None,
            from_date: None,
            to_date: Some(cutoff_timestamp),
        };
        
        // Get logs to be deleted (for counting)
        let logs_to_delete = self.audit_repo.get_logs(filter).await
            .map_err(|e| AuditError::Database { message: e.to_string() })?;
        
        let count = logs_to_delete.len();
        
        // Note: The repository layer would need a delete_logs method for actual cleanup
        // This is a placeholder implementation
        
        Ok(count)
    }

    async fn get_change_summary(&self, task_id: &str) -> Result<String, AuditError> {
        let logs = self.get_task_history(task_id, None).await?;
        Ok(Self::generate_change_description(&logs))
    }
}

// Default implementation for AuditLogFilter
impl Default for AuditLogFilter {
    fn default() -> Self {
        Self {
            task_id: None,
            action: None,
            from_date: None,
            to_date: None,
        }
    }
}