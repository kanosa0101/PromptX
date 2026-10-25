//! Chrome Native Messaging host（`promptx.exe --nm-host`）
//!
//! 浏览器在 connectNative 时按注册清单拉起本进程（短生命周期，断开即退出）。
//! 协议：4 字节小端长度前缀 + JSON，请求/响应经 stdio，详见 docs/design.md。
//!
//! 与主进程的并发：两个进程直接读写 data.json，靠 StorageService 的
//! 跨进程文件锁互斥；主进程缓存经 mtime 检测失效。

use crate::commands::prompt::{create_prompt_core, delete_prompt_core, update_prompt_core};
use crate::commands::space::{
    create_space_core, delete_space_core, reorder_spaces_core, update_space_core,
};
use crate::models::{AppData, Prompt, PromptInput, PromptUpdate, Space};
use crate::services::storage::StorageService;
use parking_lot::Mutex;
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

/// NM 主机名（注册表/清单与扩展 connectNative 使用同一名字）
pub const NM_HOST_NAME: &str = "com.promptx.nm";

/// 单条消息上限：Chrome 自身限制 1MB 入站/64MB 出站，取保守值
const MAX_MESSAGE_BYTES: u32 = 10 * 1024 * 1024;

/// 桌面端变更推送的轮询间隔（mtime 检查，无变更时开销为一次 stat）
const CHANGE_POLL_INTERVAL: Duration = Duration::from_secs(2);

/// 主进程的应用数据目录（与 tauri app_data_dir 同一位置；
/// NM host 进程无 tauri 运行时，手动解析）
pub fn nm_data_dir() -> PathBuf {
    #[cfg(windows)]
    {
        let base = std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));
        base.join("com.promptx.app")
    }
    #[cfg(not(windows))]
    {
        let base = std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                let home = std::env::var("HOME")
                    .map(PathBuf::from)
                    .unwrap_or_else(|_| PathBuf::from("."));
                home.join(".local/share")
            });
        base.join("com.promptx.app")
    }
}

/// 读取一条 NM 消息；流关闭（浏览器断开）返回 Ok(None)
pub fn read_message<R: Read>(reader: &mut R) -> std::io::Result<Option<Value>> {
    let mut len_buf = [0u8; 4];
    match reader.read_exact(&mut len_buf) {
        Ok(()) => {}
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let len = u32::from_le_bytes(len_buf);
    if len == 0 || len > MAX_MESSAGE_BYTES {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "消息长度非法",
        ));
    }
    let mut buf = vec![0u8; len as usize];
    reader.read_exact(&mut buf)?;
    let value = serde_json::from_slice(&buf).map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("消息不是合法 JSON: {e}"),
        )
    })?;
    Ok(Some(value))
}

/// 写出一条 NM 消息（长度前缀 + JSON + flush）
pub fn write_message<W: Write + ?Sized>(writer: &mut W, value: &Value) -> std::io::Result<()> {
    let body = serde_json::to_vec(value)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;
    writer.write_all(&(body.len() as u32).to_le_bytes())?;
    writer.write_all(&body)?;
    writer.flush()
}

/// 响应封装：回显请求 id
fn ok_response(id: Option<&Value>, extra: Value) -> Value {
    let mut response = json!({ "ok": true });
    if let Some(id) = id {
        response["id"] = id.clone();
    }
    if let Value::Object(map) = extra {
        for (key, value) in map {
            response[key] = value;
        }
    }
    response
}

fn err_response(id: Option<&Value>, message: &str) -> Value {
    let mut response = json!({ "ok": false, "error": message });
    if let Some(id) = id {
        response["id"] = id.clone();
    }
    response
}

fn parse_field<T: serde::de::DeserializeOwned>(request: &Value, field: &str) -> Result<T, String> {
    serde_json::from_value(request.get(field).cloned().unwrap_or(Value::Null))
        .map_err(|e| format!("字段 {field} 解析失败: {e}"))
}

