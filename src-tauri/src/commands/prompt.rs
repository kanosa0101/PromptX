//! 提示词管理命令

use crate::models::{AppData, Prompt, PromptInput, PromptUpdate};
use crate::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

/// 获取所有应用数据
#[tauri::command]
pub async fn get_app_data(state: State<'_, AppState>) -> Result<AppData, String> {
    let storage = state.storage.read();
    storage.load().map_err(|e| e.to_string())
}

/// 创建提示词
#[tauri::command]
pub async fn create_prompt(
    prompt: PromptInput,
    state: State<'_, AppState>,
) -> Result<Prompt, String> {
    // 写入含双 fsync，放阻塞线程池执行，避免占用 tokio async worker
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
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
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 更新提示词
#[tauri::command]
pub async fn update_prompt(
    id: String,
    updates: PromptUpdate,
    state: State<'_, AppState>,
) -> Result<Prompt, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
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
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 删除提示词
#[tauri::command]
pub async fn delete_prompt(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        let mut data = storage.load().map_err(|e| e.to_string())?;

        let before_len = data.prompts.len();
        data.prompts.retain(|p| p.id != id);
        if data.prompts.len() < before_len {
            storage.save(data).map_err(|e| e.to_string())?;
        }

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 更新使用计数
#[tauri::command]
pub async fn update_prompt_usage(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
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
    })
    .await
    .map_err(|e| e.to_string())?
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
pub async fn import_data(
    import_data: AppData,
    merge: bool,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let storage = state.storage.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let storage = storage.write();
        let mut data = storage.load().map_err(|e| e.to_string())?;

        let mut result = ImportResult {
            imported_prompts: 0,
            imported_spaces: 0,
            skipped: 0,
            conflicts: Vec::new(),
        };

        // 哈希索引代替逐条线性查找（导入大文件时 O(n×m) → O(n+m)）
        use std::collections::HashMap;
        let mut space_index: HashMap<String, usize> = data
            .spaces
            .iter()
            .enumerate()
            .map(|(i, s)| (s.id.clone(), i))
            .collect();
        let mut prompt_index: HashMap<String, usize> = data
            .prompts
            .iter()
            .enumerate()
            .map(|(i, p)| (p.id.clone(), i))
            .collect();

        // 导入空间
        for space in import_data.spaces {
            match space_index.get(&space.id) {
                Some(&i) => {
                    if merge {
                        // 合并模式：用导入数据覆盖
                        data.spaces[i] = space;
                        result.imported_spaces += 1;
                    } else {
                        result
                            .conflicts
                            .push(format!("Space ID {} already exists", space.id));
                        result.skipped += 1;
                    }
                }
                None => {
                    space_index.insert(space.id.clone(), data.spaces.len());
                    data.spaces.push(space);
                    result.imported_spaces += 1;
                }
            }
        }

        // 导入提示词
        for prompt in import_data.prompts {
            match prompt_index.get(&prompt.id) {
                Some(&i) => {
                    if merge {
                        // 合并模式：用导入数据覆盖
                        data.prompts[i] = prompt;
                        result.imported_prompts += 1;
                    } else {
                        result
                            .conflicts
                            .push(format!("Prompt ID {} already exists", prompt.id));
                        result.skipped += 1;
                    }
                }
                None => {
                    prompt_index.insert(prompt.id.clone(), data.prompts.len());
                    data.prompts.push(prompt);
                    result.imported_prompts += 1;
                }
            }
        }

        // 导入同样受「AI 优化」历史上限约束，防止数据文件被导入撑爆
        crate::commands::ai::trim_ai_history(&mut data.prompts);

        storage.save(data).map_err(|e| e.to_string())?;
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}
