//! 窗口命令

use crate::models::Position;
use crate::AppState;
use tauri::{AppHandle, Manager, State};

/// 应用窗口透明度（通过 CSS 控制 webview 透明度）
pub fn apply_opacity(app: &AppHandle, opacity: f32) {
    if let Some(window) = app.get_webview_window("main") {
        // 通过 eval 注入 CSS opacity 控制整个页面的透明度
        let css = format!("document.documentElement.style.opacity = '{}'", opacity);
        let _ = window.eval(&css);
    }
}

/// 显示并聚焦主窗口（错误横幅等场景专用：与 toggle 不同，已可见时不会隐藏）
#[tauri::command]
pub fn show_window(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    if !window.is_visible().unwrap_or(false) {
        restore_window_position(&window, state.inner());
    }
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

/// 恢复保存的窗口位置；无保存位置、或位置所在显示器已断开
/// （拔显示器/改分辨率导致窗口在屏幕外，快捷键看起来“失灵”）时居中当前显示器
pub fn restore_window_position(window: &tauri::WebviewWindow, state: &AppState) {
    use tauri::Position;

    // load_arc 拿缓存共享快照即可，免整份克隆
    let saved_position = state
        .storage
        .read()
        .load_arc()
        .ok()
        .and_then(|data| data.settings.window_position.clone());

    let Some(pos) = saved_position else {
        center_on_monitor(window);
        return;
    };

    // 位置仍落在某个已连接显示器内：直接恢复（保留多显示器布局）
    if monitor_containing(window, pos.x, pos.y).is_some() {
        window
            .set_position(Position::Physical(tauri::PhysicalPosition {
                x: pos.x,
                y: pos.y,
            }))
            .unwrap_or_default();
        return;
    }

    // 目标显示器已不存在：居中到当前显示器
    center_on_monitor(window);
}

/// 位置是否落在某个已连接显示器的范围内
fn monitor_containing(window: &tauri::WebviewWindow, x: i32, y: i32) -> Option<tauri::Monitor> {
    let Ok(monitors) = window.available_monitors() else {
        return None;
    };
    monitors.into_iter().find(|m| {
        let p = m.position();
        let s = m.size();
        x >= p.x && y >= p.y && x < p.x + s.width as i32 && y < p.y + s.height as i32
    })
}

/// 在当前显示器上居中（偏上 1/3，符合呼出式面板习惯）
fn center_on_monitor(window: &tauri::WebviewWindow) {
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
}

/// 隐藏窗口（先隐藏让用户无感，再后台保存位置；失焦事件处理器检测到
/// 已隐藏会跳过，不会重复保存）
#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.hide().map_err(|e| e.to_string())?;
    // 位置保存含双 fsync，放后台线程执行，避免阻塞调用线程
    let app_bg = app.clone();
    tauri::async_runtime::spawn_blocking(move || save_position(&app_bg));
    Ok(())
}

/// 保存当前窗口位置（不依赖前端触发；失焦自动隐藏等内部路径共用）
pub fn save_position(app: &AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<AppState>();
        save_window_position_inner(&window, &state);
    }
}

/// 内部函数：保存窗口位置到存储
fn save_window_position_inner(window: &tauri::WebviewWindow, state: &State<'_, AppState>) {
    if let Ok(pos) = window.outer_position() {
        let storage = state.storage.write();
        if let Ok(mut data) = storage.load() {
            data.settings.window_position = Some(Position { x: pos.x, y: pos.y });
            storage.save(data).unwrap_or_default();
        }
    }
}
