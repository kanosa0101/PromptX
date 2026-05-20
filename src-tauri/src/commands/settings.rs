//! 设置命令

use crate::models::Settings;
use crate::AppState;
use tauri::State;

/// 获取设置
#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let storage = state.storage.read();
    let data = storage.load().map_err(|e| e.to_string())?;
    Ok(data.settings)
}

/// 更新设置
#[tauri::command]
pub fn update_settings(settings: Settings, state: State<'_, AppState>) -> Result<Settings, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    data.settings = settings.clone();
    storage.save(data).map_err(|e| e.to_string())?;

    Ok(settings)
}