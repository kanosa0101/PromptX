//! 存储服务

use crate::models::AppData;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// 缓存条目：数据快照 + 建立缓存时的文件 mtime。
/// Native Messaging host 等其他进程会直接写 data.json，
/// mtime 变化即视为缓存失效需要重新读盘（本进程自己的写会同步更新两者）
struct CacheEntry {
    data: Arc<AppData>,
    mtime: Option<std::time::SystemTime>,
}

/// 存储服务
pub struct StorageService {
    data_dir: PathBuf,
    data_path: PathBuf,
    backup_path: PathBuf,
    temp_path: PathBuf,
    lock_path: PathBuf,
    /// 内存缓存：命中时免去磁盘读取与 JSON 解析。
    /// 所有读写都经过 AppState 上的 RwLock，缓存与磁盘始终一致。
    /// 存 Arc 共享快照：只读热路径（失焦检查、位置恢复）拿引用即可，免整份克隆
    cache: parking_lot::Mutex<Option<CacheEntry>>,
}

impl StorageService {
    /// 创建存储服务
    pub fn new(app: &tauri::App) -> Self {
        let data_dir = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        Self::new_at_dir(data_dir)
    }

    /// 按数据目录构造（Native Messaging host 进程无 tauri App，走这条路径）
    pub fn new_at_dir(data_dir: PathBuf) -> Self {
        // 尽力确保目录存在；创建失败不 panic（NM host 进程 panic 会无声挂断），
        // 后续读写会以 io::Error 形式正常报错
        if !data_dir.exists() {
            let _ = fs::create_dir_all(&data_dir);
        }

        Self {
            data_dir: data_dir.clone(),
            data_path: data_dir.join("data.json"),
            backup_path: data_dir.join("data.json.backup"),
            temp_path: data_dir.join("data.json.tmp"),
            lock_path: data_dir.join("data.json.lock"),
            cache: parking_lot::Mutex::new(None),
        }
    }

    /// 跨进程互斥锁：NM host 与主进程是两个进程，各自的内存锁互相不可见，
    /// 用锁文件把「读取-修改-写入」整体串行化。进程退出时 OS 自动释放
    fn with_file_lock<T>(
        &self,
        f: impl FnOnce() -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        use fs4::fs_std::FileExt;
        let lock_file = fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .write(true)
            .open(&self.lock_path)?;
        lock_file.lock_exclusive().map_err(StorageError::Io)?;
        let result = f();
        let _ = lock_file.unlock();
        result
    }

    /// 应用数据目录（NM 注册清单写入位置等）
    pub fn data_path(&self) -> &std::path::Path {
        &self.data_path
    }

    pub fn data_dir(&self) -> &std::path::Path {
        &self.data_dir
    }

    fn file_mtime(&self) -> Option<std::time::SystemTime> {
        fs::metadata(&self.data_path)
            .and_then(|m| m.modified())
            .ok()
    }

    /// 加载应用数据（优先内存缓存；需要可写副本时使用）
    pub fn load(&self) -> Result<AppData, StorageError> {
        Ok(self.load_arc()?.as_ref().clone())
    }

    /// 加载应用数据（优先内存缓存）：返回共享快照，只读热路径用，
    /// 避免每次热键唤醒/失焦检查都整份克隆全部提示词
    pub fn load_arc(&self) -> Result<Arc<AppData>, StorageError> {
        let mtime = self.file_mtime();
        {
            let cache = self.cache.lock();
            if let Some(entry) = cache.as_ref() {
                // mtime 一致 → 缓存有效；文件不存在（被删）→ 维持缓存（历史语义）
                if entry.mtime == mtime || mtime.is_none() {
                    return Ok(entry.data.clone());
                }
            }
        }

        let data = self.load_from_disk()?;
        let arc = Arc::new(data);
        *self.cache.lock() = Some(CacheEntry {
            data: arc.clone(),
            mtime: self.file_mtime(),
        });
        Ok(arc)
    }

    /// 从磁盘加载（含损坏恢复与默认数据回退）；调用方负责填充缓存。
    /// 全程持跨进程文件锁：恢复路径包含写入，须与 NM host 的写互斥
    fn load_from_disk(&self) -> Result<AppData, StorageError> {
        self.with_file_lock(|| self.load_from_disk_locked())
    }

