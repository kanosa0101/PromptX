//! 窗口命令

use crate::AppState;
use tauri::{AppHandle, Manager, State};
use crate::models::Position;

/// 应用窗口透明度（通过 CSS 控制 webview 透明度）
pub fn apply_opacity(app: &AppHandle, opacity: f32) {
    if let Some(window) = app.get_webview_window("main") {
        // 通过 eval 注入 CSS opacity 控制整个页面的透明度
        let css = format!(
            "document.documentElement.style.opacity = '{}'",
            opacity
        );
        let _ = window.eval(&css);
    }
}

/// 显示/隐藏窗口（支持位置记忆）
#[tauri::command]
pub fn toggle_window(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    if window.is_visible().unwrap_or(false) {
        // 保存当前窗口位置
        save_window_position_inner(&window, &state);
        window.hide().map_err(|e| e.to_string())?;
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
                .map_err(|e| e.to_string())?;
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
                .map_err(|e| e.to_string())?;
        }

        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 隐藏窗口
#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.hide().map_err(|e| e.to_string())
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