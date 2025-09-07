use rusqlite::{Connection, Result, Row};
use chrono::{DateTime, Utc};
use crate::models::task::{Task, CreateTaskRequest, UpdateTaskRequest};

/// Task repository for database operations
pub struct TaskRepository;

impl TaskRepository {
    /// Create a new task in the database
    pub fn create(conn: &Connection, request: &CreateTaskRequest) -> Result<Task> {
        let now = Utc::now();
        let due_date = request.due_date.as_ref()
            .and_then(|d| if d.is_empty() { None } else { Some(d.as_str()) });
        
        conn.execute(
            "INSERT INTO tasks (title, description, completed, due_date, project_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [
                &request.title as &dyn rusqlite::ToSql,
                &request.description.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                &false as &dyn rusqlite::ToSql,
                &due_date as &dyn rusqlite::ToSql,
                &request.project_id as &dyn rusqlite::ToSql,
                &now.to_rfc3339() as &dyn rusqlite::ToSql,
                &now.to_rfc3339() as &dyn rusqlite::ToSql,
            ],
        )?;

        let task_id = conn.last_insert_rowid();
        Self::get_by_id(conn, task_id)
    }

    /// Get a task by ID
    pub fn get_by_id(conn: &Connection, id: i64) -> Result<Task> {
        let mut stmt = conn.prepare("SELECT id, title, description, completed, due_date, project_id, created_at, updated_at FROM tasks WHERE id = ?1")?;
        
        let task = stmt.query_row([id], |row| {
            Self::row_to_task(row)
        })?;

        Ok(task)
    }

    /// Get all tasks from the database
    pub fn get_all(conn: &Connection) -> Result<Vec<Task>> {
        let mut stmt = conn.prepare("SELECT id, title, description, completed, due_date, project_id, created_at, updated_at FROM tasks ORDER BY created_at DESC")?;
        
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
        let now_str = now.to_rfc3339();
        
        // Handle each field separately to avoid lifetime issues
        if let Some(ref title) = request.title {
            conn.execute(
                "UPDATE tasks SET title = ?1, updated_at = ?2 WHERE id = ?3",
                [title as &dyn rusqlite::ToSql, &now_str, &id],
            )?;
        }
        
        if let Some(ref description) = request.description {
            conn.execute(
                "UPDATE tasks SET description = ?1, updated_at = ?2 WHERE id = ?3",
                [description as &dyn rusqlite::ToSql, &now_str, &id],
            )?;
        }
        
        if let Some(completed) = request.completed {
            conn.execute(
                "UPDATE tasks SET completed = ?1, updated_at = ?2 WHERE id = ?3",
                [&completed as &dyn rusqlite::ToSql, &now_str, &id],
            )?;
        }
        
        if let Some(ref due_date_str) = request.due_date {
            let due_date_value: Option<&str> = if due_date_str.is_empty() { 
                None 
            } else { 
                Some(due_date_str.as_str()) 
            };
            conn.execute(
                "UPDATE tasks SET due_date = ?1, updated_at = ?2 WHERE id = ?3",
                [&due_date_value as &dyn rusqlite::ToSql, &now_str, &id],
            )?;
        }
        
        if let Some(project_id) = request.project_id {
            conn.execute(
                "UPDATE tasks SET project_id = ?1, updated_at = ?2 WHERE id = ?3",
                [&project_id as &dyn rusqlite::ToSql, &now_str, &id],
            )?;
        }
        
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

    /// Toggle task completion status
    pub fn toggle_status(conn: &Connection, id: i64) -> Result<Task> {
        let now = Utc::now();
        
        // First get the current task to check its status
        let current_task = Self::get_by_id(conn, id)?;
        let new_status = !current_task.completed;
        
        conn.execute(
            "UPDATE tasks SET completed = ?1, updated_at = ?2 WHERE id = ?3",
            [
                &new_status as &dyn rusqlite::ToSql,
                &now.to_rfc3339() as &dyn rusqlite::ToSql,
                &id as &dyn rusqlite::ToSql,
            ],
        )?;
        
        Self::get_by_id(conn, id)
    }

    /// Convert a database row to a Task struct
    fn row_to_task(row: &Row) -> Result<Task> {
        let created_at_str: String = row.get(6)?;
        let updated_at_str: String = row.get(7)?;
        
        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|_e| rusqlite::Error::InvalidColumnType(6, "created_at".to_string(), rusqlite::types::Type::Text))?
            .with_timezone(&Utc);
            
        let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
            .map_err(|_e| rusqlite::Error::InvalidColumnType(7, "updated_at".to_string(), rusqlite::types::Type::Text))?
            .with_timezone(&Utc);

        // Parse due_date if present
        let due_date: Option<String> = row.get(4)?;
        let due_date_parsed = due_date.and_then(|date_str| {
            // Try to parse as ISO 8601 format first
            DateTime::parse_from_rfc3339(&date_str)
                .map(|dt| dt.with_timezone(&Utc))
                .or_else(|_| {
                    // Fallback: try to parse as date only (YYYY-MM-DD)
                    chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
                        .map(|date| date.and_hms_opt(0, 0, 0).unwrap().and_utc())
                })
                .ok()
        });

        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: {
                let desc: String = row.get(2)?;
                if desc.is_empty() { None } else { Some(desc) }
            },
            completed: row.get(3)?,
            due_date: due_date_parsed,
            project_id: row.get(5)?,
            created_at,
            updated_at,
        })
    }
}