//! 提示词模型

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 变量类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VarType {
    System,
    Custom,
}

/// 变量模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: VarType,
    pub default_value: Option<String>,
}

/// 提示词模型
#[derive(Debug, Clone, Serialize, Deserialize)]
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
}