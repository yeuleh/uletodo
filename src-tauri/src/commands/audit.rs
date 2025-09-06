/**
 * Audit logging Tauri commands
 */

use crate::database::{AuditLogModel, AuditLogFilter, TaskModel, CreateTaskInput, UpdateTaskInput, connection::get_db_pool};
use crate::services::{AuditServiceImpl, TaskServiceImpl, AuditService, TaskService, DetailedChangeInfo};
use crate::database::repositories::{SqliteAuditRepository, SqliteTaskRepository};
use crate::error::{AuditError, TaskError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[tauri::command]
pub async fn get_task_history(task_id: String, filter: Option<AuditLogFilter>) -> Result<Vec<AuditLogModel>, AuditError> {
    let pool = get_db_pool();
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    audit_service.get_task_history(&task_id, filter).await
}

#[tauri::command]
pub async fn get_audit_logs(
    filter: Option<AuditLogFilter>,
    limit: Option<i32>,
    offset: Option<i32>
) -> Result<Vec<AuditLogModel>, AuditError> {
    let pool = get_db_pool();
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    let limit = limit.unwrap_or(100).min(1000); // Cap at 1000 for performance
    let offset = offset.unwrap_or(0).max(0);
    
    audit_service.get_audit_logs(Some(filter.unwrap_or_default()), Some(limit), Some(offset)).await
}

#[tauri::command]
pub async fn get_detailed_change_info(log_id: String) -> Result<Option<DetailedChangeInfo>, AuditError> {
    let pool = get_db_pool();
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    audit_service.get_detailed_change_info(&log_id).await
}

#[tauri::command]
pub async fn get_change_summary(task_id: String) -> Result<String, AuditError> {
    let pool = get_db_pool();
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    audit_service.get_change_summary(&task_id).await
}

// Bulk operations for multiple task updates
#[derive(Debug, Serialize, Deserialize)]
pub struct BulkUpdateInput {
    pub task_ids: Vec<String>,
    pub update: UpdateTaskInput,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkUpdateResult {
    pub updated_tasks: Vec<TaskModel>,
    pub failed_updates: Vec<BulkUpdateError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkUpdateError {
    pub task_id: String,
    pub error: String,
}

#[tauri::command]
pub async fn bulk_update_tasks(input: BulkUpdateInput) -> Result<BulkUpdateResult, TaskError> {
    // Validate input
    input.update.validate().map_err(|e| TaskError::Validation { 
        message: e.to_string() 
    })?;
    
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    let mut updated_tasks = Vec::new();
    let mut failed_updates = Vec::new();
    
    for task_id in input.task_ids {
        match task_service.get_task(&task_id).await {
            Ok(Some(old_task)) => {
                match task_service.update_task(&task_id, input.update.clone()).await {
                    Ok(updated_task) => {
                        // Log the update
                        if let Err(e) = audit_service.log_task_updated(&old_task, &updated_task).await {
                            log::warn!("Failed to log bulk task update: {}", e);
                        }
                        updated_tasks.push(updated_task);
                    }
                    Err(e) => {
                        failed_updates.push(BulkUpdateError {
                            task_id,
                            error: e.to_string(),
                        });
                    }
                }
            }
            Ok(None) => {
                failed_updates.push(BulkUpdateError {
                    task_id,
                    error: "Task not found".to_string(),
                });
            }
            Err(e) => {
                failed_updates.push(BulkUpdateError {
                    task_id,
                    error: e.to_string(),
                });
            }
        }
    }
    
    Ok(BulkUpdateResult {
        updated_tasks,
        failed_updates,
    })
}

// Data export/import commands for backup
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub tasks: Vec<TaskModel>,
    pub audit_logs: Vec<AuditLogModel>,
    pub export_timestamp: i64,
    pub version: String,
}

#[tauri::command]
pub async fn export_data() -> Result<ExportData, TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    // Export all tasks
    let tasks = task_service.list_tasks(Some(crate::database::TaskFilter {
        status: None,
        priority: None,
        tags: None,
        due_date_from: None,
        due_date_to: None,
        parent_id: None,
        search_query: None,
    })).await?;
    
    // Export all audit logs (limited to recent ones for performance)
    let audit_logs = audit_service.get_audit_logs(None, Some(10000), Some(0)).await
        .unwrap_or_else(|e| {
            log::warn!("Failed to export audit logs: {}", e);
            Vec::new()
        });
    
    Ok(ExportData {
        tasks,
        audit_logs,
        export_timestamp: chrono::Utc::now().timestamp(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported_tasks: usize,
    pub skipped_tasks: usize,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn import_data(data: ExportData) -> Result<ImportResult, TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    let mut imported_tasks = 0;
    let mut skipped_tasks = 0;
    let mut errors = Vec::new();
    
    // Import tasks (skip existing ones to avoid conflicts)
    for task in data.tasks {
        match task_service.get_task(&task.id).await {
            Ok(Some(_)) => {
                skipped_tasks += 1; // Task already exists
            }
            Ok(None) => {
                // Create the task with the original data
                let create_input = CreateTaskInput {
                    title: task.title.clone(),
                    description: task.description.clone(),
                    priority: Some(task.priority.clone()),
                    due_date: task.due_date,
                    estimated_duration: task.estimated_duration,
                    start_time: task.start_time,
                    parent_id: task.parent_id.clone(),
                    tags: None, // Tags will need to be handled separately
                };
                
                match task_service.create_task_with_id(&task.id, create_input).await {
                    Ok(created_task) => {
                        // Log the import
                        if let Err(e) = audit_service.log_task_created(&created_task).await {
                            log::warn!("Failed to log imported task: {}", e);
                        }
                        imported_tasks += 1;
                    }
                    Err(e) => {
                        errors.push(format!("Failed to import task {}: {}", task.id, e));
                    }
                }
            }
            Err(e) => {
                errors.push(format!("Error checking task {}: {}", task.id, e));
            }
        }
    }
    
    Ok(ImportResult {
        imported_tasks,
        skipped_tasks,
        errors,
    })
}

