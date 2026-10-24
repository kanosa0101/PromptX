# 设计方案：桌面端 ↔ 浏览器扩展数据打通（Native Messaging）

> 状态：设计方案，未实施。本文是动手前的共识基线。

## 背景与目标

当前桌面端（`data.json`，Tauri Rust 管理）与浏览器扩展（`chrome.storage.local`）是两个数据孤岛，
唯一桥梁是手动 JSON 导出/导入。目标是：装了桌面端的用户，扩展自动与桌面端共享同一份提示词库，
无需手动同步。

## 技术选型：Chrome Native Messaging

- 扩展通过 `chrome.runtime.connectNative()` 与本机进程建立长连接（stdio，长度前缀 JSON 协议）。
- 相比本地 WebSocket/HTTP 服务：无端口占用、无防火墙弹窗、浏览器原生支持、权限模型清晰。
- Firefox / Edge（Chromium 内核）同样支持，协议可复用。

## 架构

```
浏览器扩展                          桌面端
┌─────────────────┐   native messaging   ┌──────────────────────────┐
│ background SW   │◄──── stdio JSON ────►│ promptx.exe --nm-host    │
│  (NM 客户端)     │                      │  ↕ 单实例 IPC（见下）      │
└─────────────────┘                      │ 主进程（持有存储写锁）      │
                                         └──────────────────────────┘
```

关键点：**NM host 进程是短生命周期的**（浏览器按需拉起、断开即退出），而主进程持有
`StorageService` 的写锁。两个进程不能同时写 `data.json`。推荐做法：

1. NM host 进程不直接写文件，通过**单实例机制**转发给主进程：
   Tauri 已集成 `tauri_plugin_single_instance`，可复用其转发通道（第二个实例以
   `--nm-request <JSON>` 启动时把请求转给主进程处理并回传结果）。
2. 读操作（搜索、列表）由 NM host 直接读文件（只读无锁竞争，接受短暂陈旧）。

## 消息协议（v1 草案）

请求/响应均为 `{ "id": number, "type": string, ... }`：

| type | 方向 | 说明 |
|------|------|------|
| `getAppData` | ext→host | 全量拉取（首次连接/手动刷新） |
| `createPrompt` / `updatePrompt` / `deletePrompt` | ext→host | 转发主进程执行 |
| `createSpace` / `updateSpace` / `deleteSpace` | ext→host | 同上 |
| `dataChanged` | host→ext | 主进程数据变更推送（增量同步触发） |
| `ping` / `pong` | 双向 | 保活与服务可用性探测 |

## 落地清单

1. **Rust**：`src-tauri/src/nm_host.rs` —— stdio 读写循环（`tauri-plugin-shell` 的 pipe 或手写
   4 字节小端长度前缀）、按 `type` 分发到单实例转发。
2. **清单文件**：`com.promptx.nm.json`（`allowed_origins` 填扩展 ID）+ Windows 注册表
   `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.promptx.nm`。
   注册动作由**安装器/应用首次启动**写入（HKCU 无需管理员权限），卸载时清理。
3. **扩展**：`manifest.json` 增加 `nativeMessaging` 权限；background 增加 NM 客户端与
   断线回退（NM 不可用时维持现有 chrome.storage 独立模式，UI 提示「未连接桌面端」）。
4. **数据合并**：首次连接时以桌面端为准，扩展本地数据提供一次性合并导入（复用现有 import 逻辑）。
5. **AI 设置**：API Key 已迁入系统钥匙串（桌面端），扩展的 AI 请求仍由自身发起 —— key 通过
   NM 的 `getAiSettings` 从主进程取（仅在 NM 连接可用时；独立模式下仍在 chrome.storage）。

## 风险与开放问题

- NM host 与主进程的转发链路增加时延（~10ms 级，对 CRUD 无感）。
- 多浏览器同时连接 = 多个 NM host 进程，都经单实例转发，天然串行化，无写冲突。
- 扩展商店审核：nativeMessaging 权限需在商店说明中给出理由。
- macOS/Linux：NM 协议一致，但注册方式不同（launchd plist / 文件路径），随平台支持落地。
