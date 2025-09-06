/**
 * Task business logic service
 */

use crate::database::{
    TaskModel, CreateTaskInput, UpdateTaskInput, TaskFilter, TaskStatus,
    TaskRepository, AuditRepository, RepositoryError, AuditAction
};
use crate::error::TaskError;
use async_trait::async_trait;
use std::sync::Arc;

#[async_trait]
pub trait TaskService: Send + Sync {
    async fn create_task(&self, input: CreateTaskInput) -> Result<TaskModel, TaskError>;
    async fn get_task(&self, id: &str) -> Result<Option<TaskModel>, TaskError>;
    async fn list_tasks(&self, filter: Option<TaskFilter>) -> Result<Vec<TaskModel>, TaskError>;
    async fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<TaskModel, TaskError>;
    async fn delete_task(&self, id: &str) -> Result<(), TaskError>;
    async fn toggle_task_status(&self, id: &str) -> Result<TaskModel, TaskError>;
    async fn add_subtask(&self, parent_id: &str, input: CreateTaskInput) -> Result<TaskModel, TaskError>;
    async fn calculate_parent_progress(&self, parent_id: &str) -> Result<f32, TaskError>;
    async fn update_parent_progress(&self, parent_id: &str) -> Result<(), TaskError>;
    async fn create_task_with_id(&self, id: &str, input: CreateTaskInput) -> Result<TaskModel, TaskError>;
}

pub struct TaskServiceImpl {
    task_repo: Arc<dyn TaskRepository>,
    audit_repo: Arc<dyn AuditRepository>,
}

impl TaskServiceImpl {
    pub fn new(
        task_repo: Arc<dyn TaskRepository>,
        audit_repo: Arc<dyn AuditRepository>,
    ) -> Self {
        Self {
            task_repo,
            audit_repo,
        }
    }

    /// Validates subtask relationships to prevent circular dependencies
    async fn validate_subtask_relationship(&self, task_id: &str, parent_id: &str) -> Result<(), TaskError> {
        // Check if parent_id would create a circular dependency
        let mut current_parent = Some(parent_id.to_string());
        let mut depth = 0;
        
        while let Some(parent) = current_parent {
            if parent == task_id {
                return Err(TaskError::CircularDependency);
            }
            
            depth += 1;
            if depth > 10 { // Maximum depth limit
                return Err(TaskError::MaxDepthExceeded);
            }
            
            // Get the parent's parent
            if let Some(parent_task) = self.task_repo.get_by_id(&parent).await
                .map_err(|e| TaskError::Database { message: e.to_string() })? {
                current_parent = parent_task.parent_id;
            } else {
                break;
            }
        }
        
        Ok(())
    }

