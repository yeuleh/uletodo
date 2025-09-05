/**
 * Tag management Tauri commands
 */

use crate::database::{TagModel, CreateTagInput, TaskModel, connection::get_db_pool};
use crate::services::{TagServiceImpl, TagService};
use crate::database::repositories::SqliteTagRepository;
use crate::error::TagError;
use std::sync::Arc;

#[tauri::command]
pub async fn create_tag(input: CreateTagInput) -> Result<TagModel, TagError> {
    // Validate input
    input.validate().map_err(|e| TagError::Validation { 
        message: e.to_string() 
    })?;
    
    let pool = get_db_pool();
    let tag_repo = Arc::new(SqliteTagRepository::new(pool.clone()));
    let tag_service = TagServiceImpl::new(tag_repo);
    
    // Create tag with provided color or let the service generate one
    let mut tag_input = input;
    if tag_input.color.is_none() {
        tag_input.color = Some(tag_service.generate_color(&tag_input.name));
    }
    
    tag_service.create_tag(tag_input).await
}

#[tauri::command]
pub async fn list_tags() -> Result<Vec<TagModel>, TagError> {
    let pool = get_db_pool();
    let tag_repo = Arc::new(SqliteTagRepository::new(pool.clone()));
    let tag_service = TagServiceImpl::new(tag_repo);
    
    tag_service.list_tags().await
}

#[tauri::command]
pub async fn delete_unused_tags() -> Result<Vec<String>, TagError> {
    let pool = get_db_pool();
    let tag_repo = Arc::new(SqliteTagRepository::new(pool.clone()));
    let tag_service = TagServiceImpl::new(tag_repo);
    
    tag_service.delete_unused_tags().await
}

#[tauri::command]
pub async fn get_tasks_by_tag(tag_name: String) -> Result<Vec<TaskModel>, TagError> {
    let pool = get_db_pool();
    let tag_repo = Arc::new(SqliteTagRepository::new(pool.clone()));
    let tag_service = TagServiceImpl::new(tag_repo);
    
    tag_service.get_tasks_by_tag(&tag_name).await
}

#[tauri::command]
pub async fn get_tag_suggestions(query: String) -> Result<Vec<TagModel>, TagError> {
    let pool = get_db_pool();
    let tag_repo = Arc::new(SqliteTagRepository::new(pool.clone()));
    let tag_service = TagServiceImpl::new(tag_repo);
    
    // Filter tags that match the query (case-insensitive)
    let all_tags = tag_service.list_tags().await?;
    let query_lower = query.to_lowercase();
    
    let suggestions = all_tags
        .into_iter()
        .filter(|tag| tag.name.to_lowercase().contains(&query_lower))
        .collect();
    
    Ok(suggestions)
}