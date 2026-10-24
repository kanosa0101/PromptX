//! 应用数据模型

use crate::models::{Prompt, Settings, Space};
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// AI 优化历史空间的固定 ID（两端共用约定）
pub const AI_HISTORY_SPACE_ID: &str = "space_ai_history";

/// 应用数据结构（字段级 default：半截文件不整体报废，逐字段回退；
/// prompts 缺失回退空列表，不注入示例数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default = "default_spaces")]
    pub spaces: Vec<Space>,
    #[serde(default)]
    pub prompts: Vec<Prompt>,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

fn default_spaces() -> Vec<Space> {
    // 空间缺失回退默认三空间：空列表会让 Tab 空间切换（取模）崩溃
    AppData::default().spaces
}

impl Default for AppData {
    fn default() -> Self {
        let now = Utc::now();

        AppData {
            version: "1.0.0".to_string(),
            settings: Settings::default(),
            spaces: vec![
                Space {
                    id: "space_default".to_string(),
                    name: "默认".to_string(),
                    icon: "📁".to_string(),
                    color: "#3B82F6".to_string(),
                    order: 0,
                    created_at: now,
                    updated_at: now,
                },
                Space {
                    id: "space_work".to_string(),
                    name: "工作".to_string(),
                    icon: "💼".to_string(),
                    color: "#10B981".to_string(),
                    order: 1,
                    created_at: now,
                    updated_at: now,
                },
                Space {
                    id: "space_personal".to_string(),
                    name: "个人".to_string(),
                    icon: "🏠".to_string(),
                    color: "#F59E0B".to_string(),
                    order: 2,
                    created_at: now,
                    updated_at: now,
                },
            ],
            prompts: vec![
                Prompt {
                    id: "prompt_001".to_string(),
                    title: "代码解释".to_string(),
                    content: "请解释以下代码的功能：\n\n{{clipboard}}".to_string(),
                    tags: vec!["开发".to_string(), "代码".to_string()],
                    space_id: "space_work".to_string(),
                    variables: vec![crate::models::Variable {
                        name: "clipboard".to_string(),
                        var_type: crate::models::VarType::System,
                        default_value: None,
                    }],
                    usage_count: 0,
                    last_used_at: None,
                    created_at: now,
                    updated_at: now,
                },
                Prompt {
                    id: "prompt_002".to_string(),
                    title: "文档润色".to_string(),
                    content: "请润色以下文档：\n\n{{clipboard}}".to_string(),
                    tags: vec!["写作".to_string()],
                    space_id: "space_work".to_string(),
                    variables: vec![crate::models::Variable {
                        name: "clipboard".to_string(),
                        var_type: crate::models::VarType::System,
                        default_value: None,
                    }],
                    usage_count: 0,
                    last_used_at: None,
                    created_at: now,
                    updated_at: now,
                },
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 半截 data.json（仅 settings）也能解析：version/prompts/spaces 逐字段回退
    #[test]
    fn test_partial_app_data_deserialization() {
        let json = r#"{"settings": {"maxResults": 12}}"#;
        let data: AppData = serde_json::from_str(json).unwrap();
        assert_eq!(data.version, "1.0.0");
        assert_eq!(data.settings.max_results, 12);
        assert!(data.prompts.is_empty());
        assert_eq!(data.spaces.len(), 3); // 空间回退默认三空间
    }
}