    fn load_from_disk_locked(&self) -> Result<AppData, StorageError> {
        if !self.data_path.exists() {
            // 创建默认数据。注意用无锁保存：本函数已持文件锁，
            // save() 会再次加锁导致同进程死锁
            let default_data = AppData::default();
            self.save_without_backup(default_data.clone())?;
            return Ok(default_data);
        }

        let content = fs::read_to_string(&self.data_path)?;
        match serde_json::from_str::<AppData>(&content) {
            Ok(data) => Ok(data),
            Err(_) => {
                // 主文件解析失败，尝试从备份恢复
                eprintln!("数据文件解析失败，尝试从备份恢复...");
                if self.backup_path.exists() {
                    let backup_result = fs::read_to_string(&self.backup_path)
                        .map_err(StorageError::Io)
                        .and_then(|c| {
                            serde_json::from_str::<AppData>(&c).map_err(StorageError::Json)
                        });
                    match backup_result {
                        Ok(data) => {
                            // 恢复成功，保存到主文件。不走备份轮转：
                            // 当前主文件是损坏内容，轮转会把它覆盖到刚读出的好备份上
                            if let Err(e) = self.save_without_backup(data.clone()) {
                                eprintln!("备份恢复后保存失败: {}", e);
                            }
                            Ok(data)
                        }
                        Err(e) => {
                            // 备份也损坏：隔离两个文件后回退默认数据，
                            // 而不是让应用永久报错不可用
                            eprintln!("备份也无法读取({}), 隔离损坏文件并使用默认数据", e);
                            self.quarantine_corrupt_files();
                            let default_data = AppData::default();
                            let _ = self.save_without_backup(default_data.clone());
                            Ok(default_data)
                        }
                    }
                } else {
                    // 没有备份，返回默认数据（主文件已损坏，不把坏内容轮转进备份槽）
                    eprintln!("无备份文件，使用默认数据");
                    let default_data = AppData::default();
                    let _ = self.save_without_backup(default_data.clone());
                    Ok(default_data)
                }
            }
        }
    }

    /// 把损坏的主文件/备份改名隔离（保留现场便于人工排查，名字追加 .corrupt 后缀）
    fn quarantine_corrupt_files(&self) {
        let quarantine = |path: &PathBuf| {
            let Some(mut name) = path.file_name().map(|n| n.to_os_string()) else {
                return;
            };
            name.push(".corrupt");
            let _ = fs::rename(path, path.with_file_name(name));
        };
        quarantine(&self.data_path);
        quarantine(&self.backup_path);
    }

    /// 保存应用数据（先轮转备份，再原子写入主文件）。
    /// 全程持跨进程文件锁：备份轮转的读-写与 NM host 的读改写互斥
    pub fn save(&self, data: AppData) -> Result<(), StorageError> {
        self.with_file_lock(|| self.save_locked(data))
    }

    fn save_locked(&self, data: AppData) -> Result<(), StorageError> {
        // 备份旧数据（同样走临时文件+重命名，避免崩溃留下半截备份）
        if self.data_path.exists() {
            let old_content = fs::read_to_string(&self.data_path)?;
            fs::write(&self.temp_path, &old_content)?;
            if let Err(e) = fs::rename(&self.temp_path, &self.backup_path) {
                // 重命名失败（被占用等）退回直接写
                eprintln!("备份重命名失败: {}, 尝试直接写入", e);
                fs::write(&self.backup_path, old_content)?;
            }
        }
        self.write_atomic(data)
    }

    /// 恢复/重建场景专用保存：跳过备份轮转。
    /// 主文件已损坏时若照常轮转，会把坏内容覆盖到唯一完好的备份上；
    /// 一旦本次主文件写入再失败，下次启动将主备皆坏、只能重置默认数据。
    /// 仅在 load_from_disk_locked（已持文件锁）内调用，自身不加锁
    fn save_without_backup(&self, data: AppData) -> Result<(), StorageError> {
        self.write_atomic(data)
    }

