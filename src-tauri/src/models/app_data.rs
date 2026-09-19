//! 应用数据模型

use crate::models::{Prompt, Settings, Space};
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// AI 优化历史空间的固定 ID（两端共用约定）
pub const AI_HISTORY_SPACE_ID: &str = "space_ai_history";

/// 应用数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub version: String,
    pub settings: Settings,
    pub spaces: Vec<Space>,
    pub prompts: Vec<Prompt>,
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
