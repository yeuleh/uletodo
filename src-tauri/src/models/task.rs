use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::utils::error::AppError;

/// Simple task model with basic fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request structure for creating a new task
#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
}

/// Request structure for updating an existing task
#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
}

impl CreateTaskRequest {
    /// Validate the create task request
    pub fn validate(&self) -> Result<(), AppError> {
        if self.title.trim().is_empty() {
            return Err(AppError::Validation("Task title cannot be empty".to_string()));
        }
        
        if self.title.len() > 255 {
            return Err(AppError::Validation("Task title cannot exceed 255 characters".to_string()));
        }
        
        if let Some(ref description) = self.description {
            if description.len() > 1000 {
                return Err(AppError::Validation("Task description cannot exceed 1000 characters".to_string()));
            }
        }
        
        Ok(())
    }
}

impl UpdateTaskRequest {
    /// Validate the update task request
    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(ref title) = self.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Task title cannot be empty".to_string()));
            }
            
            if title.len() > 255 {
                return Err(AppError::Validation("Task title cannot exceed 255 characters".to_string()));
            }
        }
        
        if let Some(ref description) = self.description {
            if description.len() > 1000 {
                return Err(AppError::Validation("Task description cannot exceed 1000 characters".to_string()));
            }
        }
        
        Ok(())
    }
}