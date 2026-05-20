//! 剪贴板命令

use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;

/// 全局保存唤醒时的剪贴板内容（在窗口显示前复制）
pub static WAKEUP_CLIPBOARD: Mutex<Option<String>> = Mutex::new(None);

/// 全局保存原始剪贴板内容（输出后恢复）
pub static ORIGINAL_CLIPBOARD: Mutex<Option<String>> = Mutex::new(None);

/// 获取剪贴板文本
#[tauri::command]
pub fn get_clipboard_text(app: tauri::AppHandle) -> Result<String, String> {
    app.clipboard()
        .read_text()
        .map_err(|e| e.to_string())
}

/// 设置剪贴板文本
#[tauri::command]
pub fn set_clipboard_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())
}

/// 获取唤醒时保存的剪贴板内容（用于 {{clipboard}} 变量）
#[tauri::command]
pub fn get_wakeup_clipboard() -> Result<String, String> {
    if let Ok(guard) = WAKEUP_CLIPBOARD.lock() {
        Ok(guard.clone().unwrap_or_default())
    } else {
        Ok(String::new())
    }
}

/// 唤醒时保存剪贴板内容（在窗口显示前调用）
/// 用户需要先手动 Ctrl+C 复制选中内容
pub fn capture_selection_on_wakeup(app: &tauri::AppHandle) {
    // 直接读取剪贴板内容（用户已手动复制）
    let clipboard_content = app.clipboard().read_text().ok();

    if let Ok(mut guard) = WAKEUP_CLIPBOARD.lock() {
        *guard = clipboard_content;
    }
}

/// 剪切选中内容并返回剪切后的剪贴板内容
#[tauri::command]
pub fn cut_selection(app: tauri::AppHandle) -> Result<String, String> {
    // 保存原始剪贴板内容
    let original = app.clipboard()
        .read_text()
        .ok();

    if let Ok(mut guard) = ORIGINAL_CLIPBOARD.lock() {
        *guard = original;
    }

    // 执行剪切
    simulate_cut();

    // 等待剪贴板更新（增加等待时间）
    std::thread::sleep(Duration::from_millis(200));

    // 读取新的剪贴板内容
    let new_content = app.clipboard()
        .read_text()
        .unwrap_or_default();

    Ok(new_content)
}

/// 输出到剪贴板并模拟粘贴，之后恢复原剪贴板内容
#[tauri::command]
pub fn paste_and_restore(app: tauri::AppHandle, text: String) -> Result<(), String> {
    // 保存原始剪贴板内容
    let original = app.clipboard()
        .read_text()
        .ok();

    // 设置剪贴板内容
    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())?;

    // 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        window.hide().unwrap_or_default();
    }

    // 等待窗口隐藏完成
    std::thread::sleep(Duration::from_millis(50));

    // 模拟粘贴
    simulate_paste();

    // 等待粘贴完成后恢复原剪贴板
    std::thread::sleep(Duration::from_millis(150));
    if let Some(orig) = original {
        app.clipboard()
            .write_text(&orig)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 输出到剪贴板并模拟粘贴（简单版本，不恢复）
#[tauri::command]
pub fn paste_to_cursor(app: tauri::AppHandle, text: String) -> Result<(), String> {
    // 设置剪贴板内容
    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())?;

    // 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        window.hide().unwrap_or_default();
    }

    // 模拟粘贴
    simulate_paste();

    Ok(())
}

/// 模拟剪切按键 (Ctrl+X / Cmd+X)
fn simulate_cut() {
    simulate_copy_or_cut('x');
}

/// 模拟复制或剪切按键 (Ctrl+C/X 或 Cmd+C/X)
fn simulate_copy_or_cut(key: char) {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        #[cfg(target_os = "macos")]
        {
            // macOS: Cmd+C/X
            let _ = enigo.key(Key::Meta, Direction::Press);
            let _ = enigo.key(Key::Unicode(key), Direction::Click);
            let _ = enigo.key(Key::Meta, Direction::Release);
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Windows/Linux: Ctrl+C/X
            let _ = enigo.key(Key::Control, Direction::Press);
            let _ = enigo.key(Key::Unicode(key), Direction::Click);
            let _ = enigo.key(Key::Control, Direction::Release);
        }
    }
}

/// 模拟粘贴按键 (Ctrl+V / Cmd+V)
fn simulate_paste() {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        #[cfg(target_os = "macos")]
        {
            // macOS: Cmd+V
            let _ = enigo.key(Key::Meta, Direction::Press);
            let _ = enigo.key(Key::Unicode('v'), Direction::Click);
            let _ = enigo.key(Key::Meta, Direction::Release);
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Windows/Linux: Ctrl+V
            let _ = enigo.key(Key::Control, Direction::Press);
            let _ = enigo.key(Key::Unicode('v'), Direction::Click);
            let _ = enigo.key(Key::Control, Direction::Release);
        }
    }
}