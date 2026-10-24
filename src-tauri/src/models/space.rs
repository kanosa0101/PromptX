//! 命名空间模型

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 空间模型（容器级 default：个别字段缺失时回退默认值而非整个文件解析失败）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
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

impl Default for Space {
    fn default() -> Self {
        let now = Utc::now();
        Space {
            id: format!("space_{}", Uuid::new_v4()),
            name: String::new(),
            icon: String::new(),
            color: String::new(),
            order: 0,
            created_at: now,
            updated_at: now,
        }
    }
}
