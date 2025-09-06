/**
 * Database models and data structures
 */

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt;

// Enums for task status and priority
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Completed,
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskStatus::Todo => write!(f, "todo"),
            TaskStatus::InProgress => write!(f, "in_progress"),
            TaskStatus::Completed => write!(f, "completed"),
        }
    }
}

impl From<String> for TaskStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "in_progress" => TaskStatus::InProgress,
            "completed" => TaskStatus::Completed,
            _ => TaskStatus::Todo,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskPriority {
    None,
    Low,
    Medium,
    High,
}

impl fmt::Display for TaskPriority {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskPriority::None => write!(f, "none"),
            TaskPriority::Low => write!(f, "low"),
            TaskPriority::Medium => write!(f, "medium"),
            TaskPriority::High => write!(f, "high"),
        }
    }
}

impl From<String> for TaskPriority {
    fn from(s: String) -> Self {
        match s.as_str() {
            "low" => TaskPriority::Low,
            "medium" => TaskPriority::Medium,
            "high" => TaskPriority::High,
            _ => TaskPriority::None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Created,
    Updated,
    StatusChanged,
    Deleted,
}

impl fmt::Display for AuditAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AuditAction::Created => write!(f, "created"),
            AuditAction::Updated => write!(f, "updated"),
            AuditAction::StatusChanged => write!(f, "status_changed"),
            AuditAction::Deleted => write!(f, "deleted"),
        }
    }
}

