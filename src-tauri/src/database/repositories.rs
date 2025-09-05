/**
 * Repository layer for data access operations
 */

use async_trait::async_trait;
use sqlx::{Pool, Sqlite};
use uuid::Uuid;
use chrono::Utc;

use crate::database::models::*;

// Repository error types
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Validation error: {0}")]
    Validation(#[from] ValidationError),
    #[error("Task not found: {id}")]
    TaskNotFound { id: String },
    #[error("Tag not found: {id}")]
    TagNotFound { id: String },
    #[error("Circular dependency detected")]
    CircularDependency,
    #[error("Maximum subtask depth exceeded")]
    MaxDepthExceeded,
}

// Task Repository trait
#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn create(&self, input: CreateTaskInput) -> Result<TaskModel, RepositoryError>;
    async fn get_by_id(&self, id: &str) -> Result<Option<TaskModel>, RepositoryError>;
    async fn list(&self, filter: TaskFilter) -> Result<Vec<TaskModel>, RepositoryError>;
    async fn update(&self, id: &str, input: UpdateTaskInput) -> Result<TaskModel, RepositoryError>;
    async fn delete(&self, id: &str) -> Result<(), RepositoryError>;
    async fn get_subtasks(&self, parent_id: &str) -> Result<Vec<TaskModel>, RepositoryError>;
    async fn get_task_tags(&self, task_id: &str) -> Result<Vec<String>, RepositoryError>;
    async fn set_task_tags(&self, task_id: &str, tag_names: Vec<String>) -> Result<(), RepositoryError>;
    async fn create_with_id(&self, id: &str, input: CreateTaskInput) -> Result<TaskModel, RepositoryError>;
}

// Tag Repository trait
#[async_trait]
pub trait TagRepository: Send + Sync {
    async fn create(&self, input: CreateTagInput) -> Result<TagModel, RepositoryError>;
    async fn get_by_name(&self, name: &str) -> Result<Option<TagModel>, RepositoryError>;
    async fn list(&self) -> Result<Vec<TagModel>, RepositoryError>;
    async fn delete_unused(&self) -> Result<Vec<String>, RepositoryError>;
    async fn get_tasks_by_tag(&self, tag_name: &str) -> Result<Vec<TaskModel>, RepositoryError>;
}

// Audit Repository trait
#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn log(&self, task_id: &str, action: AuditAction, old_value: Option<String>, new_value: Option<String>, field_name: Option<String>) -> Result<(), RepositoryError>;
    async fn get_task_history(&self, task_id: &str, limit: Option<i32>) -> Result<Vec<AuditLogModel>, RepositoryError>;
    async fn get_logs(&self, filter: AuditLogFilter) -> Result<Vec<AuditLogModel>, RepositoryError>;
}

// SQLite implementations
pub struct SqliteTaskRepository {
    pool: Pool<Sqlite>,
}

impl SqliteTaskRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    async fn check_circular_dependency(&self, task_id: &str, parent_id: &str) -> Result<(), RepositoryError> {
        let mut current_parent = Some(parent_id.to_string());
        let mut depth = 0;
        
        while let Some(parent) = current_parent {
            if parent == task_id {
                return Err(RepositoryError::CircularDependency);
            }
            
            depth += 1;
            if depth > 10 { // Maximum depth limit
                return Err(RepositoryError::MaxDepthExceeded);
            }
            
            let result = sqlx::query_scalar::<_, Option<String>>(
                "SELECT parent_id FROM tasks WHERE id = ?"
            )
            .bind(&parent)
            .fetch_optional(&self.pool)
            .await?;
            
            current_parent = result.flatten();
        }
        
        Ok(())
    }
}

