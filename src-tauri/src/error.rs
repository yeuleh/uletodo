/**
 * Error handling for the task management system
 */

use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum TaskError {
    #[error("Task not found: {id}")]
    NotFound { id: String },
    
    #[error("Validation error: {message}")]
    Validation { message: String },
    
    #[error("Database error: {message}")]
    Database { message: String },
    
    #[error("Circular dependency detected in subtasks")]
    CircularDependency,
    
    #[error("Maximum subtask depth exceeded")]
    MaxDepthExceeded,
    
    #[error("Internal error: {message}")]
    Internal { message: String },
}

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum TagError {
    #[error("Tag not found: {name}")]
    NotFound { name: String },
    
    #[error("Tag already exists: {name}")]
    AlreadyExists { name: String },
    
    #[error("Validation error: {message}")]
    Validation { message: String },
    
    #[error("Database error: {message}")]
    Database { message: String },
}

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum AuditError {
    #[error("Audit log not found: {id}")]
    NotFound { id: String },
    
    #[error("Database error: {message}")]
    Database { message: String },
    
    #[error("Serialization error: {message}")]
    Serialization { message: String },
}

// Implement From traits for automatic conversion
impl From<sqlx::Error> for TaskError {
    fn from(err: sqlx::Error) -> Self {
        TaskError::Database {
            message: err.to_string(),
        }
    }
}

impl From<sqlx::Error> for TagError {
    fn from(err: sqlx::Error) -> Self {
        TagError::Database {
            message: err.to_string(),
        }
    }
}

impl From<sqlx::Error> for AuditError {
    fn from(err: sqlx::Error) -> Self {
        AuditError::Database {
            message: err.to_string(),
        }
    }
}