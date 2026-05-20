//! 命名空间模型

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 空间模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Space {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub order: u32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}