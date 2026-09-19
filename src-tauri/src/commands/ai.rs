//! AI 优化命令
//!
//! 桌面端全自动流程（AI 请求由前端 webview 发起，Rust 侧不引入 HTTP 依赖）：
//! 全局快捷键（主窗口隐藏、焦点仍在原应用）→ 模拟 Ctrl+C 截取选中文本
//! → 通过事件通知前端 → 前端调用 OpenAI 兼容接口完成优化
//! → invoke 写回剪贴板并模拟 Ctrl+V 贴回原位 → 恢复原剪贴板
//! → 结果存入「AI 优化」历史空间。

use crate::commands::clipboard::{simulate_copy, simulate_paste};
use crate::models::{AI_HISTORY_SPACE_ID, Prompt, Space};
use crate::AppState;
use chrono::Utc;
use parking_lot::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use uuid::Uuid;

/// 优化会话：截取到的选中文本与截取前的剪贴板内容
struct OptimizeSession {
    original_clipboard: Option<String>,
    selected_text: String,
}

/// 进行中的优化会话（同一时刻至多一个）
static OPTIMIZE_SESSION: Mutex<Option<OptimizeSession>> = Mutex::new(None);

/// 模拟按键后等待系统/应用响应的间隔
const COPY_DELAY_MS: u64 = 250;
const PASTE_DELAY_MS: u64 = 50;
const RESTORE_DELAY_MS: u64 = 150;
/// 松开快捷键后、模拟 Ctrl+C 前的缓冲，确保物理按键状态稳定
const RELEASE_SETTLE_MS: u64 = 120;

/// 轻量诊断日志（后台全自动流程无 UI，故障时需要可追溯）
fn debug_log(msg: &str) {
    let ts = chrono::Local::now().format("%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] {}\n", ts, msg);
    let path = std::env::temp_dir().join("promptx-ai.log");
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        use std::io::Write;
        let _ = f.write_all(line.as_bytes());
    }
}

/// 快捷键入口：截取选中文本并通知前端开始 AI 优化
/// 全程不显示主窗口，焦点始终停留在目标应用
pub async fn capture_selection_for_optimize(app: tauri::AppHandle) {
    debug_log("快捷键触发: 开始截取选中文本");
    if let Err(err) = capture_inner(&app).await {
        // 截取失败：清理会话，弹出主窗口由前端展示错误
        debug_log(&format!("截取失败: {}", err));
        *OPTIMIZE_SESSION.lock() = None;
        match emit_to_main(&app, "promptx-ai-error", serde_json::json!({ "message": err })) {
            Ok(()) => debug_log("已通知前端展示错误"),
            Err(e) => debug_log(&format!("前端错误通知发送失败: {}", e)),
        }
    }
}

/// 截断并转义内容用于日志预览
fn preview(s: &str, max: usize) -> String {
    let mut out: String = s.chars().take(max).collect::<String>().replace('\n', "\\n");
    if s.chars().count() > max {
        out.push('…');
    }
    out
}

async fn capture_inner(app: &tauri::AppHandle) -> Result<(), String> {
    // 0. 松开快捷键后稍作缓冲，确保用户物理按键已全部抬起
    tokio::time::sleep(Duration::from_millis(RELEASE_SETTLE_MS)).await;

    // 1. 保存原剪贴板内容，用于结束后恢复
    let original = app.clipboard().read_text().ok();
    debug_log(&format!(
        "原剪贴板: {}",
        match &original {
            Some(t) => format!("{} 字符 [{}]", t.chars().count(), preview(t, 30)),
            None => "不可读".to_string(),
        }
    ));

    // 2. 模拟 Ctrl+C 截取选中内容（窗口未显示，焦点仍在原应用）
    simulate_copy();
    tokio::time::sleep(Duration::from_millis(COPY_DELAY_MS)).await;

    // 3. 读取截取结果；为空或与原剪贴板相同视为未截取到，
    //    避免把陈旧剪贴板内容当作选中文本送去优化并误替换
    let selected = app.clipboard().read_text().unwrap_or_default();
    debug_log(&format!(
        "Ctrl+C 后剪贴板: {} 字符 [{}]",
        selected.chars().count(),
        preview(&selected, 30)
    ));
    if selected.trim().is_empty() || original.as_deref() == Some(selected.as_str()) {
        return Err("未截取到选中文本，请先在目标应用中选中要优化的内容".to_string());
    }

    *OPTIMIZE_SESSION.lock() = Some(OptimizeSession {
        original_clipboard: original,
        selected_text: selected.clone(),
    });

    // 4. 通知前端执行 AI 优化（前端完成后回调 optimize_apply_result）
    debug_log(&format!(
        "截取成功({} 字符)，通知前端调 AI",
        selected.chars().count()
    ));
    emit_to_main(
        app,
        "promptx-ai-captured",
        serde_json::json!({ "text": selected }),
    )
}

