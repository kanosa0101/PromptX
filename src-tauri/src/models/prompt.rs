//! 提示词模型

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 变量类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum VarType {
    #[default]
    System,
    Custom,
}

/// 变量模型
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Variable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: VarType,
    pub default_value: Option<String>,
}

/// 提示词模型（容器级 default：个别字段缺失时回退默认值而非整个文件解析失败）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    #[serde(rename = "spaceId")]
    pub space_id: String,
    pub variables: Vec<Variable>,
    #[serde(rename = "usageCount")]
    pub usage_count: u32,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    /// 收藏（置顶展示）；旧数据缺字段时回退 false
    #[serde(rename = "favorite")]
    pub favorite: bool,
}

impl Default for Prompt {
    fn default() -> Self {
        let now = Utc::now();
        Prompt {
            id: Uuid::new_v4().to_string(),
            title: String::new(),
            content: String::new(),
            tags: Vec::new(),
            space_id: "space_default".to_string(),
            variables: Vec::new(),
            usage_count: 0,
            last_used_at: None,
            created_at: now,
            updated_at: now,
            favorite: false,
        }
    }
}

/// 创建提示词输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptInput {
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    #[serde(rename = "spaceId")]
    pub space_id: String,
}

/// 更新提示词输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptUpdate {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "spaceId")]
    pub space_id: Option<String>,
    #[serde(rename = "favorite")]
    pub favorite: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 旧版 data.json 无 favorite 字段 → 回退 false（收藏功能向后兼容）
    #[test]
    fn test_prompt_missing_favorite_defaults_false() {
        let json = r#"{
            "id": "p1", "title": "t", "content": "c", "tags": [],
            "spaceId": "s", "variables": [], "usageCount": 0, "lastUsedAt": null,
            "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z"
        }"#;
        let prompt: Prompt = serde_json::from_str(json).unwrap();
        assert!(!prompt.favorite);
    }

    /// favorite 正常序列化/反序列化往返
    #[test]
    fn test_prompt_favorite_roundtrip() {
        let prompt = Prompt {
            favorite: true,
            ..Default::default()
        };
        let json = serde_json::to_string(&prompt).unwrap();
        assert!(json.contains("\"favorite\":true"));
        let back: Prompt = serde_json::from_str(&json).unwrap();
        assert!(back.favorite);
    }
}
