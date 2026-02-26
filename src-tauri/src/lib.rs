mod db;
mod security;
mod startup;
mod storage;
mod system;
mod tweaks;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize SQLite database
            let conn =
                db::init_db(&app.handle()).expect("Failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            system::get_system_vitals,
            // Security
            security::is_admin,
            // Tweaks
            tweaks::execute_tweak,
            tweaks::validate_tweak,
            tweaks::revert_tweak,
            tweaks::execute_batch_tweaks,
            // History
            db::get_tweak_history,
            db::clear_tweak_history,
            // Startup
            startup::get_startup_items,
            startup::set_startup_item_state,
            // Storage
            storage::scan_junk_files,
            storage::execute_cleanup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
