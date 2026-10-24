# 设计方案（未实施提案）

> 状态：设计方案，均未实施。本文是动手前的共识基线，对应 PRD v2.0 规划的「双端打通与 UI 合并」。

## 一、桌面端 ↔ 浏览器扩展数据打通（Native Messaging）

### 背景与目标

当前桌面端（`data.json`，Tauri Rust 管理）与浏览器扩展（`chrome.storage.local`）是两个数据孤岛，
唯一桥梁是手动 JSON 导出/导入。目标是：装了桌面端的用户，扩展自动与桌面端共享同一份提示词库，
无需手动同步。

### 技术选型：Chrome Native Messaging

- 扩展通过 `chrome.runtime.connectNative()` 与本机进程建立长连接（stdio，长度前缀 JSON 协议）。
- 相比本地 WebSocket/HTTP 服务：无端口占用、无防火墙弹窗、浏览器原生支持、权限模型清晰。
- Firefox / Edge（Chromium 内核）同样支持，协议可复用。

### 架构

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

### 消息协议（v1 草案）

请求/响应均为 `{ "id": number, "type": string, ... }`：

| type | 方向 | 说明 |
|------|------|------|
| `getAppData` | ext→host | 全量拉取（首次连接/手动刷新） |
| `createPrompt` / `updatePrompt` / `deletePrompt` | ext→host | 转发主进程执行 |
| `createSpace` / `updateSpace` / `deleteSpace` | ext→host | 同上 |
| `dataChanged` | host→ext | 主进程数据变更推送（增量同步触发） |
| `ping` / `pong` | 双向 | 保活与服务可用性探测 |

### 落地清单

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

### 风险与开放问题

- NM host 与主进程的转发链路增加时延（~10ms 级，对 CRUD 无感）。
- 多浏览器同时连接 = 多个 NM host 进程，都经单实例转发，天然串行化，无写冲突。
- 扩展商店审核：nativeMessaging 权限需在商店说明中给出理由。
- macOS/Linux：NM 协议一致，但注册方式不同（launchd plist / 文件路径），随平台支持落地。

---

## 二、桌面端与扩展 UI 层合并（shared/ui）

### 现状

`shared/` 已收敛纯逻辑（类型/AI 客户端/搜索/变量/AI 历史约定/确认对话框/空间选项），
但 UI 层仍双端各维护一份：

| 单元 | 桌面端 | 扩展端 | 差异 |
|------|--------|--------|------|
| SettingsPanel | src/components/SettingsPanel.vue（已拆分） | extension/.../SettingsPanel.vue | 桌面多窗口/热键项；扩展多 maxResults |
| PromptEditor | 204 行 | 117 行 | 标签编辑交互不同 |
| SpaceEditor | 单空间表单 | 空间管理列表 | 结构性差异 |
| VariableForm | 近似 | 近似 | class 体系不同 |
| promptStore | Tauri invoke | chrome.storage + DOM 插入 | 后端完全不同 |
| uiStore / 键盘导航 | 窗口式 | 侧边栏式 | 行为差异（Esc 关闭面板 vs 重置搜索） |

### 合并的前置条件（为什么不直接抽组件）

1. **Tailwind token 不统一**：两端 `tailwind.config.js` 自定义色/类名不同。
   共享组件必须先统一 design token（ConfirmDialog 已先行迁入 `shared/components/`，
   代价是两端 content 需扫描 `shared/`）。
2. **后端差异**：store 的 CRUD/输出路径一个是 `invoke()`，一个是 `chrome.storage` + DOM。
   需要一个显式的「平台适配层」而不是 if/else 散落在组件里。

### 目标架构

```
shared/
  ui/
    tokens.css          # 统一 design token（色板/间距），两端 tailwind.config 引用同一份
    components/         # 纯展示组件（VariableForm、HotkeyRow、PromptItem…；ConfirmDialog 已迁入）
    composables/        # useKeyboardNavigation、useSearch（已有）
src/  &  extension/src/
    adapters/           # 平台适配层（每端一份）
      storage.ts        # loadAppData/saveAppData（invoke | chrome.storage）
      output.ts         # 输出（paste_and_restore | DOM 插入+剪贴板回退）
      window.ts         # 窗口/面板控制（hide window | 仅重置状态）
    stores/             # 薄 store：状态 + 调 adapter（两端各留一个文件，但只有装配代码）
```

### 分步实施（每步独立可发布）

1. **Step 1 token 统一**：把两端用到的色值抽成 `shared/ui/tokens.css` + JS 常量，
   两端 tailwind.config 从此引用。纯视觉回归，无逻辑风险。
2. **Step 2 纯展示组件下沉**：VariableForm、PromptItem、HotkeyRow
   （不依赖 store 的）逐个迁入 `shared/ui/components`，两端替换引用。每迁一个跑双端构建+截图对比。
3. **Step 3 adapter 层**：定义 `PromptBackend` 接口（load/save/create/update/delete/output），
   两端各实现；promptStore 改为依赖接口（桌面端 store 保留现有测试，mock 即接口 mock）。
4. **Step 4 表单类组件下沉**：PromptEditor、SpaceEditor、SettingsPanel 分区块下沉
   （设置面板按「通用块 / AI 块（已拆）/ 平台专属块」组合，平台块由各端传入 slot）。

### 验收标准

- 双端 `vue-tsc`/`eslint`/`vitest` 全绿（shared/ui 纳入根检查）。
- 组件级快照或视觉走查：两端与合并前截图对比无可感知差异。
- 新增一个端侧功能（如新设置项）只需在 shared 改一处 + 平台 slot 差异。
