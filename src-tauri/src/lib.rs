pub mod commands;
pub mod config;
pub mod tray;

use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            // Setup System Tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                log::error!("Failed to setup system tray: {}", e);
            }

            // Close-to-Tray: Intercept window close button to minimize instead of terminating
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect_server,
            commands::get_client_config,
            commands::save_client_config,
            commands::open_downloads_folder,
            commands::minimize_to_tray,
            commands::check_for_updates,
            commands::get_system_diagnostics,
            commands::self_heal_connectivity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TuneFlow desktop application");
}
