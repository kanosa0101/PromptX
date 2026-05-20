//! 设置模型

use serde::{Deserialize, Serialize};

/// 窗口位置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

/// 窗口尺寸
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Size {
    pub width: u32,
    pub height: u32,
}

/// 设置模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(rename = "globalHotkey")]
    pub global_hotkey: String,
    pub theme: String,
    pub language: String,
    #[serde(rename = "windowOpacity")]
    pub window_opacity: f32,
    #[serde(rename = "windowPosition")]
    pub window_position: Option<Position>,
    #[serde(rename = "windowSize")]
    pub window_size: Size,
    #[serde(rename = "searchDebounce")]
    pub search_debounce: u32,
    #[serde(rename = "maxResults")]
    pub max_results: u32,
    #[serde(rename = "autoHide")]
    pub auto_hide: bool,
    #[serde(rename = "showInDock")]
    pub show_in_dock: bool,
    #[serde(rename = "launchAtLogin")]
    pub launch_at_login: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            global_hotkey: "Alt+Space".to_string(),
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            window_opacity: 0.95,
            window_position: None,
            window_size: Size { width: 600, height: 400 },
            search_debounce: 300,
            max_results: 6,
            auto_hide: true,
            show_in_dock: false,
            launch_at_login: false,
        }
    }
}