/**
 * Database connection management
 */

use sqlx::{Pool, Sqlite, SqlitePool};
use std::sync::OnceLock;

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

pub async fn initialize_database() -> Result<(), sqlx::Error> {
    // Use a simple database path in the current directory for development
    let database_url = "sqlite:./tasks.db";
    
    println!("Connecting to database at: ./tasks.db");
    let pool = SqlitePool::connect(database_url).await?;
    
    // Create tables if they don't exist (migrations will be implemented in later tasks)
    crate::database::migrations::create_tables_if_not_exists(&pool).await?;
    
    DB_POOL.set(pool).map_err(|_| {
        sqlx::Error::Configuration("Failed to set database pool".into())
    })?;
    
    Ok(())
}

pub fn get_db_pool() -> &'static Pool<Sqlite> {
    DB_POOL.get().expect("Database pool not initialized")
}