/// 处理一条请求（纯函数便于单测；storage 经文件锁保护并发）
pub fn handle_request(storage: &StorageService, request: &Value) -> Value {
    let id = request.get("id").cloned();
    let request_type = request.get("type").and_then(|v| v.as_str()).unwrap_or("");

    let result: Result<Value, String> = match request_type {
        "ping" => Ok(json!({ "pong": true })),
        "getAppData" => match storage.load() {
            Ok(data) => Ok(json!({ "data": data })),
            Err(e) => Err(e.to_string()),
        },
        "createPrompt" => parse_field::<PromptInput>(request, "prompt")
            .and_then(|input| create_prompt_core(storage, &input))
            .map(|prompt| json!({ "prompt": prompt })),
        "updatePrompt" => {
            let id: String = parse_field(request, "id").unwrap_or_default();
            parse_field::<PromptUpdate>(request, "updates")
                .and_then(|updates| update_prompt_core(storage, &id, &updates))
                .map(|prompt| json!({ "prompt": prompt }))
        }
        "deletePrompt" => parse_field::<String>(request, "id")
            .and_then(|id| delete_prompt_core(storage, &id))
            .map(|_| json!({})),
        "createSpace" => {
            let name: String = parse_field(request, "name").unwrap_or_default();
            let icon: String = parse_field(request, "icon").unwrap_or_default();
            let color: String = parse_field(request, "color").unwrap_or_default();
            create_space_core(storage, &name, &icon, &color).map(|space| json!({ "space": space }))
        }
        "updateSpace" => {
            let id: String = parse_field(request, "id").unwrap_or_default();
            let name: Option<String> = parse_field(request, "name").unwrap_or(None);
            let icon: Option<String> = parse_field(request, "icon").unwrap_or(None);
            let color: Option<String> = parse_field(request, "color").unwrap_or(None);
            update_space_core(
                storage,
                &id,
                name.as_deref(),
                icon.as_deref(),
                color.as_deref(),
            )
            .map(|space| json!({ "space": space }))
        }
        "deleteSpace" => parse_field::<String>(request, "id")
            .and_then(|id| delete_space_core(storage, &id))
            .map(|_| json!({})),
        "reorderSpaces" => parse_field::<Vec<String>>(request, "spaceIds")
            .and_then(|ids| reorder_spaces_core(storage, &ids))
            .map(|spaces| json!({ "spaces": spaces })),
        // 扩展端写路径：store 以整组 spaces/prompts 写回（两端结构一致时使用）。
        // 空 spaces 拒绝，防止误清空
        "replaceAll" => {
            let spaces: Vec<Space> = parse_field(request, "spaces").unwrap_or_default();
            if spaces.is_empty() {
                return err_response(id.as_ref(), "spaces 不能为空");
            }
            let prompts: Vec<Prompt> = parse_field(request, "prompts").unwrap_or_default();
            replace_all_core(storage, spaces, prompts).map(|_| json!({}))
        }
        other => Err(format!("未知消息类型: {other}")),
    };

    match result {
        Ok(extra) => ok_response(id.as_ref(), extra),
        Err(message) => err_response(id.as_ref(), &message),
    }
}

fn replace_all_core(
    storage: &StorageService,
    spaces: Vec<Space>,
    prompts: Vec<Prompt>,
) -> Result<(), String> {
    let mut data: AppData = storage.load().map_err(|e| e.to_string())?;
    data.spaces = spaces;
    data.prompts = prompts;
    crate::commands::ai::trim_ai_history(&mut data.prompts);
    storage.save(data).map_err(|e| e.to_string())
}

/// 空闲期监视 data.json mtime：桌面端改动 → 主动推送 dataChanged
fn spawn_change_watcher(
    storage: &StorageService,
    out: Arc<Mutex<dyn Write + Send>>,
) -> std::thread::JoinHandle<()> {
    let data_path = storage.data_path().to_path_buf();
    std::thread::spawn(move || {
        let mut last_seen = std::fs::metadata(&data_path)
            .and_then(|m| m.modified())
            .ok();
        loop {
            std::thread::sleep(CHANGE_POLL_INTERVAL);
            let current = std::fs::metadata(&data_path)
                .and_then(|m| m.modified())
                .ok();
            if current != last_seen {
                last_seen = current;
                let message = json!({ "type": "dataChanged" });
                let mut writer = out.lock();
                if write_message(&mut *writer, &message).is_err() {
                    break; // stdio 已断开，退出监视
                }
            }
        }
    })
}