/// 前端 AI 优化成功后调用：贴回原位置并保存历史
#[tauri::command]
pub async fn optimize_apply_result(app: tauri::AppHandle, text: String) -> Result<(), String> {
    debug_log(&format!("前端回调贴回: {} 字符", text.chars().count()));
    let session = OPTIMIZE_SESSION
        .lock()
        .take()
        .ok_or_else(|| "没有进行中的优化会话".to_string())?;

    // 写剪贴板 → 隐藏窗口（可能被用户中途唤起）→ 模拟 Ctrl+V → 恢复原剪贴板
    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())?;

    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().unwrap_or_default();
            tokio::time::sleep(Duration::from_millis(PASTE_DELAY_MS)).await;
        }
    }
    tokio::time::sleep(Duration::from_millis(PASTE_DELAY_MS)).await;
    simulate_paste();
    tokio::time::sleep(Duration::from_millis(RESTORE_DELAY_MS)).await;

    if let Some(orig) = session.original_clipboard {
        let _ = app.clipboard().write_text(&orig);
    }

    // 保存历史（失败不影响主流程）
    save_ai_history(&app, &session.selected_text, &text);
    Ok(())
}

/// 前端 AI 优化失败后调用：恢复原剪贴板并结束会话
#[tauri::command]
pub fn optimize_cancel(app: tauri::AppHandle) -> Result<(), String> {
    debug_log("前端回调取消: 恢复原剪贴板");
    if let Some(session) = OPTIMIZE_SESSION.lock().take() {
        if let Some(orig) = session.original_clipboard {
            let _ = app.clipboard().write_text(&orig);
        }
    }
    Ok(())
}

/// 保存优化结果到「AI 优化」历史空间（空间不存在则自动创建）
fn save_ai_history(app: &tauri::AppHandle, original: &str, optimized: &str) {
    if let Err(err) = (|| -> Result<(), String> {
        let state: State<AppState> = app.state();
        let storage = state.storage.write();
        let mut data = storage.load().map_err(|e| e.to_string())?;

        // 确保「AI 优化」空间存在
        if !data.spaces.iter().any(|s| s.id == AI_HISTORY_SPACE_ID) {
            let now = Utc::now();
            let max_order = data.spaces.iter().map(|s| s.order).max().unwrap_or(0);
            data.spaces.push(Space {
                id: AI_HISTORY_SPACE_ID.to_string(),
                name: "AI 优化".to_string(),
                icon: "✨".to_string(),
                color: "#8B5CF6".to_string(),
                order: max_order + 1,
                created_at: now,
                updated_at: now,
            });
        }

        let now = Utc::now();
        // 标题：原文压缩空白后取前 30 字符
        let flattened = original.split_whitespace().collect::<Vec<_>>().join(" ");
        let char_count = flattened.chars().count();
        let mut title: String = flattened.chars().take(30).collect();
        if char_count > 30 {
            title.push('…');
        }
        if title.is_empty() {
            title = "未命名优化".to_string();
        }

        data.prompts.push(Prompt {
            id: Uuid::new_v4().to_string(),
            title,
            content: optimized.to_string(),
            tags: vec!["AI优化".to_string()],
            space_id: AI_HISTORY_SPACE_ID.to_string(),
            variables: Vec::new(),
            usage_count: 0,
            last_used_at: None,
            created_at: now,
            updated_at: now,
        });

        storage.save(data).map_err(|e| e.to_string())?;
        Ok(())
    })() {
        eprintln!("保存 AI 优化历史失败: {}", err);
    }
}

/// 向主窗口前端发送事件
fn emit_to_main(app: &tauri::AppHandle, event: &str, payload: serde_json::Value) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window.emit(event, payload).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_title_truncation() {
        let flattened: String = "这是一段很长很长很长很长很长很长很长很长很长很长很长很长很长很长的选中文本"
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");
        let mut title: String = flattened.chars().take(30).collect();
        if flattened.chars().count() > 30 {
            title.push('…');
        }
        assert_eq!(title.chars().count(), 31);
        assert!(title.ends_with('…'));
    }
}
