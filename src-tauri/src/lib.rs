// Module declarations
pub mod commands;
pub mod database;
pub mod services;
pub mod error;

// Re-exports
pub use error::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialize database (temporarily disabled for development)
      // tauri::async_runtime::block_on(async {
      //   database::connection::initialize_database().await
      // })?;
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Task management commands
      commands::tasks::create_task,
      commands::tasks::get_task,
      commands::tasks::list_tasks,
      commands::tasks::update_task,
      commands::tasks::delete_task,
      commands::tasks::toggle_task_status,
      commands::tasks::add_subtask,
      commands::tasks::get_subtasks,
      commands::tasks::calculate_task_progress,
      // Tag management commands
      commands::tags::create_tag,
      commands::tags::list_tags,
      commands::tags::delete_unused_tags,
      commands::tags::get_tasks_by_tag,
      commands::tags::get_tag_suggestions,
      // Audit commands
      commands::audit::get_task_history,
      commands::audit::get_audit_logs,
      commands::audit::get_detailed_change_info,
      commands::audit::get_change_summary,
      commands::audit::bulk_update_tasks,
      commands::audit::export_data,
      commands::audit::import_data,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
