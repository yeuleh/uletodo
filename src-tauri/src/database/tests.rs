#[cfg(test)]
mod tests {
    use crate::database::task_repository::TaskRepository;
    use crate::models::task::{CreateTaskRequest, UpdateTaskRequest};
    use rusqlite::Connection;

    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        
        // Create tasks table
        conn.execute(
            "CREATE TABLE tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        ).unwrap();
        
        conn
    }

    #[test]
    fn test_create_task() {
        let conn = create_test_db();
        
        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: Some("Test Description".to_string()),
        };
        
        let task = TaskRepository::create(&conn, &request).unwrap();
        
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.description, Some("Test Description".to_string()));
        assert!(task.id > 0);
    }

    #[test]
    fn test_get_all_tasks() {
        let conn = create_test_db();
        
        // Create two tasks
        let request1 = CreateTaskRequest {
            title: "Task 1".to_string(),
            description: None,
        };
        let request2 = CreateTaskRequest {
            title: "Task 2".to_string(),
            description: Some("Description 2".to_string()),
        };
        
        TaskRepository::create(&conn, &request1).unwrap();
        TaskRepository::create(&conn, &request2).unwrap();
        
        let tasks = TaskRepository::get_all(&conn).unwrap();
        
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].title, "Task 2"); // Should be ordered by created_at DESC
        assert_eq!(tasks[1].title, "Task 1");
    }

    #[test]
    fn test_update_task() {
        let conn = create_test_db();
        
        let request = CreateTaskRequest {
            title: "Original Title".to_string(),
            description: Some("Original Description".to_string()),
        };
        
        let task = TaskRepository::create(&conn, &request).unwrap();
        
        let update_request = UpdateTaskRequest {
            title: Some("Updated Title".to_string()),
            description: Some("Updated Description".to_string()),
        };
        
        let updated_task = TaskRepository::update(&conn, task.id, &update_request).unwrap();
        
        assert_eq!(updated_task.title, "Updated Title");
        assert_eq!(updated_task.description, Some("Updated Description".to_string()));
        assert_eq!(updated_task.id, task.id);
    }

    #[test]
    fn test_delete_task() {
        let conn = create_test_db();
        
        let request = CreateTaskRequest {
            title: "Task to Delete".to_string(),
            description: None,
        };
        
        let task = TaskRepository::create(&conn, &request).unwrap();
        
        // Verify task exists
        let retrieved_task = TaskRepository::get_by_id(&conn, task.id).unwrap();
        assert_eq!(retrieved_task.title, "Task to Delete");
        
        // Delete task
        TaskRepository::delete(&conn, task.id).unwrap();
        
        // Verify task is deleted
        let result = TaskRepository::get_by_id(&conn, task.id);
        assert!(result.is_err());
    }
}