impl From<String> for AuditAction {
    fn from(s: String) -> Self {
        match s.as_str() {
            "updated" => AuditAction::Updated,
            "status_changed" => AuditAction::StatusChanged,
            "deleted" => AuditAction::Deleted,
            _ => AuditAction::Created,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskModel {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    #[sqlx(try_from = "String")]
    pub status: TaskStatus,
    #[sqlx(try_from = "String")]
    pub priority: TaskPriority,
    pub due_date: Option<i64>, // Unix timestamp
    pub estimated_duration: Option<i32>, // in minutes
    pub start_time: Option<i64>, // Unix timestamp
    pub completed_at: Option<i64>, // Unix timestamp
    pub created_at: i64,
    pub updated_at: i64,
    pub parent_id: Option<String>,
}

impl TaskModel {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.title.trim().is_empty() {
            return Err(ValidationError::EmptyTitle);
        }
        
        if self.title.len() > 500 {
            return Err(ValidationError::TitleTooLong);
        }
        
        if let Some(desc) = &self.description {
            if desc.len() > 1000 {
                return Err(ValidationError::DescriptionTooLong);
            }
        }
        
        if let Some(duration) = self.estimated_duration {
            if duration < 15 || duration > 1440 { // 15 minutes to 24 hours
                return Err(ValidationError::InvalidDuration);
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TagModel {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
}

impl TagModel {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.name.trim().is_empty() {
            return Err(ValidationError::EmptyTagName);
        }
        
        if self.name.len() > 50 {
            return Err(ValidationError::TagNameTooLong);
        }
        
        if !self.color.starts_with('#') || self.color.len() != 7 {
            return Err(ValidationError::InvalidColor);
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskTagModel {
    pub task_id: String,
    pub tag_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLogModel {
    pub id: String,
    pub task_id: String,
    #[sqlx(try_from = "String")]
    pub action: AuditAction,
    pub old_value: Option<String>, // JSON
    pub new_value: Option<String>, // JSON
    pub field_name: Option<String>,
    pub timestamp: i64,
}

// Validation error types
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Task title cannot be empty")]
    EmptyTitle,
    #[error("Task title is too long (max 200 characters)")]
    TitleTooLong,
    #[error("Task title contains invalid characters (line breaks not allowed)")]
    InvalidTitleFormat,
    #[error("Task description is too long (max 1000 characters)")]
    DescriptionTooLong,
    #[error("Invalid duration (must be between 15 minutes and 24 hours)")]
    InvalidDuration,
    #[error("Invalid date value")]
    InvalidDate,
    #[error("Start time cannot be after due date")]
    StartTimeAfterDueDate,
    #[error("Task duration extends beyond due date")]
    DurationExceedsDueDate,
    #[error("Tag name cannot be empty")]
    EmptyTagName,
    #[error("Tag name is too long (max 50 characters)")]
    TagNameTooLong,
    #[error("Tag name contains invalid characters (only letters, numbers, spaces, hyphens, and underscores allowed)")]
    InvalidTagFormat,
    #[error("Too many tags (maximum 10 allowed)")]
    TooManyTags,
    #[error("Duplicate tags are not allowed")]
    DuplicateTags,
    #[error("Invalid color format (must be hex color like #FF0000)")]
    InvalidColor,
    #[error("Circular dependency detected in task hierarchy")]
    CircularDependency,
    #[error("Maximum task depth exceeded (max 3 levels)")]
    MaxDepthExceeded,
}

// Input structs for creating/updating records
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<i64>,
    pub estimated_duration: Option<i32>,
    pub start_time: Option<i64>,
    pub parent_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl CreateTaskInput {
    pub fn validate(&self) -> Result<(), ValidationError> {
        // Title validation
        if self.title.trim().is_empty() {
            return Err(ValidationError::EmptyTitle);
        }
        
        if self.title.len() > 200 {
            return Err(ValidationError::TitleTooLong);
        }

        // Check for invalid characters in title
        if self.title.contains('\n') || self.title.contains('\r') {
            return Err(ValidationError::InvalidTitleFormat);
        }
        
        // Description validation
        if let Some(desc) = &self.description {
            if desc.len() > 1000 {
                return Err(ValidationError::DescriptionTooLong);
            }
        }
        
        // Duration validation
        if let Some(duration) = self.estimated_duration {
            if duration < 15 || duration > 1440 {
                return Err(ValidationError::InvalidDuration);
            }
        }

        // Date validation
        if let Some(due_date) = self.due_date {
            if due_date < 0 {
                return Err(ValidationError::InvalidDate);
            }
        }

        if let Some(start_time) = self.start_time {
            if start_time < 0 {
                return Err(ValidationError::InvalidDate);
            }
        }

        // Cross-field validation
        if let (Some(start_time), Some(due_date)) = (self.start_time, self.due_date) {
            if start_time > due_date {
                return Err(ValidationError::StartTimeAfterDueDate);
            }

            // If duration is provided, check if it fits between start and due date
            if let Some(duration) = self.estimated_duration {
                let duration_seconds = duration as i64 * 60;
                if start_time + duration_seconds > due_date {
                    return Err(ValidationError::DurationExceedsDueDate);
                }
            }
        }

        // Tags validation
        if let Some(tags) = &self.tags {
            if tags.len() > 10 {
                return Err(ValidationError::TooManyTags);
            }

            for tag in tags {
                if tag.trim().is_empty() {
                    return Err(ValidationError::EmptyTagName);
                }
                if tag.len() > 50 {
                    return Err(ValidationError::TagNameTooLong);
                }
                // Check for valid tag characters
                if !tag.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || c == '-' || c == '_') {
                    return Err(ValidationError::InvalidTagFormat);
                }
            }

            // Check for duplicate tags (case-insensitive)
            let mut unique_tags = std::collections::HashSet::new();
            for tag in tags {
                let normalized_tag = tag.to_lowercase().trim().to_string();
                if !unique_tags.insert(normalized_tag) {
                    return Err(ValidationError::DuplicateTags);
                }
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<i64>,
    pub estimated_duration: Option<i32>,
    pub start_time: Option<i64>,
    pub tags: Option<Vec<String>>,
}

impl UpdateTaskInput {
    pub fn validate(&self) -> Result<(), ValidationError> {
        // Title validation (if provided)
        if let Some(title) = &self.title {
            if title.trim().is_empty() {
                return Err(ValidationError::EmptyTitle);
            }
            if title.len() > 200 {
                return Err(ValidationError::TitleTooLong);
            }
            if title.contains('\n') || title.contains('\r') {
                return Err(ValidationError::InvalidTitleFormat);
            }
        }
        
        // Description validation (if provided)
        if let Some(desc) = &self.description {
            if desc.len() > 1000 {
                return Err(ValidationError::DescriptionTooLong);
            }
        }
        
        // Duration validation (if provided)
        if let Some(duration) = self.estimated_duration {
            if duration < 15 || duration > 1440 {
                return Err(ValidationError::InvalidDuration);
            }
        }

        // Date validation (if provided)
        if let Some(due_date) = self.due_date {
            if due_date < 0 {
                return Err(ValidationError::InvalidDate);
            }
        }

        if let Some(start_time) = self.start_time {
            if start_time < 0 {
                return Err(ValidationError::InvalidDate);
            }
        }

        // Cross-field validation (if both dates are provided)
        if let (Some(start_time), Some(due_date)) = (self.start_time, self.due_date) {
            if start_time > due_date {
                return Err(ValidationError::StartTimeAfterDueDate);
            }

            if let Some(duration) = self.estimated_duration {
                let duration_seconds = duration as i64 * 60;
                if start_time + duration_seconds > due_date {
                    return Err(ValidationError::DurationExceedsDueDate);
                }
            }
        }

        // Tags validation (if provided)
        if let Some(tags) = &self.tags {
            if tags.len() > 10 {
                return Err(ValidationError::TooManyTags);
            }

            for tag in tags {
                if tag.trim().is_empty() {
                    return Err(ValidationError::EmptyTagName);
                }
                if tag.len() > 50 {
                    return Err(ValidationError::TagNameTooLong);
                }
                if !tag.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || c == '-' || c == '_') {
                    return Err(ValidationError::InvalidTagFormat);
                }
            }

            // Check for duplicate tags (case-insensitive)
            let mut unique_tags = std::collections::HashSet::new();
            for tag in tags {
                let normalized_tag = tag.to_lowercase().trim().to_string();
                if !unique_tags.insert(normalized_tag) {
                    return Err(ValidationError::DuplicateTags);
                }
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
}

impl CreateTagInput {
    pub fn validate(&self) -> Result<(), ValidationError> {
        if self.name.trim().is_empty() {
            return Err(ValidationError::EmptyTagName);
        }
        
        if self.name.len() > 50 {
            return Err(ValidationError::TagNameTooLong);
        }
        
        if let Some(color) = &self.color {
            if !color.starts_with('#') || color.len() != 7 {
                return Err(ValidationError::InvalidColor);
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskFilter {
    pub status: Option<Vec<TaskStatus>>,
    pub priority: Option<Vec<TaskPriority>>,
    pub tags: Option<Vec<String>>,
    pub due_date_from: Option<i64>,
    pub due_date_to: Option<i64>,
    pub parent_id: Option<String>,
    pub search_query: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogFilter {
    pub task_id: Option<String>,
    pub action: Option<Vec<AuditAction>>,
    pub from_date: Option<i64>,
    pub to_date: Option<i64>,
}