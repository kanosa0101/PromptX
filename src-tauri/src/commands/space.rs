//! 空间管理命令

use crate::models::Space;
use crate::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

/// 创建空间
#[tauri::command]
pub fn create_space(
    name: String,
    icon: String,
    color: String,
    state: State<'_, AppState>,
) -> Result<Space, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let now = Utc::now();
    let new_space = Space {
        id: Uuid::new_v4().to_string(),
        name,
        icon,
        color,
        order: data.spaces.len() as u32,
        created_at: now,
        updated_at: now,
    };

    data.spaces.push(new_space.clone());
    storage.save(data).map_err(|e| e.to_string())?;

    Ok(new_space)
}

/// 更新空间
#[tauri::command]
pub fn update_space(
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<Space, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let index = data.spaces.iter().position(|s| s.id == id);
    if let Some(i) = index {
        let space = &mut data.spaces[i];
        let now = Utc::now();

        if let Some(n) = name {
            space.name = n;
        }
        if let Some(ic) = icon {
            space.icon = ic;
        }
        if let Some(c) = color {
            space.color = c;
        }
        space.updated_at = now;

        let updated = space.clone();
        storage.save(data).map_err(|e| e.to_string())?;
        Ok(updated)
    } else {
        Err("Space not found".to_string())
    }
}

/// 删除空间
#[tauri::command]
pub fn delete_space(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    // 不能删除默认空间
    if id == "space_default" {
        return Err("Cannot delete default space".to_string());
    }

    // 删除空间及其下的提示词
    data.spaces.retain(|s| s.id != id);
    data.prompts.retain(|p| p.space_id != id);

    storage.save(data).map_err(|e| e.to_string())?;
    Ok(())
}