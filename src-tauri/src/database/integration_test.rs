#[cfg(test)]
mod integration_tests {
    use crate::database::task_repository::TaskRepository;
    use crate::models::task::{CreateTaskRequest, UpdateTaskRequest};
    use rusqlite::Connection;

    #[test]
    fn test_complete_crud_workflow() {
        println!("=== 开始完整的 CRUD 操作测试 ===");
        
        // 创建内存数据库
        let conn = Connection::open_in_memory().unwrap();
        
        // 创建表结构
        conn.execute(
            "CREATE TABLE tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                completed BOOLEAN DEFAULT FALSE,
                due_date TEXT,
                project_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        ).unwrap();
        
        println!("✓ 数据库和表结构创建成功");

        // 1. CREATE - 创建任务
        println!("\n--- 1. CREATE 操作 ---");
        let create_request = CreateTaskRequest {
            title: "学习 Rust 编程".to_string(),
            description: Some("完成 Tauri 应用开发".to_string()),
            due_date: None,
            project_id: None,
        };
        
        let task1 = TaskRepository::create(&conn, &create_request).unwrap();
        println!("创建任务 1: ID={}, 标题='{}', 描述='{:?}'", 
                task1.id, task1.title, task1.description);
        
        let create_request2 = CreateTaskRequest {
            title: "写技术博客".to_string(),
            description: None,
            due_date: None,
            project_id: None,
        };
        
        let task2 = TaskRepository::create(&conn, &create_request2).unwrap();
        println!("创建任务 2: ID={}, 标题='{}', 描述='{:?}'", 
                task2.id, task2.title, task2.description);

        // 2. READ - 读取任务
        println!("\n--- 2. READ 操作 ---");
        
        // 按 ID 读取单个任务
        let retrieved_task = TaskRepository::get_by_id(&conn, task1.id).unwrap();
        println!("按 ID 读取任务: ID={}, 标题='{}'", 
                retrieved_task.id, retrieved_task.title);
        
        // 读取所有任务
        let all_tasks = TaskRepository::get_all(&conn).unwrap();
        println!("读取所有任务，共 {} 个:", all_tasks.len());
        for (index, task) in all_tasks.iter().enumerate() {
            println!("  任务 {}: ID={}, 标题='{}', 描述='{:?}'", 
                    index + 1, task.id, task.title, task.description);
        }

        // 3. UPDATE - 更新任务
        println!("\n--- 3. UPDATE 操作 ---");
        let update_request = UpdateTaskRequest {
            title: Some("学习 Rust 和 Tauri 开发".to_string()),
            description: Some("完成跨平台桌面应用开发，包括前后端".to_string()),
            due_date: None,
            project_id: None,
            completed: None,
        };
        
        let updated_task = TaskRepository::update(&conn, task1.id, &update_request).unwrap();
        println!("更新任务: ID={}, 新标题='{}', 新描述='{:?}'", 
                updated_task.id, updated_task.title, updated_task.description);
        
        // 验证更新是否成功
        let verified_task = TaskRepository::get_by_id(&conn, task1.id).unwrap();
        println!("验证更新结果: 标题='{}', 描述='{:?}'", 
                verified_task.title, verified_task.description);

        // 4. DELETE - 删除任务
        println!("\n--- 4. DELETE 操作 ---");
        println!("删除任务 ID: {}", task2.id);
        TaskRepository::delete(&conn, task2.id).unwrap();
        
        // 验证删除是否成功
        let delete_result = TaskRepository::get_by_id(&conn, task2.id);
        match delete_result {
            Ok(_) => println!("❌ 删除失败，任务仍然存在"),
            Err(_) => println!("✓ 删除成功，任务不存在"),
        }
        
        // 检查剩余任务
        let remaining_tasks = TaskRepository::get_all(&conn).unwrap();
        println!("剩余任务数量: {}", remaining_tasks.len());
        
        println!("\n=== CRUD 操作测试完成 ===");
        
        // 断言验证
        assert_eq!(updated_task.title, "学习 Rust 和 Tauri 开发");
        assert_eq!(updated_task.description, Some("完成跨平台桌面应用开发，包括前后端".to_string()));
        assert_eq!(remaining_tasks.len(), 1);
        assert!(delete_result.is_err());
    }
}