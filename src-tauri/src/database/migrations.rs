/**
 * Database migration utilities
 * 
 * Note: Actual migration files will be created in the migrations/ directory
 * This module provides utilities for managing migrations programmatically
 */

use sqlx::SqlitePool;

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Migrations will be implemented in later tasks
    // For now, we use create_tables_if_not_exists
    create_tables_if_not_exists(pool).await
}

pub async fn create_tables_if_not_exists(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create tasks table with proper constraints
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
            priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
            due_date INTEGER,
            estimated_duration INTEGER CHECK (estimated_duration > 0),
            start_time INTEGER,
            completed_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            parent_id TEXT,
            FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create tags table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create task_tags junction table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS task_tags (
            task_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (task_id, tag_id),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create audit_logs table with action constraints
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'deleted')),
            old_value TEXT,
            new_value TEXT,
            field_name TEXT,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for performance
    create_indexes(pool).await?;

    Ok(())
}

async fn create_indexes(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let indexes = [
        // Task table indexes for common queries
        "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time)",
        
        // Composite indexes for common filter combinations
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON tasks(status, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_parent_status ON tasks(parent_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_due_priority ON tasks(due_date, priority)",
        
        // Full-text search index for task titles and descriptions
        "CREATE INDEX IF NOT EXISTS idx_tasks_title_fts ON tasks(title COLLATE NOCASE)",
        
        // Tag table indexes
        "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name COLLATE NOCASE)",
        "CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at)",
        
        // Task-Tag junction table indexes
        "CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)",
        
        // Audit logs indexes for history queries and pagination
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_task_timestamp ON audit_logs(task_id, timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC)",
    ];

    for index_sql in indexes {
        sqlx::query(index_sql).execute(pool).await?;
    }

    // Create additional performance optimizations
    create_performance_optimizations(pool).await?;

    Ok(())
}

async fn create_performance_optimizations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Enable WAL mode for better concurrent access
    sqlx::query("PRAGMA journal_mode = WAL")
        .execute(pool)
        .await?;

    // Set synchronous mode to NORMAL for better performance
    sqlx::query("PRAGMA synchronous = NORMAL")
        .execute(pool)
        .await?;

    // Increase cache size for better performance (10MB)
    sqlx::query("PRAGMA cache_size = -10000")
        .execute(pool)
        .await?;

    // Enable foreign key constraints
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(pool)
        .await?;

    // Set temp store to memory for better performance
    sqlx::query("PRAGMA temp_store = MEMORY")
        .execute(pool)
        .await?;

    // Optimize for read-heavy workloads
    sqlx::query("PRAGMA optimize")
        .execute(pool)
        .await?;

    Ok(())
}