    /// 原子写入主文件：临时文件 + fsync + 重命名；成功后更新内存缓存
    fn write_atomic(&self, data: AppData) -> Result<(), StorageError> {
        // 序列化数据
        let content = serde_json::to_string(&data)?;

        // 1. 写入临时文件
        {
            let mut file = fs::File::create(&self.temp_path)?;
            file.write_all(content.as_bytes())?;
            file.sync_all()?; // 确保数据刷入磁盘
        }

        // 2. 重命名临时文件到目标文件（原子操作）
        // Windows 下如果目标文件存在，rename 会覆盖
        match fs::rename(&self.temp_path, &self.data_path) {
            Ok(()) => {
                *self.cache.lock() = Some(CacheEntry {
                    data: Arc::new(data),
                    mtime: self.file_mtime(),
                });
                Ok(())
            }
            Err(e) => {
                // 重命名失败（可能被其他进程占用），尝试直接写入
                eprintln!("原子重命名失败: {}, 尝试直接写入", e);
                let mut file = fs::File::create(&self.data_path)?;
                file.write_all(content.as_bytes())?;
                file.sync_all()?; // 与主路径一致：确保数据落盘
                let _ = fs::remove_file(&self.temp_path); // 清理临时文件
                *self.cache.lock() = Some(CacheEntry {
                    data: Arc::new(data),
                    mtime: self.file_mtime(),
                });
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write as IoWrite;

    fn make_service(dir: &std::path::Path) -> StorageService {
        StorageService::new_at_dir(dir.to_path_buf())
    }

    #[test]
    fn test_quarantine_when_both_files_corrupt() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("data.json"), "{bad").unwrap();
        std::fs::write(dir.path().join("data.json.backup"), "{bad2").unwrap();
        let svc = make_service(dir.path());

        // 主文件与备份都损坏：隔离后回退默认数据，而不是永久报错
        let data = svc.load().unwrap();
        assert_eq!(data.version, "1.0.0");
        assert!(dir.path().join("data.json.corrupt").exists());
        assert!(dir.path().join("data.json.backup.corrupt").exists());
        assert!(dir.path().join("data.json").exists()); // 已用默认数据重建
    }

    #[test]
    fn test_recovery_preserves_good_backup() {
        let dir = tempfile::tempdir().unwrap();
        let data_path = dir.path().join("data.json");
        let backup_path = dir.path().join("data.json.backup");

        // 备份是完好的旧数据，主文件损坏
        let good = serde_json::to_string(&AppData::default()).unwrap();
        std::fs::write(&backup_path, &good).unwrap();
        std::fs::write(&data_path, "{corrupt").unwrap();

        let svc = make_service(dir.path());
        let data = svc.load().unwrap();
        assert_eq!(data.version, "1.0.0"); // 从备份恢复

        // 恢复保存不得把损坏的主文件内容轮转覆盖到好备份上
        let backup_content = std::fs::read_to_string(&backup_path).unwrap();
        assert_ne!(backup_content, "{corrupt");
        let backup_data: AppData = serde_json::from_str(&backup_content).unwrap();
        assert_eq!(backup_data.version, "1.0.0");

        // 主文件已用恢复出的数据重建
        let main_data: AppData =
            serde_json::from_str(&fs::read_to_string(&data_path).unwrap()).unwrap();
        assert_eq!(main_data.version, "1.0.0");
    }

    #[test]
    fn test_cache_hits_after_save() {
        let dir = tempfile::tempdir().unwrap();
        let svc = make_service(dir.path());

        let mut data = svc.load().unwrap(); // 首次加载建立默认文件
        data.version = "9.9.9".to_string();
        svc.save(data).unwrap();
        std::fs::remove_file(dir.path().join("data.json")).unwrap();

        // 磁盘文件已删除仍能从缓存读到刚保存的数据
        assert_eq!(svc.load().unwrap().version, "9.9.9");
    }

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

        let loaded: AppData =
            serde_json::from_str(&fs::read_to_string(&data_path).unwrap()).unwrap();
        assert_eq!(loaded.version, data.version);
        assert_eq!(loaded.settings.global_hotkey, data.settings.global_hotkey);
    }

    /// 其他进程直接改写 data.json（Native Messaging host 场景）：
    /// mtime 变化必须使缓存失效，读到最新磁盘内容
    #[test]
    fn test_external_write_invalidates_cache() {
        let dir = tempfile::tempdir().unwrap();
        let svc = make_service(dir.path());
        let _ = svc.load().unwrap(); // 建立缓存与默认文件

        let data = AppData {
            version: "7.7.7".to_string(),
            ..Default::default()
        };
        std::fs::write(
            dir.path().join("data.json"),
            serde_json::to_string(&data).unwrap(),
        )
        .unwrap();
        // 显式改 mtime，规避与缓存建立时刻同粒度的问题
        let f = std::fs::File::options()
            .write(true)
            .open(dir.path().join("data.json"))
            .unwrap();
        f.set_modified(std::time::SystemTime::now() + std::time::Duration::from_secs(3600))
            .unwrap();
        drop(f);

        assert_eq!(svc.load().unwrap().version, "7.7.7");
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

        let data2 = AppData {
            version: "2.0.0".to_string(),
            ..AppData::default()
        };
        let content2 = serde_json::to_string(&data2).unwrap();
        {
            let mut file = fs::File::create(&temp_path).unwrap();
            file.write_all(content2.as_bytes()).unwrap();
            file.sync_all().unwrap();
        }
        fs::rename(&temp_path, &data_path).unwrap();

        // Verify backup contains old data
        let backup_data: AppData =
            serde_json::from_str(&fs::read_to_string(&backup_path).unwrap()).unwrap();
        assert_eq!(backup_data.version, "1.0.0");

        // Verify main file contains new data
        let main_data: AppData =
            serde_json::from_str(&fs::read_to_string(&data_path).unwrap()).unwrap();
        assert_eq!(main_data.version, "2.0.0");
    }
}
