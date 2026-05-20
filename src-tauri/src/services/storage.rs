//! 存储服务

use crate::models::AppData;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Path error: {0}")]
    Path(String),
}

/// 存储服务
pub struct StorageService {
    data_path: PathBuf,
    backup_path: PathBuf,
}

impl StorageService {
    /// 创建存储服务
    pub fn new(app: &tauri::App) -> Self {
        let data_dir = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        // 确保目录存在
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).expect("Failed to create data directory");
        }

        let data_path = data_dir.join("data.json");
        let backup_path = data_dir.join("data.json.backup");

        Self {
            data_path,
            backup_path,
        }
    }

    /// 加载应用数据
    pub fn load(&self) -> Result<AppData, StorageError> {
        if !self.data_path.exists() {
            // 创建默认数据
            let default_data = AppData::default();
            self.save(default_data.clone())?;
            return Ok(default_data);
        }

        let content = fs::read_to_string(&self.data_path)?;
        let data: AppData = serde_json::from_str(&content)?;
        Ok(data)
    }

    /// 保存应用数据
    pub fn save(&self, data: AppData) -> Result<(), StorageError> {
        // 备份旧数据
        if self.data_path.exists() {
            let old_content = fs::read_to_string(&self.data_path)?;
            fs::write(&self.backup_path, old_content)?;
        }

        // 序列化数据
        let content = serde_json::to_string_pretty(&data)?;

        // 写入文件
        let mut file = fs::File::create(&self.data_path)?;
        file.write_all(content.as_bytes())?;

        Ok(())
    }
}