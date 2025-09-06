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
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedChangeInfo {
    pub log_id: String,
    pub task_id: String,
    pub action: AuditAction,
    pub field_name: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub formatted_old_value: Option<String>,
    pub formatted_new_value: Option<String>,
    pub description: String,
    pub timestamp: i64,
}

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
    async fn get_detailed_change_info(&self, log_id: &str) -> Result<Option<DetailedChangeInfo>, AuditError>;
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
                        let old_status = Self::format_status_display(old_val);
                        let new_status = Self::format_status_display(new_val);
                        format!("Status changed from {} to {}", old_status, new_status)
                    } else {
                        "Status changed".to_string()
                    }
                },
                AuditAction::Updated => {
                    if let Some(field) = &log.field_name {
                        match field.as_str() {
                            "title" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    format!("Title changed from \"{}\" to \"{}\"", old_val, new_val)
                                } else {
                                    "Title updated".to_string()
                                }
                            },
                            "description" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    let old_preview = Self::truncate_text(old_val, 50);
                                    let new_preview = Self::truncate_text(new_val, 50);
                                    format!("Description changed from \"{}\" to \"{}\"", old_preview, new_preview)
                                } else {
                                    "Description updated".to_string()
                                }
                            },
                            "priority" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    let old_priority = Self::format_priority_display(old_val);
                                    let new_priority = Self::format_priority_display(new_val);
                                    format!("Priority changed from {} to {}", old_priority, new_priority)
                                } else {
                                    "Priority updated".to_string()
                                }
                            },
                            "due_date" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    let old_date = Self::format_date_display(old_val);
                                    let new_date = Self::format_date_display(new_val);
                                    if old_val.is_empty() {
                                        format!("Due date set to {}", new_date)
                                    } else if new_val.is_empty() {
                                        format!("Due date removed (was {})", old_date)
                                    } else {
                                        format!("Due date changed from {} to {}", old_date, new_date)
                                    }
                                } else {
                                    "Due date updated".to_string()
                                }
                            },
                            "estimated_duration" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    let old_duration = Self::format_duration_display(old_val);
                                    let new_duration = Self::format_duration_display(new_val);
                                    if old_val.is_empty() {
                                        format!("Estimated duration set to {}", new_duration)
                                    } else if new_val.is_empty() {
                                        format!("Estimated duration removed (was {})", old_duration)
                                    } else {
                                        format!("Estimated duration changed from {} to {}", old_duration, new_duration)
                                    }
                                } else {
                                    "Estimated duration updated".to_string()
                                }
                            },
                            "start_time" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    let old_time = Self::format_datetime_display(old_val);
                                    let new_time = Self::format_datetime_display(new_val);
                                    if old_val.is_empty() {
                                        format!("Start time set to {}", new_time)
                                    } else if new_val.is_empty() {
                                        format!("Start time removed (was {})", old_time)
                                    } else {
                                        format!("Start time changed from {} to {}", old_time, new_time)
                                    }
                                } else {
                                    "Start time updated".to_string()
                                }
                            },
                            "parent_id" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    if old_val.is_empty() {
                                        "Converted to subtask".to_string()
                                    } else if new_val.is_empty() {
                                        "Converted to main task".to_string()
                                    } else {
                                        "Parent task changed".to_string()
                                    }
                                } else {
                                    "Parent task changed".to_string()
                                }
                            },
                            "tags" => {
                                if let (Some(old_val), Some(new_val)) = (&log.old_value, &log.new_value) {
                                    if old_val.is_empty() {
                                        format!("Tags added: {}", new_val)
                                    } else if new_val.is_empty() {
                                        format!("Tags removed: {}", old_val)
                                    } else {
                                        format!("Tags changed from \"{}\" to \"{}\"", old_val, new_val)
                                    }
                                } else {
                                    "Tags updated".to_string()
                                }
                            },
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

    /// Format status for display
    fn format_status_display(status: &str) -> String {
        match status {
            "todo" => "To Do".to_string(),
            "in_progress" => "In Progress".to_string(),
            "completed" => "Completed".to_string(),
            _ => status.to_string(),
        }
    }

    /// Format priority for display
    fn format_priority_display(priority: &str) -> String {
        match priority {
            "none" => "None".to_string(),
            "low" => "Low".to_string(),
            "medium" => "Medium".to_string(),
            "high" => "High".to_string(),
            _ => priority.to_string(),
        }
    }

    /// Format date for display
    fn format_date_display(date_str: &str) -> String {
        if date_str.is_empty() {
            return "None".to_string();
        }
        
        if let Ok(timestamp) = date_str.parse::<i64>() {
            let datetime = chrono::DateTime::from_timestamp(timestamp, 0);
            if let Some(dt) = datetime {
                return dt.format("%Y-%m-%d").to_string();
            }
        }
        
        date_str.to_string()
    }

    /// Format datetime for display
    fn format_datetime_display(datetime_str: &str) -> String {
        if datetime_str.is_empty() {
            return "None".to_string();
        }
        
        if let Ok(timestamp) = datetime_str.parse::<i64>() {
            let datetime = chrono::DateTime::from_timestamp(timestamp, 0);
            if let Some(dt) = datetime {
                return dt.format("%Y-%m-%d %H:%M").to_string();
            }
        }
        
        datetime_str.to_string()
    }

    /// Format duration for display
    fn format_duration_display(duration_str: &str) -> String {
        if duration_str.is_empty() {
            return "None".to_string();
        }
        
        if let Ok(minutes) = duration_str.parse::<i32>() {
            if minutes >= 60 {
                let hours = minutes / 60;
                let remaining_minutes = minutes % 60;
                if remaining_minutes == 0 {
                    format!("{} hour{}", hours, if hours == 1 { "" } else { "s" })
                } else {
                    format!("{} hour{} {} minute{}", 
                        hours, if hours == 1 { "" } else { "s" },
                        remaining_minutes, if remaining_minutes == 1 { "" } else { "s" })
                }
            } else {
                format!("{} minute{}", minutes, if minutes == 1 { "" } else { "s" })
            }
        } else {
            duration_str.to_string()
        }
    }

    /// Truncate text for display
    fn truncate_text(text: &str, max_length: usize) -> String {
        if text.len() <= max_length {
            text.to_string()
        } else {
            format!("{}...", &text[..max_length])
        }
    }

    /// Format field value for display based on field type
    fn format_field_value(field_name: &str, value: &str) -> String {
        match field_name {
            "status" => Self::format_status_display(value),
            "priority" => Self::format_priority_display(value),
            "due_date" => Self::format_date_display(value),
            "start_time" => Self::format_datetime_display(value),
            "estimated_duration" => Self::format_duration_display(value),
            "tags" => Self::format_tags_display(value),
            _ => value.to_string(),
        }
    }

    /// Format tags for display
    fn format_tags_display(tags_str: &str) -> String {
        if tags_str.is_empty() {
            "None".to_string()
        } else {
            format!("[{}]", tags_str)
        }
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

    async fn get_detailed_change_info(&self, log_id: &str) -> Result<Option<DetailedChangeInfo>, AuditError> {
        // Get the specific audit log
        let filter = AuditLogFilter {
            task_id: None,
            action: None,
            from_date: None,
            to_date: None,
        };
        
        let all_logs = self.audit_repo.get_logs(filter).await
            .map_err(|e| AuditError::Database { message: e.to_string() })?;
        
        let log = all_logs.into_iter().find(|l| l.id == log_id);
        
        if let Some(log) = log {
            let formatted_old_value = log.old_value.as_ref().map(|v| {
                if let Some(field) = &log.field_name {
                    Self::format_field_value(field, v)
                } else {
                    v.clone()
                }
            });
            
            let formatted_new_value = log.new_value.as_ref().map(|v| {
                if let Some(field) = &log.field_name {
                    Self::format_field_value(field, v)
                } else {
                    v.clone()
                }
            });
            
            let description = Self::generate_change_description(&[log.clone()]);
            
            Ok(Some(DetailedChangeInfo {
                log_id: log.id,
                task_id: log.task_id,
                action: log.action,
                field_name: log.field_name,
                old_value: log.old_value,
                new_value: log.new_value,
                formatted_old_value,
                formatted_new_value,
                description,
                timestamp: log.timestamp,
            }))
        } else {
            Ok(None)
        }
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