/// NM host 主循环（main 中 `--nm-host` 分支调用）
pub fn run() -> i32 {
    let storage = StorageService::new_at_dir(nm_data_dir());
    let stdout = Arc::new(Mutex::new(std::io::stdout()));
    let _watcher = spawn_change_watcher(&storage, stdout.clone());

    let stdin = std::io::stdin();
    let mut reader = stdin.lock();
    // Ok(None)/Err（浏览器断开）都终止循环，host 随连接退出
    while let Ok(Some(request)) = read_message(&mut reader) {
        let response = handle_request(&storage, &request);
        let mut writer = stdout.lock();
        if write_message(&mut *writer, &response).is_err() {
            break;
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    /// read/write 帧往返（含多字节内容）
    #[test]
    fn test_message_roundtrip() {
        let value = json!({ "type": "ping", "id": 7, "文本": "内容" });
        let mut buffer = Vec::new();
        write_message(&mut buffer, &value).unwrap();
        let mut cursor = std::io::Cursor::new(buffer);
        let decoded = read_message(&mut cursor).unwrap().unwrap();
        assert_eq!(decoded, value);
    }

    /// 流关闭 → None（浏览器断开的正常路径）
    #[test]
    fn test_read_message_eof_returns_none() {
        let mut empty = std::io::Cursor::new(Vec::new());
        assert!(read_message(&mut empty).unwrap().is_none());
    }

    /// 超长消息 → InvalidData（防御异常客户端）
    #[test]
    fn test_read_message_rejects_oversize() {
        let mut buffer = Vec::new();
        buffer.extend_from_slice(&(MAX_MESSAGE_BYTES + 1).to_le_bytes());
        let mut cursor = std::io::Cursor::new(buffer);
        assert!(read_message(&mut cursor).is_err());
    }

    fn test_storage() -> (StorageService, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        (StorageService::new_at_dir(dir.path().to_path_buf()), dir)
    }

    #[test]
    fn test_handle_ping() {
        let (storage, _dir) = test_storage();
        let response = handle_request(&storage, &json!({ "type": "ping", "id": 1 }));
        assert_eq!(response["ok"], true);
        assert_eq!(response["pong"], true);
        assert_eq!(response["id"], 1);
    }

    #[test]
    fn test_get_app_data_and_create_prompt() {
        let (storage, _dir) = test_storage();
        let response = handle_request(&storage, &json!({ "type": "getAppData", "id": 2 }));
        assert_eq!(response["ok"], true);
        assert!(response["data"]["prompts"].is_array());

        let response = handle_request(
            &storage,
            &json!({ "type": "createPrompt", "id": 3, "prompt": {
                "title": "测试", "content": "内容 {{x}}", "tags": [], "spaceId": "space_default"
            }}),
        );
        assert_eq!(response["ok"], true);
        assert_eq!(response["prompt"]["title"], "测试");

        // 再读全量应包含新建条目（默认数据自带 2 条示例，按标题断言）
        let response = handle_request(&storage, &json!({ "type": "getAppData" }));
        let prompts = response["data"]["prompts"].as_array().unwrap();
        assert!(prompts.iter().any(|p| p["title"] == "测试"));
    }

    #[test]
    fn test_unknown_type_and_bad_field() {
        let (storage, _dir) = test_storage();
        let response = handle_request(&storage, &json!({ "type": "whatever", "id": 9 }));
        assert_eq!(response["ok"], false);
        assert!(response["error"].as_str().unwrap().contains("未知"));

        let response = handle_request(
            &storage,
            &json!({ "type": "updatePrompt", "id": "no-such", "updates": { "title": "x" } }),
        );
        assert_eq!(response["ok"], false);
    }

    /// replaceAll 空 spaces 拒绝（防误清空）
    #[test]
    fn test_replace_all_rejects_empty_spaces() {
        let (storage, _dir) = test_storage();
        let response = handle_request(
            &storage,
            &json!({ "type": "replaceAll", "spaces": [], "prompts": [] }),
        );
        assert_eq!(response["ok"], false);
        assert!(response["error"].as_str().unwrap().contains("spaces"));
    }
}
