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
        
        // Composite indexes for common filter combinations
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date)",
        
        // Tag table indexes
        "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)",
        "CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at)",
        
        // Task-Tag junction table indexes
        "CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)",
        
        // Audit logs indexes for history queries
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_task_timestamp ON audit_logs(task_id, timestamp)",
    ];

    for index_sql in indexes {
        sqlx::query(index_sql).execute(pool).await?;
    }

    Ok(())
}