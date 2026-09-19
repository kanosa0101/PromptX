//! 提示词管理命令

use crate::models::{AppData, Prompt, PromptInput, PromptUpdate};
use crate::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

/// 获取所有应用数据
#[tauri::command]
pub fn get_app_data(state: State<'_, AppState>) -> Result<AppData, String> {
    let storage = state.storage.read();
    storage.load().map_err(|e| e.to_string())
}

/// 获取所有提示词
#[tauri::command]
pub fn get_all_prompts(space_id: Option<String>, state: State<'_, AppState>) -> Result<Vec<Prompt>, String> {
    let storage = state.storage.read();
    let data = storage.load().map_err(|e| e.to_string())?;

    if let Some(sid) = space_id {
        Ok(data.prompts.into_iter().filter(|p| p.space_id == sid).collect())
    } else {
        Ok(data.prompts)
    }
}

/// 搜索提示词
#[tauri::command]
pub fn search_prompts(query: String, space_id: Option<String>, state: State<'_, AppState>) -> Result<Vec<Prompt>, String> {
    let storage = state.storage.read();
    let data = storage.load().map_err(|e| e.to_string())?;

    let mut prompts = data.prompts;

    // 按空间过滤
    if let Some(sid) = space_id {
        prompts = prompts.into_iter().filter(|p| p.space_id == sid).collect();
    }

    // 搜索过滤
    if !query.is_empty() {
        let query_lower = query.to_lowercase();
        prompts = prompts
            .into_iter()
            .filter(|p| {
                p.title.to_lowercase().contains(&query_lower)
                    || p.content.to_lowercase().contains(&query_lower)
                    || p.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
            })
            .collect();
    }

    Ok(prompts)
}

/// 创建提示词
#[tauri::command]
pub fn create_prompt(prompt: PromptInput, state: State<'_, AppState>) -> Result<Prompt, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let now = Utc::now();
    let content = prompt.content.clone();
    let new_prompt = Prompt {
        id: Uuid::new_v4().to_string(),
        title: prompt.title,
        content,
        tags: prompt.tags,
        space_id: prompt.space_id,
        variables: crate::utils::variable::parse_variables(&prompt.content),
        usage_count: 0,
        last_used_at: None,
        created_at: now,
        updated_at: now,
    };

    data.prompts.push(new_prompt.clone());
    storage.save(data).map_err(|e| e.to_string())?;

    Ok(new_prompt)
}

/// 更新提示词
#[tauri::command]
pub fn update_prompt(id: String, updates: PromptUpdate, state: State<'_, AppState>) -> Result<Prompt, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let index = data.prompts.iter().position(|p| p.id == id);
    if let Some(i) = index {
        let prompt = &mut data.prompts[i];
        let now = Utc::now();

        if let Some(title) = updates.title {
            prompt.title = title;
        }
        if let Some(content) = updates.content {
            prompt.content = content.clone();
            prompt.variables = crate::utils::variable::parse_variables(&content);
        }
        if let Some(tags) = updates.tags {
            prompt.tags = tags;
        }
        if let Some(space_id) = updates.space_id {
            prompt.space_id = space_id;
        }
        prompt.updated_at = now;

        let updated = prompt.clone();
        storage.save(data).map_err(|e| e.to_string())?;
        Ok(updated)
    } else {
        Err("Prompt not found".to_string())
    }
}

/// 删除提示词
#[tauri::command]
pub fn delete_prompt(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let before_len = data.prompts.len();
    data.prompts.retain(|p| p.id != id);
    if data.prompts.len() < before_len {
        storage.save(data).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 更新使用计数
#[tauri::command]
pub fn update_prompt_usage(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let index = data.prompts.iter().position(|p| p.id == id);
    if let Some(i) = index {
        let prompt = &mut data.prompts[i];
        prompt.usage_count += 1;
        prompt.last_used_at = Some(Utc::now());
        prompt.updated_at = Utc::now();

        storage.save(data).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Prompt not found".to_string())
    }
}

/// 导入结果
#[derive(serde::Serialize)]
pub struct ImportResult {
    pub imported_prompts: u32,
    pub imported_spaces: u32,
    pub skipped: u32,
    pub conflicts: Vec<String>,
}

/// 导入数据
/// merge=true: 冲突项用导入数据覆盖更新
/// merge=false: 冲突项跳过（保留本地）
#[tauri::command]
pub fn import_data(
    import_data: AppData,
    merge: bool,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let storage = state.storage.write();
    let mut data = storage.load().map_err(|e| e.to_string())?;

    let mut result = ImportResult {
        imported_prompts: 0,
        imported_spaces: 0,
        skipped: 0,
        conflicts: Vec::new(),
    };

    // 导入空间
    for space in import_data.spaces {
        if let Some(existing) = data.spaces.iter_mut().find(|s| s.id == space.id) {
            if merge {
                // 合并模式：用导入数据覆盖
                *existing = space;
                result.imported_spaces += 1;
            } else {
                result.conflicts.push(format!("Space ID {} already exists", space.id));
                result.skipped += 1;
            }
        } else {
            data.spaces.push(space);
            result.imported_spaces += 1;
        }
    }

    // 导入提示词
    for prompt in import_data.prompts {
        if let Some(existing) = data.prompts.iter_mut().find(|p| p.id == prompt.id) {
            if merge {
                // 合并模式：用导入数据覆盖
                *existing = prompt;
                result.imported_prompts += 1;
            } else {
                result.conflicts.push(format!("Prompt ID {} already exists", prompt.id));
                result.skipped += 1;
            }
        } else {
            data.prompts.push(prompt);
            result.imported_prompts += 1;
        }
    }

    storage.save(data).map_err(|e| e.to_string())?;
    Ok(result)
}