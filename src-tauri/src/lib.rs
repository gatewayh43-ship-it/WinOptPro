mod apps;
mod backup;
mod benchmark;
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
mod update;
mod wsl;
mod ai;

use db::DbState;
use ai::OllamaState;
use std::sync::Mutex;
use tauri::Manager;

pub struct AdminState {
    pub is_admin: bool,
}

#[tauri::command]
fn get_is_admin(state: tauri::State<'_, AdminState>) -> bool {
    state.is_admin
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let run_result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == "main" {
                    let state = window.state::<OllamaState>();
                    ai::stop_ollama_sync(&state);
                }
            }
        })
        .setup(|app| {
            // Initialize SQLite database
            let conn = db::init_db(&app.handle()).map_err(|e| {
                eprintln!("FATAL: Database init failed: {}", e);
                Box::<dyn std::error::Error>::from(e)
            })?;
            app.manage(DbState(Mutex::new(conn)));
            app.manage(OllamaState { process: Mutex::new(None) });
            let is_admin_result = security::is_admin().unwrap_or(false);
            if !is_admin_result {
                log::warn!("WinOpt Pro is running WITHOUT administrator privileges.");
            }
            app.manage(AdminState { is_admin: is_admin_result });
            // Initialize updater plugin (desktop only)
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Admin
            get_is_admin,
            // System
            system::get_system_vitals,
            // Security
            security::is_admin,
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
            db::record_consent,
            db::check_consent_exists,
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
            backup::export_user_data,
            backup::read_installer_config,
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
            gaming::check_presentmon,
            gaming::download_presentmon,
            gaming::start_fps_counter,
            gaming::stop_fps_counter,
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
            // Updater
            update::check_for_update,
            update::download_and_install_update,
            // Benchmark
            benchmark::get_pc_score,
            benchmark::run_winsat_formal,
            benchmark::run_speed_test,
            benchmark::run_cpu_benchmark,
            benchmark::run_disk_benchmark,
            benchmark::check_blender_installed,
            benchmark::run_blender_benchmark,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = run_result {
        log::error!("FATAL: tauri application exited with error: {}", e);
        eprintln!("FATAL: tauri application exited with error: {}", e);
        std::process::exit(1);
    }
}
