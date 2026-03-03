mod apps;
mod backup;
mod db;
mod drivers;
mod gaming;
mod gpu_driver;
mod latency;
mod network;
mod power;
mod privacy;
mod process;
mod report;
mod scheduler;
mod security;
mod startup;
mod storage;
mod system;
mod tweaks;
mod wsl;
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
            storage::get_disk_smart_status,
            storage::run_trim_optimization,
            // Process
            process::get_processes,
            process::kill_process,
            process::set_process_priority,
            process::open_file_location,
            // Network
            network::get_network_interfaces,
            network::ping_host,
            // Apps
            apps::check_choco_available,
            apps::check_app_installed,
            apps::install_app,
            apps::search_winget,
            apps::get_winget_info,
            apps::scrape_app_metadata,
            // Power
            power::get_power_plans,
            power::set_active_power_plan,
            power::get_battery_health,
            power::get_power_settings,
            power::set_power_setting,
            // Privacy
            privacy::scan_privacy_issues,
            privacy::fix_privacy_issues,
            privacy::check_privacy_issue,
            // Drivers
            drivers::list_drivers,
            drivers::get_unsigned_drivers,
            drivers::export_driver_list,
            // Backup
            backup::export_backup,
            backup::import_backup,
            backup::get_backup_info,
            // Report
            report::generate_system_report,
            report::save_system_report,
            // Scheduler
            scheduler::list_maintenance_tasks,
            scheduler::create_maintenance_task,
            scheduler::delete_maintenance_task,
            scheduler::run_maintenance_task_now,
            // Gaming
            gaming::detect_active_game,
            gaming::get_gpu_metrics,
            gaming::get_cpu_quick,
            gaming::set_gpu_power_limit,
            gaming::list_known_games,
            gaming::show_gaming_overlay,
            gaming::hide_gaming_overlay,
            // Latency
            latency::get_latency_status,
            latency::flush_standby_list,
            latency::get_bcdedit_settings,
            // GPU Driver Cleaner
            gpu_driver::get_gpu_drivers,
            gpu_driver::uninstall_gpu_drivers,
            gpu_driver::schedule_safe_mode_removal,
            gpu_driver::reboot_system,
            // WSL Manager
            wsl::get_wsl_status,
            wsl::list_wsl_distros,
            wsl::install_wsl_distro,
            wsl::uninstall_wsl_distro,
            wsl::set_default_distro,
            wsl::set_wsl_default_version,
            wsl::enable_wsl,
            wsl::disable_wsl,
            wsl::clean_uninstall_wsl,
            wsl::get_wsl_config,
            wsl::set_wsl_config,
            wsl::check_desktop_envs,
            wsl::install_desktop_env,
            wsl::launch_linux_mode,
            wsl::get_wsl_setup_state,
            wsl::shutdown_wsl,
            // AI
            ai::start_ollama,
            ai::stop_ollama,
            ai::download_ollama,
            ai::pull_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
