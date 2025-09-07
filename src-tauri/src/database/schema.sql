-- Tasks table structure with all required fields using TEXT for dates (RFC3339 format)
-- This provides better readability and SQLite date function compatibility
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date TEXT,  -- RFC3339 format: 2024-12-31T23:59:59Z
    project_id INTEGER,
    created_at TEXT NOT NULL,  -- RFC3339 format
    updated_at TEXT NOT NULL   -- RFC3339 format
);