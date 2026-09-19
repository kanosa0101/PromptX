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

/// 默认优化指令模板
pub const DEFAULT_OPTIMIZE_TEMPLATE: &str = "你是提示词优化专家。将用户发来的内容改写为一条结构清晰、表达准确、上下文完整的提示词，保留原意，不新增无关要求。只输出优化后的提示词本身，不要任何解释、前言或 Markdown 代码块包裹。";

fn default_ai_base_url() -> String {
    DEFAULT_AI_BASE_URL.to_string()
}

fn default_ai_model() -> String {
    DEFAULT_AI_MODEL.to_string()
}

fn default_optimize_template() -> String {
    DEFAULT_OPTIMIZE_TEMPLATE.to_string()
}

fn default_optimize_hotkey() -> String {
    "Ctrl+Alt+O".to_string()
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
            launch_at_login: false,
            ai_base_url: DEFAULT_AI_BASE_URL.to_string(),
            ai_api_key: String::new(),
            ai_model: DEFAULT_AI_MODEL.to_string(),
            optimize_template: DEFAULT_OPTIMIZE_TEMPLATE.to_string(),
            optimize_hotkey: "Ctrl+Alt+O".to_string(),
            optimize_thinking: false,
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
        assert!(deserialized.window_position.is_none(), "window_position should still be None");
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
        assert!(json.contains("\"globalHotkey\""), "global_hotkey should serialize as globalHotkey");
    }

    #[test]
    fn test_settings_ai_fields_serde() {
        let settings = Settings::default();
        assert_eq!(settings.ai_base_url, "https://api.deepseek.com");
        assert_eq!(settings.ai_model, DEFAULT_AI_MODEL);
        assert!(settings.ai_api_key.is_empty());
        assert_eq!(settings.optimize_hotkey, "Ctrl+Alt+O");
        assert!(!settings.optimize_thinking, "推理模式默认关闭");
        assert!(settings.optimize_template.contains("提示词优化专家"));
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
        assert_eq!(settings.optimize_template, DEFAULT_OPTIMIZE_TEMPLATE);
    }
}