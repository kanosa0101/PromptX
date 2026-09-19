//! PromptX 应用入口

// Windows 下隐藏控制台窗口
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

use commands::clipboard::capture_selection_on_wakeup;
use commands::window;
use parking_lot::RwLock;
use services::storage::StorageService;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// 应用状态
pub struct AppState {
    pub storage: Arc<RwLock<StorageService>>,
}

fn main() {
    tauri::Builder::default()
        // 单实例保护：重复启动时唤起已有实例的窗口并退出新进程，
        // 避免多个实例抢占全局快捷键（否则快捷键会静默失效）
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            // MacosLauncher 参数仅在 macOS 上生效，其他平台会被 Tauri 忽略
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            // 初始化应用状态（必须在注册快捷键之前）
            let storage = Arc::new(RwLock::new(StorageService::new(app)));

            app.manage(AppState { storage });

            // 按设置注册全部全局快捷键（窗口呼出 + AI 优化）
            let app_handle = app.handle().clone();
            apply_shortcuts(&app_handle);

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

            // 启动时应用保存的设置
            let state = app_handle.state::<AppState>();
            let storage_read = state.storage.read();
            if let Ok(data) = storage_read.load() {
                // 应用窗口透明度
                window::apply_opacity(&app_handle, data.settings.window_opacity);

                // 同步开机自启状态
                if data.settings.launch_at_login {
                    let _ = app_handle.autolaunch().enable();
                } else {
                    let _ = app_handle.autolaunch().disable();
                }
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
            // AI 优化
            commands::ai::optimize_apply_result,
            commands::ai::optimize_cancel,
            commands::ai::ai_debug_log,
            commands::ai::clipboard_optimize_apply_result,
            commands::ai::clipboard_optimize_cancel,
            // 设置
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::register_hotkey,
            // 窗口
            commands::window::toggle_window,
            commands::window::hide_window,
            commands::window::save_window_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 按当前设置注册全部全局快捷键（先注销已有注册）
/// setup 启动与 update_settings 保存后共用
pub fn apply_shortcuts(app: &tauri::AppHandle) {
    use commands::settings::parse_hotkey;

    let (global_hotkey, optimize_hotkey, clipboard_hotkey) = {
        let state = app.state::<AppState>();
        let storage = state.storage.read();
        match storage.load() {
            Ok(data) => (
                data.settings.global_hotkey.clone(),
                data.settings.optimize_hotkey.clone(),
                data.settings.clipboard_optimize_hotkey.clone(),
            ),
            Err(_) => (
                "Alt+Space".to_string(),
                "Ctrl+Alt+O".to_string(),
                "Ctrl+Shift+B".to_string(),
            ),
        }
    };

    // 先注销全部已注册快捷键，避免残留旧绑定
    let _ = app.global_shortcut().unregister_all();

    // 窗口呼出快捷键
    if let Ok(shortcut) = parse_hotkey(&global_hotkey) {
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    // 切换窗口显示/隐藏（带剪贴板捕获）
                    toggle_window_with_clipboard_capture(app);
                }
            });
        match result {
            Ok(()) => eprintln!("已注册窗口快捷键: {}", global_hotkey),
            Err(e) => eprintln!("注册窗口快捷键 {} 失败: {}", global_hotkey, e),
        }
    }

    // AI 优化快捷键（后台全自动流程：截取选中文本 → 前端调 AI → 贴回原位，不显示窗口）
    // 关键：监听松开（Released）而非按下 —— 若在按下瞬间模拟 Ctrl+C，用户手指
    // 仍按着 Ctrl/Shift，目标应用实际收到 Ctrl+Shift+C，复制会静默失败
    if let Ok(shortcut) = parse_hotkey(&optimize_hotkey) {
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Released {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        commands::ai::capture_selection_for_optimize(app).await;
                    });
                }
            });
        match result {
            Ok(()) => eprintln!("已注册 AI 优化快捷键: {} (松开触发)", optimize_hotkey),
            Err(e) => eprintln!("注册 AI 优化快捷键 {} 失败: {}", optimize_hotkey, e),
        }
    }

    // 剪贴板优化快捷键（不模拟按键：优化剪贴板内容并写回，适用于终端等选区不可靠场景）
    if let Ok(shortcut) = parse_hotkey(&clipboard_hotkey) {
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Released {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        commands::ai::capture_clipboard_for_optimize(app).await;
                    });
                }
            });
        match result {
            Ok(()) => eprintln!("已注册剪贴板优化快捷键: {} (松开触发)", clipboard_hotkey),
            Err(e) => eprintln!("注册剪贴板优化快捷键 {} 失败: {}", clipboard_hotkey, e),
        }
    }
}

/// 切换窗口显示/隐藏（带剪贴板捕获，用于快捷键回调）
/// 关键：在窗口显示前执行复制，此时焦点仍在原窗口
pub fn toggle_window_with_clipboard_capture(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            // 窗口已显示 → 隐藏窗口
            window.hide().unwrap_or_default();
        } else {
            // 窗口隐藏 → 显示窗口
            // 关键步骤：在窗口显示前捕获选中内容
            capture_selection_on_wakeup(app);

            // 尝试恢复保存的位置，无保存位置则居中
            use tauri::Position;
            let state = app.state::<AppState>();
            let storage = state.storage.read();
            let saved_position = storage
                .load()
                .ok()
                .and_then(|data| data.settings.window_position);
            drop(storage); // 释放读锁

            if let Some(pos) = saved_position {
                window
                    .set_position(Position::Physical(tauri::PhysicalPosition {
                        x: pos.x,
                        y: pos.y,
                    }))
                    .unwrap_or_default();
            } else if let Some(monitor) = window.current_monitor().ok().flatten() {
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
