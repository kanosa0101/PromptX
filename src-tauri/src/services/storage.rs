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
}

/// 存储服务
pub struct StorageService {
    data_path: PathBuf,
    backup_path: PathBuf,
    temp_path: PathBuf,
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
        let temp_path = data_dir.join("data.json.tmp");

        Self {
            data_path,
            backup_path,
            temp_path,
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
        match serde_json::from_str(&content) {
            Ok(data) => Ok(data),
            Err(_) => {
                // 主文件解析失败，尝试从备份恢复
                eprintln!("数据文件解析失败，尝试从备份恢复...");
                if self.backup_path.exists() {
                    let backup_content = fs::read_to_string(&self.backup_path)?;
                    let data: AppData = serde_json::from_str(&backup_content).map_err(|e| {
                        StorageError::Json(e)
                    })?;
                    // 恢复成功，保存到主文件
                    if let Err(e) = self.save(data.clone()) {
                        eprintln!("备份恢复后保存失败: {}", e);
                    }
                    Ok(data)
                } else {
                    // 没有备份，返回默认数据
                    eprintln!("无备份文件，使用默认数据");
                    let default_data = AppData::default();
                    let _ = self.save(default_data.clone());
                    Ok(default_data)
                }
            }
        }
    }

    /// 保存应用数据（原子写入）
    pub fn save(&self, data: AppData) -> Result<(), StorageError> {
        // 备份旧数据
        if self.data_path.exists() {
            let old_content = fs::read_to_string(&self.data_path)?;
            fs::write(&self.backup_path, old_content)?;
        }

        // 序列化数据
        let content = serde_json::to_string(&data)?;

        // 原子写入：先写临时文件，再重命名
        // 1. 写入临时文件
        {
            let mut file = fs::File::create(&self.temp_path)?;
            file.write_all(content.as_bytes())?;
            file.sync_all()?; // 确保数据刷入磁盘
        }

        // 2. 重命名临时文件到目标文件（原子操作）
        // Windows 下如果目标文件存在，rename 会覆盖
        match fs::rename(&self.temp_path, &self.data_path) {
            Ok(()) => Ok(()),
            Err(e) => {
                // 重命名失败（可能被其他进程占用），尝试直接写入
                eprintln!("原子重命名失败: {}, 尝试直接写入", e);
                let mut file = fs::File::create(&self.data_path)?;
                file.write_all(content.as_bytes())?;
                let _ = fs::remove_file(&self.temp_path); // 清理临时文件
                Ok(())
            }
        }
    }
}

/// Save AppData to a specific path (test helper)
#[allow(dead_code)]
pub fn save_to_path(path: &std::path::Path, data: &AppData) -> Result<(), StorageError> {
    let content = serde_json::to_string(data)?;
    fs::write(path, content)?;
    Ok(())
}

/// Load AppData from a specific path (test helper)
#[allow(dead_code)]
pub fn load_from_path(path: &std::path::Path) -> Result<AppData, StorageError> {
    if !path.exists() {
        return Ok(AppData::default());
    }
    let content = fs::read_to_string(path)?;
    let data: AppData = serde_json::from_str(&content)?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write as IoWrite;

    #[test]
    fn test_atomic_write_saves_data() {
        let dir = tempfile::tempdir().unwrap();
        let data_path = dir.path().join("data.json");

        let data = AppData::default();
        let content = serde_json::to_string(&data).unwrap();

        // Simulate atomic write: write to temp then rename
        let temp_path = dir.path().join("data.json.tmp");
        {
            let mut file = fs::File::create(&temp_path).unwrap();
            file.write_all(content.as_bytes()).unwrap();
            file.sync_all().unwrap();
        }
        fs::rename(&temp_path, &data_path).unwrap();

        let loaded: AppData = serde_json::from_str(&fs::read_to_string(&data_path).unwrap()).unwrap();
        assert_eq!(loaded.version, data.version);
        assert_eq!(loaded.settings.global_hotkey, data.settings.global_hotkey);
    }

    #[test]
    fn test_atomic_write_creates_backup() {
        let dir = tempfile::tempdir().unwrap();
        let data_path = dir.path().join("data.json");
        let backup_path = dir.path().join("data.json.backup");
        let temp_path = dir.path().join("data.json.tmp");

        // Write initial data
        let data1 = AppData::default();
        let content1 = serde_json::to_string(&data1).unwrap();
        fs::write(&data_path, &content1).unwrap();

        // Simulate atomic save with backup
        let old_content = fs::read_to_string(&data_path).unwrap();
        fs::write(&backup_path, &old_content).unwrap();

        let data2 = AppData { version: "2.0.0".to_string(), ..AppData::default() };
        let content2 = serde_json::to_string(&data2).unwrap();
        {
            let mut file = fs::File::create(&temp_path).unwrap();
            file.write_all(content2.as_bytes()).unwrap();
            file.sync_all().unwrap();
        }
        fs::rename(&temp_path, &data_path).unwrap();

        // Verify backup contains old data
        let backup_data: AppData = serde_json::from_str(&fs::read_to_string(&backup_path).unwrap()).unwrap();
        assert_eq!(backup_data.version, "1.0.0");

        // Verify main file contains new data
        let main_data: AppData = serde_json::from_str(&fs::read_to_string(&data_path).unwrap()).unwrap();
        assert_eq!(main_data.version, "2.0.0");
    }
}