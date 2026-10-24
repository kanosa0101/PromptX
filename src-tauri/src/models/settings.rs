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

/// 默认 AI Base URL (OpenAI 兼容协议)
pub const DEFAULT_AI_BASE_URL: &str = "https://api.deepseek.com";

/// 默认 AI 模型
pub const DEFAULT_AI_MODEL: &str = "deepseek-flash";

// 优化指令模板的默认正文不再由 Rust 持有（历史上曾在此维护一份 52 行的副本，
// 与 shared/types.ts 中的版本需要手工同步）。Rust 仅持久化用户自定义值：
// 空串 = 使用内置默认模板，前端 shared/ai.ts 在 optimizeText 时回退到
// shared/types.ts 的 DEFAULT_OPTIMIZE_TEMPLATE（唯一数据源）。

fn default_ai_base_url() -> String {
    DEFAULT_AI_BASE_URL.to_string()
}

fn default_ai_model() -> String {
    DEFAULT_AI_MODEL.to_string()
}

fn default_optimize_template() -> String {
    // 空串 = 使用前端内置默认模板（shared/types.ts 的 DEFAULT_OPTIMIZE_TEMPLATE）
    String::new()
}

fn default_optimize_hotkey() -> String {
    "Ctrl+Alt+O".to_string()
}

fn default_clipboard_optimize_hotkey() -> String {
    "Ctrl+Shift+B".to_string()
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
    #[serde(rename = "launchAtLogin")]
    pub launch_at_login: bool,
    /// AI 服务地址（OpenAI 兼容 Chat Completions）
    #[serde(rename = "aiBaseUrl", default = "default_ai_base_url")]
    pub ai_base_url: String,
    /// AI API Key
    #[serde(rename = "aiApiKey", default)]
    pub ai_api_key: String,
    /// AI 模型名
    #[serde(rename = "aiModel", default = "default_ai_model")]
    pub ai_model: String,
    /// 优化指令模板（system prompt）
    #[serde(rename = "optimizeTemplate", default = "default_optimize_template")]
    pub optimize_template: String,
    /// 触发 AI 优化的全局快捷键
    #[serde(rename = "optimizeHotkey", default = "default_optimize_hotkey")]
    pub optimize_hotkey: String,
    /// 推理模式（深度思考）：开启更慢但质量更高，默认关闭
    #[serde(rename = "optimizeThinking", default)]
    pub optimize_thinking: bool,
    /// 剪贴板优化快捷键：优化剪贴板内容并写回剪贴板（不模拟按键）
    #[serde(
        rename = "clipboardOptimizeHotkey",
        default = "default_clipboard_optimize_hotkey"
    )]
    pub clipboard_optimize_hotkey: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            global_hotkey: "Alt+Space".to_string(),
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            window_opacity: 0.95,
            window_position: None,
            window_size: Size {
                width: 600,
                height: 400,
            },
            search_debounce: 300,
            max_results: 6,
            auto_hide: true,
            launch_at_login: false,
            ai_base_url: DEFAULT_AI_BASE_URL.to_string(),
            ai_api_key: String::new(),
            ai_model: DEFAULT_AI_MODEL.to_string(),
            optimize_template: String::new(),
            optimize_hotkey: "Ctrl+Alt+O".to_string(),
            optimize_thinking: false,
            clipboard_optimize_hotkey: "Ctrl+Shift+B".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = Settings::default();
        assert_eq!(settings.global_hotkey, "Alt+Space");
        assert_eq!(settings.theme, "system");
        assert_eq!(settings.language, "zh-CN");
        assert!((settings.window_opacity - 0.95).abs() < f32::EPSILON);
        assert!(settings.window_position.is_none());
        assert_eq!(settings.window_size.width, 600);
        assert_eq!(settings.window_size.height, 400);
        assert_eq!(settings.search_debounce, 300);
        assert_eq!(settings.max_results, 6);
        assert!(settings.auto_hide);
        assert!(!settings.launch_at_login);
    }

    #[test]
    fn test_settings_serde_roundtrip() {
        let settings = Settings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.global_hotkey, settings.global_hotkey);
        assert_eq!(deserialized.theme, settings.theme);
        assert_eq!(deserialized.language, settings.language);
        assert!((deserialized.window_opacity - settings.window_opacity).abs() < f32::EPSILON);
        assert!(
            deserialized.window_position.is_none(),
            "window_position should still be None"
        );
        assert_eq!(deserialized.window_size.width, settings.window_size.width);
        assert_eq!(deserialized.window_size.height, settings.window_size.height);
        assert_eq!(deserialized.search_debounce, settings.search_debounce);
        assert_eq!(deserialized.max_results, settings.max_results);
        assert_eq!(deserialized.auto_hide, settings.auto_hide);
        assert_eq!(deserialized.launch_at_login, settings.launch_at_login);
    }

    #[test]
    fn test_settings_camel_case() {
        let settings = Settings::default();
        let json = serde_json::to_string(&settings).unwrap();
        assert!(
            json.contains("\"globalHotkey\""),
            "global_hotkey should serialize as globalHotkey"
        );
    }

    #[test]
    fn test_settings_ai_fields_serde() {
        let settings = Settings::default();
        assert_eq!(settings.ai_base_url, "https://api.deepseek.com");
        assert_eq!(settings.ai_model, DEFAULT_AI_MODEL);
        assert!(settings.ai_api_key.is_empty());
        assert_eq!(settings.optimize_hotkey, "Ctrl+Alt+O");
        assert!(!settings.optimize_thinking, "推理模式默认关闭");
        assert_eq!(settings.clipboard_optimize_hotkey, "Ctrl+Shift+B");
        // 默认模板为空串：实际模板正文由前端 shared/types.ts 单一来源提供
        assert!(settings.optimize_template.is_empty());
    }

    /// 旧版本 data.json（无 AI 字段）反序列化时应使用默认值
    #[test]
    fn test_settings_backward_compatible_deserialization() {
        let legacy_json = r#"{
            "globalHotkey": "Alt+Space",
            "theme": "system",
            "language": "zh-CN",
            "windowOpacity": 0.95,
            "windowPosition": null,
            "windowSize": { "width": 600, "height": 400 },
            "searchDebounce": 300,
            "maxResults": 6,
            "autoHide": true,
            "launchAtLogin": false
        }"#;
        let settings: Settings = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(settings.ai_base_url, DEFAULT_AI_BASE_URL);
        assert_eq!(settings.ai_model, DEFAULT_AI_MODEL);
        assert!(settings.ai_api_key.is_empty());
        assert_eq!(settings.optimize_hotkey, "Ctrl+Alt+O");
        assert!(settings.optimize_template.is_empty());
    }
}
