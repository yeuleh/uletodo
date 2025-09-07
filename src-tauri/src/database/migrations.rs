use rusqlite::{Connection, Result};

/// Database migration manager
pub struct MigrationManager;

impl MigrationManager {
    /// Run all necessary migrations
    pub fn run_migrations(conn: &Connection) -> Result<()> {
        // Create user_version table if it doesn't exist to track schema version
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)",
            [],
        )?;
        
        let current_version = Self::get_schema_version(conn)?;
        
        if current_version < 1 {
            Self::migrate_to_v1(conn)?;
        }
        
        if current_version < 2 {
            Self::migrate_to_v2(conn)?;
        }
        
        Ok(())
    }
    
    /// Get current schema version
    fn get_schema_version(conn: &Connection) -> Result<i32> {
        let version: Result<i32> = conn.query_row(
            "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
            [],
            |row| row.get(0),
        );
        
        match version {
            Ok(v) => Ok(v),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
            Err(e) => Err(e),
        }
    }
    
    /// Set schema version
    fn set_schema_version(conn: &Connection, version: i32) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO schema_version (version) VALUES (?1)",
            [version],
        )?;
        Ok(())
    }
    
    /// Migration to version 1: Create basic tasks table
    fn migrate_to_v1(conn: &Connection) -> Result<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;
        
        Self::set_schema_version(conn, 1)?;
        Ok(())
    }
    
    /// Migration to version 2: Add completed, due_date, and project_id fields
    fn migrate_to_v2(conn: &Connection) -> Result<()> {
        // Check if columns already exist
        let mut has_completed = false;
        let mut has_due_date = false;
        let mut has_project_id = false;
        
        let mut stmt = conn.prepare("PRAGMA table_info(tasks)")?;
        let column_iter = stmt.query_map([], |row| {
            let column_name: String = row.get(1)?;
            Ok(column_name)
        })?;
        
        for column_result in column_iter {
            let column_name = column_result?;
            match column_name.as_str() {
                "completed" => has_completed = true,
                "due_date" => has_due_date = true,
                "project_id" => has_project_id = true,
                _ => {}
            }
        }
        
        // Add missing columns
        if !has_completed {
            conn.execute("ALTER TABLE tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE", [])?;
        }
        
        if !has_due_date {
            conn.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT", [])?;
        }
        
        if !has_project_id {
            conn.execute("ALTER TABLE tasks ADD COLUMN project_id INTEGER", [])?;
        }
        
        Self::set_schema_version(conn, 2)?;
        Ok(())
    }
}