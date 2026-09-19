//! 设置命令

use crate::commands::window;
use crate::models::Settings;
use crate::AppState;
use tauri::State;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_global_shortcut::Modifiers;
use tauri_plugin_global_shortcut::Code;

/// 解析快捷键字符串为 Shortcut 对象
/// 格式: "Alt+Space", "Ctrl+K", "Shift+F1" 等
pub fn parse_hotkey(hotkey: &str) -> Result<Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut code = None;

    for part in hotkey.split('+') {
        let part = part.trim();
        match part.to_lowercase().as_str() {
            "alt" => modifiers |= Modifiers::ALT,
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "cmd" | "meta" | "super" => modifiers |= Modifiers::SUPER,
            _ => {
                // 尝试解析为按键码
                code = Some(parse_key_code(part)?);
            }
        }
    }

    if code.is_none() {
        return Err(format!("快捷键缺少按键: {}", hotkey));
    }

    if modifiers.is_empty() {
        return Err(format!("快捷键至少需要一个修饰键 (Alt/Ctrl/Shift/Cmd): {}", hotkey));
    }

    Ok(Shortcut::new(Some(modifiers), code.unwrap()))
}

/// 解析按键名称为 Code
fn parse_key_code(key: &str) -> Result<Code, String> {
    match key.to_lowercase().as_str() {
        "space" => Ok(Code::Space),
        "a" => Ok(Code::KeyA), "b" => Ok(Code::KeyB), "c" => Ok(Code::KeyC),
        "d" => Ok(Code::KeyD), "e" => Ok(Code::KeyE), "f" => Ok(Code::KeyF),
        "g" => Ok(Code::KeyG), "h" => Ok(Code::KeyH), "i" => Ok(Code::KeyI),
        "j" => Ok(Code::KeyJ), "k" => Ok(Code::KeyK), "l" => Ok(Code::KeyL),
        "m" => Ok(Code::KeyM), "n" => Ok(Code::KeyN), "o" => Ok(Code::KeyO),
        "p" => Ok(Code::KeyP), "q" => Ok(Code::KeyQ), "r" => Ok(Code::KeyR),
        "s" => Ok(Code::KeyS), "t" => Ok(Code::KeyT), "u" => Ok(Code::KeyU),
        "v" => Ok(Code::KeyV), "w" => Ok(Code::KeyW), "x" => Ok(Code::KeyX),
        "y" => Ok(Code::KeyY), "z" => Ok(Code::KeyZ),
        "0" => Ok(Code::Digit0), "1" => Ok(Code::Digit1), "2" => Ok(Code::Digit2),
        "3" => Ok(Code::Digit3), "4" => Ok(Code::Digit4), "5" => Ok(Code::Digit5),
        "6" => Ok(Code::Digit6), "7" => Ok(Code::Digit7), "8" => Ok(Code::Digit8),
        "9" => Ok(Code::Digit9),
        "f1" => Ok(Code::F1), "f2" => Ok(Code::F2), "f3" => Ok(Code::F3),
        "f4" => Ok(Code::F4), "f5" => Ok(Code::F5), "f6" => Ok(Code::F6),
        "f7" => Ok(Code::F7), "f8" => Ok(Code::F8), "f9" => Ok(Code::F9),
        "f10" => Ok(Code::F10), "f11" => Ok(Code::F11), "f12" => Ok(Code::F12),
        "tab" => Ok(Code::Tab),
        "enter" | "return" => Ok(Code::Enter),
        "escape" | "esc" => Ok(Code::Escape),
        "backspace" => Ok(Code::Backspace),
        "delete" => Ok(Code::Delete),
        "insert" => Ok(Code::Insert),
        "home" => Ok(Code::Home),
        "end" => Ok(Code::End),
        "pageup" => Ok(Code::PageUp),
        "pagedown" => Ok(Code::PageDown),
        "arrowup" | "up" => Ok(Code::ArrowUp),
        "arrowdown" | "down" => Ok(Code::ArrowDown),
        "arrowleft" | "left" => Ok(Code::ArrowLeft),
        "arrowright" | "right" => Ok(Code::ArrowRight),
        _ => Err(format!("不支持的按键: {}", key)),
    }
}

/// 获取设置
#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let storage = state.storage.read();
    let data = storage.load().map_err(|e| e.to_string())?;
    Ok(data.settings)
}

/// 更新设置
#[tauri::command]
pub fn update_settings(settings: Settings, app: tauri::AppHandle, state: State<'_, AppState>) -> Result<Settings, String> {
    // 写锁作用域：必须在 apply_shortcuts 之前释放（其内部要拿读锁）
    {
        let storage = state.storage.write();
        let mut data = storage.load().map_err(|e| e.to_string())?;

        data.settings = settings.clone();
        storage.save(data).map_err(|e| e.to_string())?;
    }

    // 应用窗口透明度
    window::apply_opacity(&app, settings.window_opacity);

    // 应用开机自启设置
    if settings.launch_at_login {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }

    // 统一重注册全部全局快捷键（含 AI 优化快捷键）
    crate::apply_shortcuts(&app);

    Ok(settings)
}

/// 注册全局快捷键
#[tauri::command]
pub fn register_hotkey(app: tauri::AppHandle, hotkey: String, state: State<'_, AppState>) -> Result<(), String> {
    let new_shortcut = parse_hotkey(&hotkey)?;

    // 先注销旧快捷键
    let storage = state.storage.read();
    let data = storage.load().map_err(|e| e.to_string())?;
    let old_hotkey = &data.settings.global_hotkey;
    if let Ok(old_shortcut) = parse_hotkey(old_hotkey) {
        let _ = app.global_shortcut().unregister(old_shortcut);
    }
    drop(storage); // 释放读锁

    // 注册新快捷键
    app.global_shortcut().on_shortcut(new_shortcut, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            crate::toggle_window_with_clipboard_capture(app);
        }
    }).map_err(|e| format!("注册快捷键失败: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hotkey_alt_space() {
        let shortcut = parse_hotkey("Alt+Space").unwrap();
        assert_eq!(shortcut.key, Code::Space);
        assert!(shortcut.mods.contains(Modifiers::ALT));
    }

    #[test]
    fn test_parse_hotkey_ctrl_k() {
        let shortcut = parse_hotkey("Ctrl+K").unwrap();
        assert_eq!(shortcut.key, Code::KeyK);
        assert!(shortcut.mods.contains(Modifiers::CONTROL));
    }

    #[test]
    fn test_parse_hotkey_shift_f1() {
        let shortcut = parse_hotkey("Shift+F1").unwrap();
        assert_eq!(shortcut.key, Code::F1);
        assert!(shortcut.mods.contains(Modifiers::SHIFT));
    }

    #[test]
    fn test_parse_hotkey_no_modifier() {
        let result = parse_hotkey("A");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_hotkey_unknown_key() {
        let result = parse_hotkey("Ctrl+UnknownKey");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_hotkey_multiple_modifiers() {
        let shortcut = parse_hotkey("Ctrl+Shift+S").unwrap();
        assert_eq!(shortcut.key, Code::KeyS);
        assert!(shortcut.mods.contains(Modifiers::CONTROL));
        assert!(shortcut.mods.contains(Modifiers::SHIFT));
    }
}