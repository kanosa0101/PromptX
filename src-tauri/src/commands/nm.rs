//! 浏览器扩展数据同步（Native Messaging）设置命令

use crate::AppState;
use serde::Serialize;
use tauri::State;

/// NM 同步状态（设置面板展示）
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NmStatus {
    pub enabled: bool,
    pub extension_id: String,
    /// 注册表实际登记状态（与设置可能不同步：被安全软件清理等）
    pub registered: bool,
}

fn read_status(storage: &crate::services::storage::StorageService) -> NmStatus {
    let settings = storage
        .load_arc()
        .map(|d| d.settings.clone())
        .unwrap_or_default();
    let registered = crate::nm_registry::registered_extension_id(storage.data_dir()).is_some();
    NmStatus {
        enabled: settings.nm_enabled,
        extension_id: settings.extension_id,
        registered,
    }
}

/// 规整用户输入的扩展 ID：剥掉 chrome-extension:// 前缀与斜杠
fn normalize_extension_id(raw: &str) -> String {
    raw.trim()
        .trim_start_matches("chrome-extension://")
        .trim_end_matches('/')
        .to_string()
}

#[tauri::command]
pub async fn get_nm_status(state: State<'_, AppState>) -> Result<NmStatus, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || read_status(&storage.read()))
        .await
        .map_err(|e| e.to_string())
}

/// 启用/停用扩展同步。
/// 启用：写 NM 清单 + HKCU 注册表（Chrome/Edge），并保存设置；
/// 停用：删除登记。注册表与磁盘写入在阻塞线程池执行
#[tauri::command]
pub async fn set_nm_sync(
    enabled: bool,
    extension_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<NmStatus, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();

        if enabled {
            let id = normalize_extension_id(extension_id.as_deref().unwrap_or(""));
            if id.len() != 32 || !id.chars().all(|c| c.is_ascii_lowercase()) {
                return Err(
                    "扩展 ID 应为 32 位小写字母（在扩展的「同步」设置区可复制）".to_string()
                );
            }
            let exe = std::env::current_exe().map_err(|e| format!("无法定位程序路径: {e}"))?;
            crate::nm_registry::apply_registration(
                &exe.to_string_lossy(),
                &id,
                storage.data_dir(),
            )?;

            let mut data = storage.load().map_err(|e| e.to_string())?;
            data.settings.nm_enabled = true;
            data.settings.extension_id = id;
            storage.save(data).map_err(|e| e.to_string())?;
        } else {
            crate::nm_registry::remove_registration(storage.data_dir())?;
            let mut data = storage.load().map_err(|e| e.to_string())?;
            data.settings.nm_enabled = false;
            storage.save(data).map_err(|e| e.to_string())?;
        }

        Ok(read_status(&storage))
    })
    .await
    .map_err(|e| e.to_string())?
}
