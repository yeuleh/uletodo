/**
 * Tag business logic service
 */

use crate::database::{
    TagModel, CreateTagInput, TaskModel, TagRepository, RepositoryError
};
use crate::error::TagError;
use async_trait::async_trait;
use std::sync::Arc;

#[async_trait]
pub trait TagService: Send + Sync {
    async fn create_tag(&self, input: CreateTagInput) -> Result<TagModel, TagError>;
    async fn list_tags(&self) -> Result<Vec<TagModel>, TagError>;
    async fn delete_unused_tags(&self) -> Result<Vec<String>, TagError>;
    async fn get_tasks_by_tag(&self, tag_name: &str) -> Result<Vec<TaskModel>, TagError>;
    async fn get_tag_suggestions(&self, query: &str) -> Result<Vec<TagModel>, TagError>;
    async fn get_or_create_tag(&self, name: &str, color: Option<&str>) -> Result<TagModel, TagError>;
    async fn get_tag_usage_stats(&self) -> Result<Vec<(TagModel, usize)>, TagError>;
    fn generate_color(&self, name: &str) -> String;
}

pub struct TagServiceImpl {
    tag_repo: Arc<dyn TagRepository>,
}

impl TagServiceImpl {
    pub fn new(tag_repo: Arc<dyn TagRepository>) -> Self {
        Self { tag_repo }
    }

    /// Generates a color for a tag based on its name
    fn generate_tag_color(name: &str) -> String {
        let colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
            "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
            "#F8C471", "#82E0AA", "#AED6F1", "#D7BDE2", "#F9E79F",
            "#FADBD8", "#D5DBDB", "#FCF3CF", "#EBDEF0", "#EBF5FB"
        ];
        
        let hash = name.chars().fold(0u32, |acc, c| acc.wrapping_add(c as u32));
        colors[hash as usize % colors.len()].to_string()
    }

    /// Validates tag name for creation
    fn validate_tag_name(name: &str) -> Result<(), TagError> {
        let trimmed = name.trim();
        
        if trimmed.is_empty() {
            return Err(TagError::Validation {
                message: "Tag name cannot be empty".to_string(),
            });
        }
        
        if trimmed.len() > 50 {
            return Err(TagError::Validation {
                message: "Tag name is too long (max 50 characters)".to_string(),
            });
        }
        
        // Check for invalid characters
        if trimmed.contains(|c: char| c.is_control() || c == '\n' || c == '\t') {
            return Err(TagError::Validation {
                message: "Tag name contains invalid characters".to_string(),
            });
        }
        
        Ok(())
    }
}

#[async_trait]
impl TagService for TagServiceImpl {
    async fn create_tag(&self, mut input: CreateTagInput) -> Result<TagModel, TagError> {
        // Validate and normalize tag name
        input.name = input.name.trim().to_string();
        Self::validate_tag_name(&input.name)?;
        
        // Check if tag already exists
        if let Some(_existing_tag) = self.tag_repo.get_by_name(&input.name).await
            .map_err(|e| TagError::Database { message: e.to_string() })? {
            return Err(TagError::AlreadyExists { name: input.name });
        }
        
        // Generate color if not provided
        if input.color.is_none() {
            input.color = Some(Self::generate_tag_color(&input.name));
        }
        
        // Validate input
        input.validate().map_err(|e| TagError::Validation { message: e.to_string() })?;
        
        // Create the tag
        self.tag_repo.create(input).await
            .map_err(|e| match e {
                RepositoryError::Validation(ve) => TagError::Validation { message: ve.to_string() },
                _ => TagError::Database { message: e.to_string() },
            })
    }

    async fn list_tags(&self) -> Result<Vec<TagModel>, TagError> {
        self.tag_repo.list().await
            .map_err(|e| TagError::Database { message: e.to_string() })
    }

