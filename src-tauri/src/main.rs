//! PromptX 应用入口

// Windows 下隐藏控制台窗口
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

use commands::clipboard::capture_selection_on_wakeup;
use parking_lot::RwLock;
use services::storage::StorageService;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// 应用状态
pub struct AppState {
    pub storage: Arc<RwLock<StorageService>>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            // 初始化应用状态（必须在注册快捷键之前）
            let storage = Arc::new(RwLock::new(StorageService::new(app)));

            app.manage(AppState {
                storage,
            });

            // 注册全局快捷键 Alt+Space
            let shortcut = Shortcut::new(Some(tauri_plugin_global_shortcut::Modifiers::ALT), tauri_plugin_global_shortcut::Code::Space);

            app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    // 切换窗口显示/隐藏（带剪贴板捕获）
                    toggle_window_with_clipboard_capture(app);
                }
            })?;

            // 监听窗口失去焦点事件，自动隐藏
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        // 失去焦点时隐藏窗口
                        window_clone.hide().unwrap_or_default();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 提示词管理
            commands::prompt::get_app_data,
            commands::prompt::get_all_prompts,
            commands::prompt::search_prompts,
            commands::prompt::create_prompt,
            commands::prompt::update_prompt,
            commands::prompt::delete_prompt,
            commands::prompt::update_prompt_usage,
            commands::prompt::export_data,
            commands::prompt::import_data,
            // 空间管理
            commands::space::create_space,
            commands::space::update_space,
            commands::space::delete_space,
            // 剪贴板
            commands::clipboard::get_clipboard_text,
            commands::clipboard::get_wakeup_clipboard,
            commands::clipboard::set_clipboard_text,
            commands::clipboard::paste_to_cursor,
            commands::clipboard::paste_and_restore,
            commands::clipboard::cut_selection,
            // 设置
            commands::settings::get_settings,
            commands::settings::update_settings,
            // 窗口
            commands::window::toggle_window,
            commands::window::hide_window,
            commands::window::save_window_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 切换窗口显示/隐藏（带剪贴板捕获，用于快捷键回调）
/// 关键：在窗口显示前执行复制，此时焦点仍在原窗口
fn toggle_window_with_clipboard_capture(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            // 窗口已显示 → 隐藏窗口
            window.hide().unwrap_or_default();
        } else {
            // 窗口隐藏 → 显示窗口
            // 关键步骤：在窗口显示前捕获选中内容
            // 此时焦点仍在原窗口，Ctrl+C 会发送到原窗口
            capture_selection_on_wakeup(app);

            // 居中显示
            use tauri::Position;

            if let Some(monitor) = window.current_monitor().ok().flatten() {
                let monitor_size = monitor.size();
                let window_size = window.outer_size().unwrap_or_default();

                let x = (monitor_size.width.saturating_sub(window_size.width)) / 2;
                let y = (monitor_size.height.saturating_sub(window_size.height)) / 3;

                window
                    .set_position(Position::Physical(tauri::PhysicalPosition {
                        x: x as i32,
                        y: y as i32,
                    }))
                    .unwrap_or_default();
            }

            // 显示窗口并获取焦点
            window.show().unwrap_or_default();
            window.set_focus().unwrap_or_default();
        }
    }
}