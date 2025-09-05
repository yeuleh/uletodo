/**
 * Task management Tauri commands
 */

use crate::database::{TaskModel, CreateTaskInput, UpdateTaskInput, TaskFilter, connection::get_db_pool};
use crate::services::{TaskServiceImpl, AuditServiceImpl, TaskService, AuditService};
use crate::database::repositories::{SqliteTaskRepository, SqliteAuditRepository};
use crate::error::TaskError;
use std::sync::Arc;

#[tauri::command]
pub async fn create_task(input: CreateTaskInput) -> Result<TaskModel, TaskError> {
    // Validate input
    input.validate().map_err(|e| TaskError::Validation { 
        message: e.to_string() 
    })?;
    
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    let task = task_service.create_task(input).await?;
    
    // Log the creation
    if let Err(e) = audit_service.log_task_created(&task).await {
        log::warn!("Failed to log task creation: {}", e);
    }
    
    Ok(task)
}

#[tauri::command]
pub async fn get_task(id: String) -> Result<Option<TaskModel>, TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo);
    
    task_service.get_task(&id).await
}

#[tauri::command]
pub async fn list_tasks(filter: Option<TaskFilter>) -> Result<Vec<TaskModel>, TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo);
    
    let filter = filter.unwrap_or(TaskFilter {
        status: None,
        priority: None,
        tags: None,
        due_date_from: None,
        due_date_to: None,
        parent_id: None,
        search_query: None,
    });
    
    task_service.list_tasks(Some(filter)).await
}

#[tauri::command]
pub async fn update_task(id: String, input: UpdateTaskInput) -> Result<TaskModel, TaskError> {
    // Validate input
    input.validate().map_err(|e| TaskError::Validation { 
        message: e.to_string() 
    })?;
    
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    // Get the old task for audit logging
    let old_task = task_service.get_task(&id).await?
        .ok_or_else(|| TaskError::NotFound { id: id.clone() })?;
    
    let updated_task = task_service.update_task(&id, input).await?;
    
    // Log the update
    if let Err(e) = audit_service.log_task_updated(&old_task, &updated_task).await {
        log::warn!("Failed to log task update: {}", e);
    }
    
    Ok(updated_task)
}

#[tauri::command]
pub async fn delete_task(id: String) -> Result<(), TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    // Get the task for audit logging before deletion
    let task = task_service.get_task(&id).await?
        .ok_or_else(|| TaskError::NotFound { id: id.clone() })?;
    
    task_service.delete_task(&id).await?;
    
    // Log the deletion
    if let Err(e) = audit_service.log_task_deleted(&task).await {
        log::warn!("Failed to log task deletion: {}", e);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn toggle_task_status(id: String) -> Result<TaskModel, TaskError> {
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    // Get the old task for audit logging
    let old_task = task_service.get_task(&id).await?
        .ok_or_else(|| TaskError::NotFound { id: id.clone() })?;
    
    let updated_task = task_service.toggle_task_status(&id).await?;
    
    // Log the status change
    if let Err(e) = audit_service.log_task_updated(&old_task, &updated_task).await {
        log::warn!("Failed to log task status change: {}", e);
    }
    
    Ok(updated_task)
}

#[tauri::command]
pub async fn add_subtask(parent_id: String, input: CreateTaskInput) -> Result<TaskModel, TaskError> {
    // Validate input
    input.validate().map_err(|e| TaskError::Validation { 
        message: e.to_string() 
    })?;
    
    let pool = get_db_pool();
    let task_repo = Arc::new(SqliteTaskRepository::new(pool.clone()));
    let audit_repo = Arc::new(SqliteAuditRepository::new(pool.clone()));
    let task_service = TaskServiceImpl::new(task_repo, audit_repo.clone());
    let audit_service = AuditServiceImpl::new(audit_repo);
    
    let subtask = task_service.add_subtask(&parent_id, input).await?;
    
    // Log the creation
    if let Err(e) = audit_service.log_task_created(&subtask).await {
        log::warn!("Failed to log subtask creation: {}", e);
    }
    
    Ok(subtask)
}