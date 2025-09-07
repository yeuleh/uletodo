use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::utils::error::AppError;

/// Task model with all required fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub due_date: Option<DateTime<Utc>>,
    pub project_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request structure for creating a new task
#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub project_id: Option<i64>,
}

/// Request structure for updating an existing task
#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub project_id: Option<i64>,
    pub completed: Option<bool>,
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
        
        // Validate due_date format if provided
        if let Some(ref due_date_str) = self.due_date {
            if !due_date_str.is_empty() {
                // Try to parse as ISO 8601 format
                DateTime::parse_from_rfc3339(due_date_str)
                    .or_else(|_| {
                        // Fallback: try to parse as date only (YYYY-MM-DD)
                        chrono::NaiveDate::parse_from_str(due_date_str, "%Y-%m-%d")
                            .map(|date| date.and_hms_opt(0, 0, 0).unwrap().and_utc().fixed_offset())
                    })
                    .map_err(|_| AppError::Validation("Invalid due date format. Expected ISO 8601 or YYYY-MM-DD".to_string()))?;
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
        
        // Validate due_date format if provided
        if let Some(ref due_date_str) = self.due_date {
            if !due_date_str.is_empty() {
                // Try to parse as ISO 8601 format
                DateTime::parse_from_rfc3339(due_date_str)
                    .or_else(|_| {
                        // Fallback: try to parse as date only (YYYY-MM-DD)
                        chrono::NaiveDate::parse_from_str(due_date_str, "%Y-%m-%d")
                            .map(|date| date.and_hms_opt(0, 0, 0).unwrap().and_utc().fixed_offset())
                    })
                    .map_err(|_| AppError::Validation("Invalid due date format. Expected ISO 8601 or YYYY-MM-DD".to_string()))?;
            }
        }
        
        Ok(())
    }
}