    /// Updates completion status of parent tasks based on subtask completion
    fn handle_subtask_completion<'a>(&'a self, task: &'a TaskModel) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), TaskError>> + Send + 'a>> {
        Box::pin(async move {
        if let Some(parent_id) = &task.parent_id {
            self.update_parent_progress(parent_id).await?;
            
            // Check if all subtasks are completed
            let subtasks = self.task_repo.get_subtasks(parent_id).await
                .map_err(|e| TaskError::Database { message: e.to_string() })?;
            
            let all_completed = !subtasks.is_empty() && 
                subtasks.iter().all(|subtask| subtask.status == TaskStatus::Completed);
            
            if all_completed {
                // Auto-complete parent task
                if let Some(parent_task) = self.task_repo.get_by_id(parent_id).await
                    .map_err(|e| TaskError::Database { message: e.to_string() })? {
                    
                    if parent_task.status != TaskStatus::Completed {
                        let update_input = UpdateTaskInput {
                            title: None,
                            description: None,
                            status: Some(TaskStatus::Completed),
                            priority: None,
                            due_date: None,
                            estimated_duration: None,
                            start_time: None,
                            tags: None,
                        };
                        
                        let updated_parent = self.task_repo.update(parent_id, update_input).await
                            .map_err(|e| TaskError::Database { message: e.to_string() })?;
                        
                        // Log the auto-completion
                        self.audit_repo.log(
                            parent_id,
                            AuditAction::StatusChanged,
                            Some(parent_task.status.to_string()),
                            Some(TaskStatus::Completed.to_string()),
                            Some("status".to_string())
                        ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
                        
                        // Recursively handle parent's parent
                        Box::pin(self.handle_subtask_completion(&updated_parent)).await?;
                    }
                }
            }
        }
        
        Ok(())
        })
    }

    /// Handles parent task status changes affecting subtasks
    async fn handle_parent_completion(&self, task: &TaskModel, old_status: TaskStatus) -> Result<(), TaskError> {
        // If parent task is marked as completed, complete all incomplete subtasks
        if task.status == TaskStatus::Completed && old_status != TaskStatus::Completed {
            let subtasks = self.task_repo.get_subtasks(&task.id).await
                .map_err(|e| TaskError::Database { message: e.to_string() })?;
            
            for subtask in subtasks {
                if subtask.status != TaskStatus::Completed {
                    let update_input = UpdateTaskInput {
                        title: None,
                        description: None,
                        status: Some(TaskStatus::Completed),
                        priority: None,
                        due_date: None,
                        estimated_duration: None,
                        start_time: None,
                        tags: None,
                    };
                    
                    self.task_repo.update(&subtask.id, update_input).await
                        .map_err(|e| TaskError::Database { message: e.to_string() })?;
                    
                    // Log the auto-completion
                    self.audit_repo.log(
                        &subtask.id,
                        AuditAction::StatusChanged,
                        Some(subtask.status.to_string()),
                        Some(TaskStatus::Completed.to_string()),
                        Some("status".to_string())
                    ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
                }
            }
        }
        
        Ok(())
    }
}

#[async_trait]
impl TaskService for TaskServiceImpl {
    async fn create_task(&self, input: CreateTaskInput) -> Result<TaskModel, TaskError> {
        // Validate input
        input.validate().map_err(|e| TaskError::Validation { message: e.to_string() })?;
        
        // If this is a subtask, validate the relationship
        if let Some(parent_id) = &input.parent_id {
            // Check if parent exists
            let parent_exists = self.task_repo.get_by_id(parent_id).await
                .map_err(|e| TaskError::Database { message: e.to_string() })?
                .is_some();
            
            if !parent_exists {
                return Err(TaskError::NotFound { id: parent_id.clone() });
            }
        }
        
        // Create the task
        let task = self.task_repo.create(input).await
            .map_err(|e| match e {
                RepositoryError::CircularDependency => TaskError::CircularDependency,
                RepositoryError::MaxDepthExceeded => TaskError::MaxDepthExceeded,
                RepositoryError::Validation(ve) => TaskError::Validation { message: ve.to_string() },
                _ => TaskError::Database { message: e.to_string() },
            })?;
        
        // Log task creation
        self.audit_repo.log(
            &task.id,
            AuditAction::Created,
            None,
            Some(serde_json::to_string(&task).unwrap_or_default()),
            None
        ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
        
        // Update parent progress if this is a subtask
        if let Some(parent_id) = &task.parent_id {
            self.update_parent_progress(parent_id).await?;
        }
        
        Ok(task)
    }

    async fn get_task(&self, id: &str) -> Result<Option<TaskModel>, TaskError> {
        self.task_repo.get_by_id(id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })
    }

    async fn list_tasks(&self, filter: Option<TaskFilter>) -> Result<Vec<TaskModel>, TaskError> {
        let filter = filter.unwrap_or(TaskFilter {
            status: None,
            priority: None,
            tags: None,
            due_date_from: None,
            due_date_to: None,
            parent_id: None,
            search_query: None,
        });
        
        self.task_repo.list(filter).await
            .map_err(|e| TaskError::Database { message: e.to_string() })
    }

    async fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<TaskModel, TaskError> {
        // Validate input
        input.validate().map_err(|e| TaskError::Validation { message: e.to_string() })?;
        
        // Get current task for comparison
        let old_task = self.task_repo.get_by_id(id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?
            .ok_or_else(|| TaskError::NotFound { id: id.to_string() })?;
        
        let old_status = old_task.status.clone();
        
        // Update the task
        let updated_task = self.task_repo.update(id, input.clone()).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?;
        
        // Log field-level changes
        if let Some(title) = &input.title {
            if title != &old_task.title {
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    Some(old_task.title.clone()),
                    Some(title.clone()),
                    Some("title".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }
        
        if let Some(description) = &input.description {
            if description != old_task.description.as_ref().unwrap_or(&String::new()) {
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    old_task.description.clone(),
                    Some(description.clone()),
                    Some("description".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }
        
        if let Some(status) = &input.status {
            if *status != old_task.status {
                self.audit_repo.log(
                    id,
                    AuditAction::StatusChanged,
                    Some(old_task.status.to_string()),
                    Some(status.to_string()),
                    Some("status".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
                
                // Handle status change effects
                self.handle_subtask_completion(&updated_task).await?;
                self.handle_parent_completion(&updated_task, old_status).await?;
            }
        }
        
        if let Some(priority) = &input.priority {
            if *priority != old_task.priority {
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    Some(old_task.priority.to_string()),
                    Some(priority.to_string()),
                    Some("priority".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }

        if let Some(due_date) = input.due_date {
            if Some(due_date) != old_task.due_date {
                let old_date = old_task.due_date.map(|d| d.to_string()).unwrap_or_default();
                let new_date = due_date.to_string();
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    if old_date.is_empty() { None } else { Some(old_date) },
                    Some(new_date),
                    Some("due_date".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }

        if let Some(estimated_duration) = input.estimated_duration {
            if Some(estimated_duration) != old_task.estimated_duration {
                let old_duration = old_task.estimated_duration.map(|d| d.to_string()).unwrap_or_default();
                let new_duration = estimated_duration.to_string();
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    if old_duration.is_empty() { None } else { Some(old_duration) },
                    Some(new_duration),
                    Some("estimated_duration".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }

        if let Some(start_time) = input.start_time {
            if Some(start_time) != old_task.start_time {
                let old_time = old_task.start_time.map(|t| t.to_string()).unwrap_or_default();
                let new_time = start_time.to_string();
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    if old_time.is_empty() { None } else { Some(old_time) },
                    Some(new_time),
                    Some("start_time".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }

        // Handle tag changes
        if let Some(new_tags) = &input.tags {
            // Get current tags for comparison
            let old_tags = self.task_repo.get_task_tags(id).await
                .map_err(|e| TaskError::Database { message: e.to_string() })?;
            
            // Compare tag lists
            let mut old_tags_sorted = old_tags.clone();
            old_tags_sorted.sort();
            let mut new_tags_sorted = new_tags.clone();
            new_tags_sorted.sort();
            
            if old_tags_sorted != new_tags_sorted {
                let old_tags_str = old_tags.join(", ");
                let new_tags_str = new_tags.join(", ");
                self.audit_repo.log(
                    id,
                    AuditAction::Updated,
                    if old_tags_str.is_empty() { None } else { Some(old_tags_str) },
                    if new_tags_str.is_empty() { None } else { Some(new_tags_str) },
                    Some("tags".to_string())
                ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
            }
        }
        
        // Update parent progress if this task has a parent
        if let Some(parent_id) = &updated_task.parent_id {
            self.update_parent_progress(parent_id).await?;
        }
        
        Ok(updated_task)
    }

    async fn delete_task(&self, id: &str) -> Result<(), TaskError> {
        // Get task for audit logging
        let task = self.task_repo.get_by_id(id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?
            .ok_or_else(|| TaskError::NotFound { id: id.to_string() })?;
        
        let parent_id = task.parent_id.clone();
        
        // Log deletion before actually deleting
        self.audit_repo.log(
            id,
            AuditAction::Deleted,
            Some(serde_json::to_string(&task).unwrap_or_default()),
            None,
            None
        ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
        
        // Delete the task (cascading will handle subtasks and audit logs)
        self.task_repo.delete(id).await
            .map_err(|e| match e {
                RepositoryError::TaskNotFound { id } => TaskError::NotFound { id },
                _ => TaskError::Database { message: e.to_string() },
            })?;
        
        // Update parent progress if this was a subtask
        if let Some(parent_id) = parent_id {
            self.update_parent_progress(&parent_id).await?;
        }
        
        Ok(())
    }

    async fn toggle_task_status(&self, id: &str) -> Result<TaskModel, TaskError> {
        let task = self.task_repo.get_by_id(id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?
            .ok_or_else(|| TaskError::NotFound { id: id.to_string() })?;
        
        let new_status = match task.status {
            TaskStatus::Todo | TaskStatus::InProgress => TaskStatus::Completed,
            TaskStatus::Completed => TaskStatus::Todo,
        };
        
        let update_input = UpdateTaskInput {
            title: None,
            description: None,
            status: Some(new_status),
            priority: None,
            due_date: None,
            estimated_duration: None,
            start_time: None,
            tags: None,
        };
        
        self.update_task(id, update_input).await
    }

    async fn add_subtask(&self, parent_id: &str, mut input: CreateTaskInput) -> Result<TaskModel, TaskError> {
        // Ensure parent_id is set
        input.parent_id = Some(parent_id.to_string());
        
        // Validate that parent exists
        let parent_exists = self.task_repo.get_by_id(parent_id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?
            .is_some();
        
        if !parent_exists {
            return Err(TaskError::NotFound { id: parent_id.to_string() });
        }
        
        self.create_task(input).await
    }

    async fn calculate_parent_progress(&self, parent_id: &str) -> Result<f32, TaskError> {
        let subtasks = self.task_repo.get_subtasks(parent_id).await
            .map_err(|e| TaskError::Database { message: e.to_string() })?;
        
        if subtasks.is_empty() {
            return Ok(0.0);
        }
        
        let completed_count = subtasks.iter()
            .filter(|task| task.status == TaskStatus::Completed)
            .count();
        
        Ok((completed_count as f32 / subtasks.len() as f32) * 100.0)
    }

    async fn update_parent_progress(&self, parent_id: &str) -> Result<(), TaskError> {
        let _progress = self.calculate_parent_progress(parent_id).await?;
        
        // Note: Progress is calculated dynamically, not stored in database
        // This method is here for future use if we decide to cache progress values
        
        Ok(())
    }

    async fn create_task_with_id(&self, id: &str, input: CreateTaskInput) -> Result<TaskModel, TaskError> {
        // Validate input
        input.validate().map_err(|e| TaskError::Validation { message: e.to_string() })?;
        
        // If this is a subtask, validate the relationship
        if let Some(parent_id) = &input.parent_id {
            // Check if parent exists
            let parent_exists = self.task_repo.get_by_id(parent_id).await
                .map_err(|e| TaskError::Database { message: e.to_string() })?
                .is_some();
            
            if !parent_exists {
                return Err(TaskError::NotFound { id: parent_id.clone() });
            }
        }
        
        // Create the task with specific ID (for import functionality)
        let task = self.task_repo.create_with_id(id, input).await
            .map_err(|e| match e {
                RepositoryError::CircularDependency => TaskError::CircularDependency,
                RepositoryError::MaxDepthExceeded => TaskError::MaxDepthExceeded,
                RepositoryError::Validation(ve) => TaskError::Validation { message: ve.to_string() },
                _ => TaskError::Database { message: e.to_string() },
            })?;
        
        // Log task creation
        self.audit_repo.log(
            &task.id,
            AuditAction::Created,
            None,
            Some(serde_json::to_string(&task).unwrap_or_default()),
            None
        ).await.map_err(|e| TaskError::Database { message: e.to_string() })?;
        
        // Update parent progress if this is a subtask
        if let Some(parent_id) = &task.parent_id {
            self.update_parent_progress(parent_id).await?;
        }
        
        Ok(task)
    }
}