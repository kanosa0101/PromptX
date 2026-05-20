//! 窗口命令

use crate::AppState;
use tauri::{AppHandle, Manager, State};
use crate::models::Position;

/// 显示/隐藏窗口（支持位置记忆）
#[tauri::command]
pub fn toggle_window(app: AppHandle, state: State<'_, AppState>) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            // 保存当前窗口位置
            save_window_position_inner(&window, &state);
            window.hide().unwrap_or_default();
        } else {
            // 读取保存的位置或居中显示
            use tauri::Position;

            let storage = state.storage.read();
            let saved_position = storage.load()
                .ok()
                .and_then(|data| data.settings.window_position);

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

            window.show().unwrap_or_default();
            window.set_focus().unwrap_or_default();
        }
    }
}

/// 隐藏窗口
#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().unwrap_or_default();
    }
}

/// 保存窗口位置
#[tauri::command]
pub fn save_window_position(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        save_window_position_inner(&window, &state);
        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}

/// 内部函数：保存窗口位置到存储
fn save_window_position_inner(window: &tauri::WebviewWindow, state: &State<'_, AppState>) {
    if let Ok(pos) = window.outer_position() {
        let storage = state.storage.write();
        if let Ok(mut data) = storage.load() {
            data.settings.window_position = Some(Position {
                x: pos.x,
                y: pos.y,
            });
            storage.save(data).unwrap_or_default();
        }
    }
}