#[async_trait]
impl TaskRepository for SqliteTaskRepository {
    async fn create(&self, input: CreateTaskInput) -> Result<TaskModel, RepositoryError> {
        input.validate()?;
        
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();
        
        // Check for circular dependency if parent_id is provided
        if let Some(parent_id) = &input.parent_id {
            self.check_circular_dependency(&id, parent_id).await?;
        }
        
        let mut tx = self.pool.begin().await?;
        
        // Insert task
        let task = sqlx::query_as::<_, TaskModel>(
            r#"
            INSERT INTO tasks (id, title, description, status, priority, due_date, estimated_duration, start_time, created_at, updated_at, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(TaskStatus::Todo.to_string())
        .bind(input.priority.as_ref().map(|p| p.to_string()).unwrap_or_else(|| TaskPriority::None.to_string()))
        .bind(input.due_date)
        .bind(input.estimated_duration)
        .bind(input.start_time)
        .bind(now)
        .bind(now)
        .bind(&input.parent_id)
        .fetch_one(&mut *tx)
        .await?;
        
        // Handle tags if provided
        if let Some(tag_names) = input.tags {
            for tag_name in tag_names {
                // Get or create tag
                let tag_id = match sqlx::query_scalar::<_, String>(
                    "SELECT id FROM tags WHERE name = ?"
                )
                .bind(&tag_name)
                .fetch_optional(&mut *tx)
                .await? {
                    Some(id) => id,
                    None => {
                        let tag_id = Uuid::new_v4().to_string();
                        let color = generate_tag_color(&tag_name);
                        
                        sqlx::query(
                            "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)"
                        )
                        .bind(&tag_id)
                        .bind(&tag_name)
                        .bind(&color)
                        .bind(now)
                        .execute(&mut *tx)
                        .await?;
                        
                        tag_id
                    }
                };
                
                // Link task to tag
                sqlx::query(
                    "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)"
                )
                .bind(&id)
                .bind(&tag_id)
                .execute(&mut *tx)
                .await?;
            }
        }
        
        tx.commit().await?;
        Ok(task)
    }

    async fn get_by_id(&self, id: &str) -> Result<Option<TaskModel>, RepositoryError> {
        let task = sqlx::query_as::<_, TaskModel>(
            "SELECT * FROM tasks WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(task)
    }

    async fn list(&self, filter: TaskFilter) -> Result<Vec<TaskModel>, RepositoryError> {
        let mut query = "SELECT DISTINCT t.* FROM tasks t".to_string();
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn sqlx::Encode<'_, Sqlite> + Send + Sync>> = Vec::new();
        
        // Join with task_tags if filtering by tags
        if filter.tags.is_some() {
            query.push_str(" LEFT JOIN task_tags tt ON t.id = tt.task_id LEFT JOIN tags tg ON tt.tag_id = tg.id");
        }
        
        // Build WHERE conditions
        if let Some(statuses) = &filter.status {
            let status_placeholders = statuses.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            conditions.push(format!("t.status IN ({})", status_placeholders));
            for status in statuses {
                params.push(Box::new(status.to_string()));
            }
        }
        
        if let Some(priorities) = &filter.priority {
            let priority_placeholders = priorities.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            conditions.push(format!("t.priority IN ({})", priority_placeholders));
            for priority in priorities {
                params.push(Box::new(priority.to_string()));
            }
        }
        
        if let Some(tags) = &filter.tags {
            let tag_placeholders = tags.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            conditions.push(format!("tg.name IN ({})", tag_placeholders));
            for tag in tags {
                params.push(Box::new(tag.clone()));
            }
        }
        
        if let Some(from_date) = filter.due_date_from {
            conditions.push("t.due_date >= ?".to_string());
            params.push(Box::new(from_date));
        }
        
        if let Some(to_date) = filter.due_date_to {
            conditions.push("t.due_date <= ?".to_string());
            params.push(Box::new(to_date));
        }
        
        if let Some(parent_id) = &filter.parent_id {
            conditions.push("t.parent_id = ?".to_string());
            params.push(Box::new(parent_id.clone()));
        }
        
        if let Some(search) = &filter.search_query {
            conditions.push("(t.title LIKE ? OR t.description LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            params.push(Box::new(search_pattern.clone()));
            params.push(Box::new(search_pattern));
        }
        
        if !conditions.is_empty() {
            query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
        }
        
        query.push_str(" ORDER BY t.created_at DESC");
        
        // This is a simplified version - in a real implementation, you'd need to handle dynamic queries properly
        let tasks = sqlx::query_as::<_, TaskModel>(&query)
            .fetch_all(&self.pool)
            .await?;
        
        Ok(tasks)
    }

    async fn update(&self, id: &str, input: UpdateTaskInput) -> Result<TaskModel, RepositoryError> {
        input.validate()?;
        
        let mut tx = self.pool.begin().await?;
        
        // Get current task
        let current_task = sqlx::query_as::<_, TaskModel>(
            "SELECT * FROM tasks WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| RepositoryError::TaskNotFound { id: id.to_string() })?;
        
        let now = Utc::now().timestamp();
        
        // Build update query dynamically
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn sqlx::Encode<'_, Sqlite> + Send + Sync>> = Vec::new();
        
        if let Some(title) = &input.title {
            updates.push("title = ?");
            params.push(Box::new(title.clone()));
        }
        
        if let Some(description) = &input.description {
            updates.push("description = ?");
            params.push(Box::new(description.clone()));
        }
        
        if let Some(status) = &input.status {
            updates.push("status = ?");
            params.push(Box::new(status.to_string()));
            
            // Set completed_at if status is completed
            if *status == TaskStatus::Completed {
                updates.push("completed_at = ?");
                params.push(Box::new(now));
            } else if current_task.status == TaskStatus::Completed {
                updates.push("completed_at = NULL");
            }
        }
        
        if let Some(priority) = &input.priority {
            updates.push("priority = ?");
            params.push(Box::new(priority.to_string()));
        }
        
        if let Some(due_date) = input.due_date {
            updates.push("due_date = ?");
            params.push(Box::new(due_date));
        }
        
        if let Some(duration) = input.estimated_duration {
            updates.push("estimated_duration = ?");
            params.push(Box::new(duration));
        }
        
        if let Some(start_time) = input.start_time {
            updates.push("start_time = ?");
            params.push(Box::new(start_time));
        }
        
        updates.push("updated_at = ?");
        params.push(Box::new(now));
        params.push(Box::new(id.to_string()));
        
        let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
        
        // Execute update - simplified version
        sqlx::query(&query)
            .execute(&mut *tx)
            .await?;
        
        // Handle tags if provided
        if let Some(tag_names) = input.tags {
            // Remove existing tags
            sqlx::query("DELETE FROM task_tags WHERE task_id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;
            
            // Add new tags
            for tag_name in tag_names {
                let tag_id = match sqlx::query_scalar::<_, String>(
                    "SELECT id FROM tags WHERE name = ?"
                )
                .bind(&tag_name)
                .fetch_optional(&mut *tx)
                .await? {
                    Some(id) => id,
                    None => {
                        let tag_id = Uuid::new_v4().to_string();
                        let color = generate_tag_color(&tag_name);
                        
                        sqlx::query(
                            "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)"
                        )
                        .bind(&tag_id)
                        .bind(&tag_name)
                        .bind(&color)
                        .bind(now)
                        .execute(&mut *tx)
                        .await?;
                        
                        tag_id
                    }
                };
                
                sqlx::query(
                    "INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)"
                )
                .bind(id)
                .bind(&tag_id)
                .execute(&mut *tx)
                .await?;
            }
        }
        
        // Get updated task
        let updated_task = sqlx::query_as::<_, TaskModel>(
            "SELECT * FROM tasks WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;
        
        tx.commit().await?;
        Ok(updated_task)
    }

    async fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let mut tx = self.pool.begin().await?;
        
        // Check if task exists
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?)"
        )
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;
        
        if !exists {
            return Err(RepositoryError::TaskNotFound { id: id.to_string() });
        }
        
        // Delete task (cascading will handle task_tags and audit_logs)
        sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        
        tx.commit().await?;
        Ok(())
    }

    async fn get_subtasks(&self, parent_id: &str) -> Result<Vec<TaskModel>, RepositoryError> {
        let subtasks = sqlx::query_as::<_, TaskModel>(
            "SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC"
        )
        .bind(parent_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(subtasks)
    }

    async fn get_task_tags(&self, task_id: &str) -> Result<Vec<String>, RepositoryError> {
        let tag_names = sqlx::query_scalar::<_, String>(
            "SELECT t.name FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?"
        )
        .bind(task_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(tag_names)
    }

    async fn set_task_tags(&self, task_id: &str, tag_names: Vec<String>) -> Result<(), RepositoryError> {
        let mut tx = self.pool.begin().await?;
        let now = Utc::now().timestamp();
        
        // Remove existing tags
        sqlx::query("DELETE FROM task_tags WHERE task_id = ?")
            .bind(task_id)
            .execute(&mut *tx)
            .await?;
        
        // Add new tags
        for tag_name in tag_names {
            let tag_id = match sqlx::query_scalar::<_, String>(
                "SELECT id FROM tags WHERE name = ?"
            )
            .bind(&tag_name)
            .fetch_optional(&mut *tx)
            .await? {
                Some(id) => id,
                None => {
                    let tag_id = Uuid::new_v4().to_string();
                    let color = generate_tag_color(&tag_name);
                    
                    sqlx::query(
                        "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)"
                    )
                    .bind(&tag_id)
                    .bind(&tag_name)
                    .bind(&color)
                    .bind(now)
                    .execute(&mut *tx)
                    .await?;
                    
                    tag_id
                }
            };
            
            sqlx::query(
                "INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)"
            )
            .bind(task_id)
            .bind(&tag_id)
            .execute(&mut *tx)
            .await?;
        }
        
        tx.commit().await?;
        Ok(())
    }

    async fn create_with_id(&self, id: &str, input: CreateTaskInput) -> Result<TaskModel, RepositoryError> {
        input.validate()?;
        
        let now = Utc::now().timestamp();
        
        // Check for circular dependency if parent_id is provided
        if let Some(parent_id) = &input.parent_id {
            self.check_circular_dependency(id, parent_id).await?;
        }
        
        let mut tx = self.pool.begin().await?;
        
        // Insert task with specific ID
        let task = sqlx::query_as::<_, TaskModel>(
            r#"
            INSERT INTO tasks (id, title, description, status, priority, due_date, estimated_duration, start_time, created_at, updated_at, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(TaskStatus::Todo.to_string())
        .bind(input.priority.as_ref().map(|p| p.to_string()).unwrap_or_else(|| TaskPriority::None.to_string()))
        .bind(input.due_date)
        .bind(input.estimated_duration)
        .bind(input.start_time)
        .bind(now)
        .bind(now)
        .bind(&input.parent_id)
        .fetch_one(&mut *tx)
        .await?;
        
        // Handle tags if provided
        if let Some(tag_names) = input.tags {
            for tag_name in tag_names {
                // Get or create tag
                let tag_id = match sqlx::query_scalar::<_, String>(
                    "SELECT id FROM tags WHERE name = ?"
                )
                .bind(&tag_name)
                .fetch_optional(&mut *tx)
                .await? {
                    Some(id) => id,
                    None => {
                        let tag_id = Uuid::new_v4().to_string();
                        let color = generate_tag_color(&tag_name);
                        
                        sqlx::query(
                            "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)"
                        )
                        .bind(&tag_id)
                        .bind(&tag_name)
                        .bind(&color)
                        .bind(now)
                        .execute(&mut *tx)
                        .await?;
                        
                        tag_id
                    }
                };
                
                // Link task to tag
                sqlx::query(
                    "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)"
                )
                .bind(id)
                .bind(&tag_id)
                .execute(&mut *tx)
                .await?;
            }
        }
        
        tx.commit().await?;
        Ok(task)
    }
}

// Tag color generation utility
fn generate_tag_color(name: &str) -> String {
    let colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
        "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
    ];
    
    let hash = name.chars().fold(0u32, |acc, c| acc.wrapping_add(c as u32));
    colors[hash as usize % colors.len()].to_string()
}

pub struct SqliteTagRepository {
    pool: Pool<Sqlite>,
}

impl SqliteTagRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TagRepository for SqliteTagRepository {
    async fn create(&self, input: CreateTagInput) -> Result<TagModel, RepositoryError> {
        input.validate()?;
        
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();
        let color = input.color.unwrap_or_else(|| generate_tag_color(&input.name));
        
        let tag = sqlx::query_as::<_, TagModel>(
            "INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?) RETURNING *"
        )
        .bind(&id)
        .bind(&input.name)
        .bind(&color)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(tag)
    }

    async fn get_by_name(&self, name: &str) -> Result<Option<TagModel>, RepositoryError> {
        let tag = sqlx::query_as::<_, TagModel>(
            "SELECT * FROM tags WHERE name = ?"
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(tag)
    }

    async fn list(&self) -> Result<Vec<TagModel>, RepositoryError> {
        let tags = sqlx::query_as::<_, TagModel>(
            "SELECT * FROM tags ORDER BY name ASC"
        )
        .fetch_all(&self.pool)
        .await?;
        
        Ok(tags)
    }

    async fn delete_unused(&self) -> Result<Vec<String>, RepositoryError> {
        let mut tx = self.pool.begin().await?;
        
        // Get unused tag names
        let unused_tags = sqlx::query_scalar::<_, String>(
            r#"
            SELECT name FROM tags 
            WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)
            "#
        )
        .fetch_all(&mut *tx)
        .await?;
        
        // Delete unused tags
        sqlx::query(
            r#"
            DELETE FROM tags 
            WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)
            "#
        )
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        Ok(unused_tags)
    }

    async fn get_tasks_by_tag(&self, tag_name: &str) -> Result<Vec<TaskModel>, RepositoryError> {
        let tasks = sqlx::query_as::<_, TaskModel>(
            r#"
            SELECT t.* FROM tasks t
            JOIN task_tags tt ON t.id = tt.task_id
            JOIN tags tg ON tt.tag_id = tg.id
            WHERE tg.name = ?
            ORDER BY t.created_at DESC
            "#
        )
        .bind(tag_name)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(tasks)
    }
}

pub struct SqliteAuditRepository {
    pool: Pool<Sqlite>,
}

impl SqliteAuditRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuditRepository for SqliteAuditRepository {
    async fn log(
        &self,
        task_id: &str,
        action: AuditAction,
        old_value: Option<String>,
        new_value: Option<String>,
        field_name: Option<String>
    ) -> Result<(), RepositoryError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();
        
        sqlx::query(
            "INSERT INTO audit_logs (id, task_id, action, old_value, new_value, field_name, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(task_id)
        .bind(action.to_string())
        .bind(old_value)
        .bind(new_value)
        .bind(field_name)
        .bind(now)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    async fn get_task_history(&self, task_id: &str, limit: Option<i32>) -> Result<Vec<AuditLogModel>, RepositoryError> {
        let limit = limit.unwrap_or(100);
        
        let logs = sqlx::query_as::<_, AuditLogModel>(
            "SELECT * FROM audit_logs WHERE task_id = ? ORDER BY timestamp DESC LIMIT ?"
        )
        .bind(task_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(logs)
    }

    async fn get_logs(&self, filter: AuditLogFilter) -> Result<Vec<AuditLogModel>, RepositoryError> {
        let mut query = "SELECT * FROM audit_logs".to_string();
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn sqlx::Encode<'_, Sqlite> + Send + Sync>> = Vec::new();
        
        if let Some(task_id) = &filter.task_id {
            conditions.push("task_id = ?".to_string());
            params.push(Box::new(task_id.clone()));
        }
        
        if let Some(actions) = &filter.action {
            let action_placeholders = actions.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            conditions.push(format!("action IN ({})", action_placeholders));
            for action in actions {
                params.push(Box::new(action.to_string()));
            }
        }
        
        if let Some(from_date) = filter.from_date {
            conditions.push("timestamp >= ?".to_string());
            params.push(Box::new(from_date));
        }
        
        if let Some(to_date) = filter.to_date {
            conditions.push("timestamp <= ?".to_string());
            params.push(Box::new(to_date));
        }
        
        if !conditions.is_empty() {
            query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
        }
        
        query.push_str(" ORDER BY timestamp DESC LIMIT 1000");
        
        // Simplified version - in real implementation, handle dynamic queries properly
        let logs = sqlx::query_as::<_, AuditLogModel>(&query)
            .fetch_all(&self.pool)
            .await?;
        
        Ok(logs)
    }
}

// Repository factory for dependency injection
pub struct RepositoryManager {
    task_repo: SqliteTaskRepository,
    tag_repo: SqliteTagRepository,
    audit_repo: SqliteAuditRepository,
}

impl RepositoryManager {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self {
            task_repo: SqliteTaskRepository::new(pool.clone()),
            tag_repo: SqliteTagRepository::new(pool.clone()),
            audit_repo: SqliteAuditRepository::new(pool),
        }
    }
    
    pub fn task_repository(&self) -> &dyn TaskRepository {
        &self.task_repo
    }
    
    pub fn tag_repository(&self) -> &dyn TagRepository {
        &self.tag_repo
    }
    
    pub fn audit_repository(&self) -> &dyn AuditRepository {
        &self.audit_repo
    }
}