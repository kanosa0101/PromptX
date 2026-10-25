//! 空间管理命令

use crate::models::Space;
use crate::services::storage::StorageService;
use crate::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

/// 创建空间核心（Tauri 命令与 NM host 共用）
pub fn create_space_core(
    storage: &StorageService,
    name: &str,
    icon: &str,
    color: &str,
) -> Result<Space, String> {
    let mut data = storage.load().map_err(|e| e.to_string())?;
    let now = Utc::now();
    let new_space = Space {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        icon: icon.to_string(),
        color: color.to_string(),
        order: data.spaces.len() as u32,
        created_at: now,
        updated_at: now,
    };

    data.spaces.push(new_space.clone());
    storage.save(data).map_err(|e| e.to_string())?;
    Ok(new_space)
}

/// 创建空间
#[tauri::command]
pub async fn create_space(
    name: String,
    icon: String,
    color: String,
    state: State<'_, AppState>,
) -> Result<Space, String> {
    // 写入含双 fsync，放阻塞线程池执行，避免占用 tokio async worker
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        create_space_core(&storage, &name, &icon, &color)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 更新空间核心（Tauri 命令与 NM host 共用）
pub fn update_space_core(
    storage: &StorageService,
    id: &str,
    name: Option<&str>,
    icon: Option<&str>,
    color: Option<&str>,
) -> Result<Space, String> {
    let mut data = storage.load().map_err(|e| e.to_string())?;
    let index = data.spaces.iter().position(|s| s.id == id);
    if let Some(i) = index {
        let space = &mut data.spaces[i];
        let now = Utc::now();

        if let Some(n) = name {
            space.name = n.to_string();
        }
        if let Some(ic) = icon {
            space.icon = ic.to_string();
        }
        if let Some(c) = color {
            space.color = c.to_string();
        }
        space.updated_at = now;

        let updated = space.clone();
        storage.save(data).map_err(|e| e.to_string())?;
        Ok(updated)
    } else {
        Err("Space not found".to_string())
    }
}

/// 更新空间
#[tauri::command]
pub async fn update_space(
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<Space, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        update_space_core(
            &storage,
            &id,
            name.as_deref(),
            icon.as_deref(),
            color.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 删除空间核心（Tauri 命令与 NM host 共用）
pub fn delete_space_core(storage: &StorageService, id: &str) -> Result<u32, String> {
    let mut data = storage.load().map_err(|e| e.to_string())?;

    // 不能删除默认空间
    if id == "space_default" {
        return Err("Cannot delete default space".to_string());
    }

    // 将该空间下的提示词移至默认空间（而非级联删除）
    let moved_count = data.prompts.iter().filter(|p| p.space_id == id).count() as u32;
    for p in data.prompts.iter_mut() {
        if p.space_id == id {
            p.space_id = "space_default".to_string();
        }
    }

    // 删除空间
    data.spaces.retain(|s| s.id != id);

    storage.save(data).map_err(|e| e.to_string())?;
    Ok(moved_count)
}

/// 删除空间
#[tauri::command]
pub async fn delete_space(id: String, state: State<'_, AppState>) -> Result<u32, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        delete_space_core(&storage, &id)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 应用空间排序：校验 ID 集合与现有空间完全一致后重写 order 字段并按其排序。
/// 独立函数便于单元测试（命令体需要 Tauri State，无法直接测）
pub fn apply_space_order(spaces: &mut [Space], ordered_ids: &[String]) -> Result<(), String> {
    if spaces.len() != ordered_ids.len() {
        return Err("排序列表与空间数量不一致".to_string());
    }
    let mut order_map: std::collections::HashMap<&str, usize> =
        std::collections::HashMap::with_capacity(ordered_ids.len());
    for (i, id) in ordered_ids.iter().enumerate() {
        if order_map.insert(id.as_str(), i).is_some() {
            return Err(format!("排序列表存在重复 ID: {id}"));
        }
    }
    if !spaces.iter().all(|s| order_map.contains_key(s.id.as_str())) {
        return Err("排序列表包含未知空间".to_string());
    }

    let now = Utc::now();
    for space in spaces.iter_mut() {
        if let Some(&i) = order_map.get(space.id.as_str()) {
            space.order = i as u32;
            space.updated_at = now;
        }
    }
    spaces.sort_by_key(|s| s.order);
    Ok(())
}

/// 空间排序核心（Tauri 命令与 NM host 共用）
pub fn reorder_spaces_core(
    storage: &StorageService,
    space_ids: &[String],
) -> Result<Vec<Space>, String> {
    let mut data = storage.load().map_err(|e| e.to_string())?;
    apply_space_order(&mut data.spaces, space_ids)?;
    let spaces = data.spaces.clone();
    storage.save(data).map_err(|e| e.to_string())?;
    Ok(spaces)
}

/// 空间排序（拖拽后持久化）：按给定 ID 顺序重写 order 字段
#[tauri::command]
pub async fn reorder_spaces(
    space_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Space>, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        reorder_spaces_core(&storage, &space_ids)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_spaces() -> Vec<Space> {
        let now = Utc::now();
        (0..3)
            .map(|i| Space {
                id: format!("space_{i}"),
                name: format!("s{i}"),
                icon: String::new(),
                color: String::new(),
                order: i,
                created_at: now,
                updated_at: now,
            })
            .collect()
    }

    #[test]
    fn test_reorder_rewrites_order_and_sorts() {
        let mut spaces = make_spaces();
        let ids = ["space_2", "space_0", "space_1"]
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        apply_space_order(&mut spaces, &ids).unwrap();

        let order: Vec<(String, u32)> = spaces.iter().map(|s| (s.id.clone(), s.order)).collect();
        assert_eq!(
            order,
            vec![
                ("space_2".to_string(), 0),
                ("space_0".to_string(), 1),
                ("space_1".to_string(), 2),
            ]
        );
    }

    #[test]
    fn test_reorder_rejects_unknown_id() {
        let mut spaces = make_spaces();
        let ids = ["space_0", "space_1", "space_999"]
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        assert!(apply_space_order(&mut spaces, &ids).is_err());
    }

    #[test]
    fn test_reorder_rejects_duplicate_id() {
        let mut spaces = make_spaces();
        let ids = ["space_0", "space_0", "space_1"]
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        assert!(apply_space_order(&mut spaces, &ids).is_err());
    }

    #[test]
    fn test_reorder_rejects_count_mismatch() {
        let mut spaces = make_spaces();
        let ids = vec!["space_0".to_string(), "space_1".to_string()];
        assert!(apply_space_order(&mut spaces, &ids).is_err());
    }
}
