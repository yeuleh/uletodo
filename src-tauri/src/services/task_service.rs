use crate::database::{connection::DatabaseManager, task_repository::TaskRepository};
use crate::models::task::{Task, CreateTaskRequest, UpdateTaskRequest};
use rusqlite::Result;

/// Task service for business logic operations
pub struct TaskService {
    db_manager: DatabaseManager,
}

impl TaskService {
    /// Create a new task service instance
    pub fn new() -> Result<Self> {
        let db_manager = DatabaseManager::new()?;
        // Initialize database on service creation
        db_manager.initialize()?;
        
        Ok(TaskService { db_manager })
    }

    /// Create a new task
    pub fn create_task(&self, request: CreateTaskRequest) -> Result<Task> {
        // Validate the request
        if let Err(e) = request.validate() {
            return Err(rusqlite::Error::InvalidColumnType(0, e.to_string(), rusqlite::types::Type::Text));
        }
        
        let conn = self.db_manager.get_connection()?;
        TaskRepository::create(&conn, &request)
    }

    /// Get all tasks
    pub fn get_all_tasks(&self) -> Result<Vec<Task>> {
        let conn = self.db_manager.get_connection()?;
        TaskRepository::get_all(&conn)
    }

    /// Get a task by ID
    pub fn get_task_by_id(&self, id: i64) -> Result<Task> {
        let conn = self.db_manager.get_connection()?;
        TaskRepository::get_by_id(&conn, id)
    }

    /// Update an existing task
    pub fn update_task(&self, id: i64, request: UpdateTaskRequest) -> Result<Task> {
        // Validate the request
        if let Err(e) = request.validate() {
            return Err(rusqlite::Error::InvalidColumnType(0, e.to_string(), rusqlite::types::Type::Text));
        }
        
        let conn = self.db_manager.get_connection()?;
        TaskRepository::update(&conn, id, &request)
    }

    /// Delete a task
    pub fn delete_task(&self, id: i64) -> Result<()> {
        let conn = self.db_manager.get_connection()?;
        TaskRepository::delete(&conn, id)
    }

    /// Toggle task completion status
    pub fn toggle_task_status(&self, id: i64) -> Result<Task> {
        let conn = self.db_manager.get_connection()?;
        TaskRepository::toggle_status(&conn, id)
    }
}