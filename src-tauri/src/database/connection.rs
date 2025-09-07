use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use crate::database::migrations::MigrationManager;

/// Database connection manager
pub struct DatabaseManager {
    db_path: PathBuf,
}

impl DatabaseManager {
    /// Create a new database manager instance
    pub fn new() -> Result<Self> {
        let db_path = Self::get_database_path()?;
        Ok(DatabaseManager { db_path })
    }

    /// Get the database file path
    fn get_database_path() -> Result<PathBuf> {
        let app_data_dir = app_data_dir(&tauri::Config::default())
            .ok_or_else(|| rusqlite::Error::InvalidPath("Failed to get app data directory".into()))?;
        
        // Create app data directory if it doesn't exist
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| rusqlite::Error::InvalidPath(format!("Failed to create app data directory: {}", e).into()))?;
        
        Ok(app_data_dir.join("uletodo.db"))
    }

    /// Get a database connection
    pub fn get_connection(&self) -> Result<Connection> {
        Connection::open(&self.db_path)
    }

    /// Initialize the database with required tables and run migrations
    pub fn initialize(&self) -> Result<()> {
        let conn = self.get_connection()?;
        MigrationManager::run_migrations(&conn)?;
        Ok(())
    }
}