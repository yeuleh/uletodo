// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod commands;
mod models;
mod database;
mod services;
mod utils;

use commands::task_commands::{create_task, get_all_tasks, get_tasks, get_task_by_id, update_task, delete_task};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_task,
            get_all_tasks,
            get_tasks,
            get_task_by_id,
            update_task,
            delete_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
