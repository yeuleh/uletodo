use crate::models::task::{Task, CreateTaskRequest, UpdateTaskRequest};
use crate::services::task_service::TaskService;

/// Create a new task
#[tauri::command]
pub async fn create_task(request: CreateTaskRequest) -> Result<Task, String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.create_task(request).map_err(|e| {
        match e {
            rusqlite::Error::InvalidColumnType(_, msg, _) => format!("Validation error: {}", msg),
            _ => format!("Failed to create task: {}", e),
        }
    })
}

/// Get all tasks
#[tauri::command]
pub async fn get_all_tasks() -> Result<Vec<Task>, String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.get_all_tasks().map_err(|e| format!("Failed to get tasks: {}", e))
}

/// Get tasks (alias for get_all_tasks for consistency with design)
#[tauri::command]
pub async fn get_tasks() -> Result<Vec<Task>, String> {
    get_all_tasks().await
}

/// Get a task by ID
#[tauri::command]
pub async fn get_task_by_id(id: i64) -> Result<Task, String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.get_task_by_id(id).map_err(|e| {
        match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Task with ID {} not found", id),
            _ => format!("Failed to get task: {}", e),
        }
    })
}

/// Update an existing task
#[tauri::command]
pub async fn update_task(id: i64, request: UpdateTaskRequest) -> Result<Task, String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.update_task(id, request).map_err(|e| {
        match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Task with ID {} not found", id),
            rusqlite::Error::InvalidColumnType(_, msg, _) => format!("Validation error: {}", msg),
            _ => format!("Failed to update task: {}", e),
        }
    })
}

/// Delete a task
#[tauri::command]
pub async fn delete_task(id: i64) -> Result<(), String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.delete_task(id).map_err(|e| {
        match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Task with ID {} not found", id),
            _ => format!("Failed to delete task: {}", e),
        }
    })
}

/// Toggle task completion status
#[tauri::command]
pub async fn toggle_task_status(id: i64) -> Result<Task, String> {
    let service = TaskService::new().map_err(|e| format!("Failed to initialize service: {}", e))?;
    service.toggle_task_status(id).map_err(|e| {
        match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Task with ID {} not found", id),
            _ => format!("Failed to toggle task status: {}", e),
        }
    })
}