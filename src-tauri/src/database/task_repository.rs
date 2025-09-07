use rusqlite::{Connection, Result, Row};
use chrono::{DateTime, Utc};
use crate::models::task::{Task, CreateTaskRequest, UpdateTaskRequest};

/// Task repository for database operations
pub struct TaskRepository;

impl TaskRepository {
    /// Create a new task in the database
    pub fn create(conn: &Connection, request: &CreateTaskRequest) -> Result<Task> {
        let now = Utc::now();
        
        conn.execute(
            "INSERT INTO tasks (title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            [
                &request.title as &dyn rusqlite::ToSql,
                &request.description.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                &now.to_rfc3339() as &dyn rusqlite::ToSql,
                &now.to_rfc3339() as &dyn rusqlite::ToSql,
            ],
        )?;

        let task_id = conn.last_insert_rowid();
        Self::get_by_id(conn, task_id)
    }

    /// Get a task by ID
    pub fn get_by_id(conn: &Connection, id: i64) -> Result<Task> {
        let mut stmt = conn.prepare("SELECT id, title, description, created_at, updated_at FROM tasks WHERE id = ?1")?;
        
        let task = stmt.query_row([id], |row| {
            Self::row_to_task(row)
        })?;

        Ok(task)
    }

    /// Get all tasks from the database
    pub fn get_all(conn: &Connection) -> Result<Vec<Task>> {
        let mut stmt = conn.prepare("SELECT id, title, description, created_at, updated_at FROM tasks ORDER BY created_at DESC")?;
        
        let task_iter = stmt.query_map([], |row| {
            Self::row_to_task(row)
        })?;

        let mut tasks = Vec::new();
        for task in task_iter {
            tasks.push(task?);
        }

        Ok(tasks)
    }

    /// Update an existing task
    pub fn update(conn: &Connection, id: i64, request: &UpdateTaskRequest) -> Result<Task> {
        let now = Utc::now();
        
        // Build dynamic update query based on provided fields
        let mut update_parts = Vec::new();
        let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
        
        if let Some(ref title) = request.title {
            update_parts.push("title = ?");
            params.push(title);
        }
        
        if let Some(ref description) = request.description {
            update_parts.push("description = ?");
            params.push(description);
        }
        
        if update_parts.is_empty() {
            // No fields to update, just return the existing task
            return Self::get_by_id(conn, id);
        }
        
        update_parts.push("updated_at = ?");
        let now_str = now.to_rfc3339();
        params.push(&now_str);
        
        let query = format!("UPDATE tasks SET {} WHERE id = ?", update_parts.join(", "));
        params.push(&id);
        
        conn.execute(&query, params.as_slice())?;
        
        Self::get_by_id(conn, id)
    }

    /// Delete a task by ID
    pub fn delete(conn: &Connection, id: i64) -> Result<()> {
        let rows_affected = conn.execute("DELETE FROM tasks WHERE id = ?1", [id])?;
        
        if rows_affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        
        Ok(())
    }

    /// Convert a database row to a Task struct
    fn row_to_task(row: &Row) -> Result<Task> {
        let created_at_str: String = row.get(3)?;
        let updated_at_str: String = row.get(4)?;
        
        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|_e| rusqlite::Error::InvalidColumnType(3, "created_at".to_string(), rusqlite::types::Type::Text))?
            .with_timezone(&Utc);
            
        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map_err(|_e| rusqlite::Error::InvalidColumnType(4, "updated_at".to_string(), rusqlite::types::Type::Text))?
            .with_timezone(&Utc);

        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: {
                let desc: String = row.get(2)?;
                if desc.is_empty() { None } else { Some(desc) }
            },
            created_at,
            updated_at,
        })
    }
}