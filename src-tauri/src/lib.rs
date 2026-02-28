mod apps;
mod db;
mod network;
mod process;
mod security;
mod startup;
mod storage;
mod system;
mod tweaks;
mod power;
mod ai;

use db::DbState;
use ai::OllamaState;
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
            app.manage(OllamaState { process: Mutex::new(None) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            system::get_system_vitals,
            // Security
            security::is_admin,
            security::elevate_and_execute,
            security::defender_get_status,
            security::defender_run_scan,
            security::defender_update_signatures,
            security::defender_set_realtime,
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
            storage::get_disk_health,
            // Process
            process::get_processes,
            process::kill_process,
            process::set_process_priority,
            process::open_file_location,
            // Network
            network::get_network_interfaces,
            network::ping_host,
            // Apps
            apps::check_app_installed,
            apps::install_app,
            apps::check_choco_available,
            // Power
            power::get_power_plans,
            power::set_active_power_plan,
            // AI
            ai::start_ollama,
            ai::stop_ollama,
            ai::download_ollama,
            ai::pull_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