    async fn delete_unused_tags(&self) -> Result<Vec<String>, TagError> {
        self.tag_repo.delete_unused().await
            .map_err(|e| TagError::Database { message: e.to_string() })
    }

    async fn get_tasks_by_tag(&self, tag_name: &str) -> Result<Vec<TaskModel>, TagError> {
        // Validate tag name
        Self::validate_tag_name(tag_name)?;
        
        // Check if tag exists
        if self.tag_repo.get_by_name(tag_name).await
            .map_err(|e| TagError::Database { message: e.to_string() })?
            .is_none() {
            return Err(TagError::NotFound { name: tag_name.to_string() });
        }
        
        self.tag_repo.get_tasks_by_tag(tag_name).await
            .map_err(|e| TagError::Database { message: e.to_string() })
    }

    async fn get_tag_suggestions(&self, query: &str) -> Result<Vec<TagModel>, TagError> {
        let query = query.trim().to_lowercase();
        
        if query.is_empty() {
            // Return all tags if no query
            return self.list_tags().await;
        }
        
        // Get all tags and filter by query
        let all_tags = self.tag_repo.list().await
            .map_err(|e| TagError::Database { message: e.to_string() })?;
        
        let mut matching_tags: Vec<TagModel> = all_tags
            .into_iter()
            .filter(|tag| {
                let tag_name = tag.name.to_lowercase();
                tag_name.contains(&query) || tag_name.starts_with(&query)
            })
            .collect();
        
        // Sort by relevance: exact matches first, then starts_with, then contains
        matching_tags.sort_by(|a, b| {
            let a_name = a.name.to_lowercase();
            let b_name = b.name.to_lowercase();
            
            let a_exact = a_name == query;
            let b_exact = b_name == query;
            
            if a_exact && !b_exact {
                return std::cmp::Ordering::Less;
            }
            if !a_exact && b_exact {
                return std::cmp::Ordering::Greater;
            }
            
            let a_starts = a_name.starts_with(&query);
            let b_starts = b_name.starts_with(&query);
            
            if a_starts && !b_starts {
                return std::cmp::Ordering::Less;
            }
            if !a_starts && b_starts {
                return std::cmp::Ordering::Greater;
            }
            
            // Finally sort alphabetically
            a_name.cmp(&b_name)
        });
        
        // Limit results to prevent overwhelming UI
        matching_tags.truncate(20);
        
        Ok(matching_tags)
    }

    async fn get_or_create_tag(&self, name: &str, color: Option<&str>) -> Result<TagModel, TagError> {
        let trimmed_name = name.trim();
        Self::validate_tag_name(trimmed_name)?;
        
        // Try to get existing tag first
        if let Some(existing_tag) = self.tag_repo.get_by_name(trimmed_name).await
            .map_err(|e| TagError::Database { message: e.to_string() })? {
            return Ok(existing_tag);
        }
        
        // Create new tag if it doesn't exist
        let input = CreateTagInput {
            name: trimmed_name.to_string(),
            color: color.map(|c| c.to_string()),
        };
        
        self.create_tag(input).await
    }

    async fn get_tag_usage_stats(&self) -> Result<Vec<(TagModel, usize)>, TagError> {
        let tags = self.tag_repo.list().await
            .map_err(|e| TagError::Database { message: e.to_string() })?;
        
        let mut tag_stats = Vec::new();
        
        for tag in tags {
            let tasks = self.tag_repo.get_tasks_by_tag(&tag.name).await
                .map_err(|e| TagError::Database { message: e.to_string() })?;
            
            tag_stats.push((tag, tasks.len()));
        }
        
        // Sort by usage count (descending) then by name
        tag_stats.sort_by(|a, b| {
            match b.1.cmp(&a.1) {
                std::cmp::Ordering::Equal => a.0.name.cmp(&b.0.name),
                other => other,
            }
        });
        
        Ok(tag_stats)
    }

    fn generate_color(&self, name: &str) -> String {
        Self::generate_tag_color(name)
    }
}