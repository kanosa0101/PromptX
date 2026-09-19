# 产品需求文档 (PRD)：PromptX v1.0 — 实态对齐版

**文档版本**: v3.2
**最后更新**: 2026-09-19（新增 2.9 AI 快捷优化，同步设置/数据模型/API/快捷键章节）
**前序文档**: PRD v1.0 (2026-05-15) → PRD2.0 (2026-05-16 MVP 总结) → PRD3.0 (2026-06-21 初始对齐)
**本次定位**: 基于代码实态重新梳理需求，消除文档与代码的偏差

---

## 1. 产品定位

**PromptX** — 轻量级 AI 提示词管理工具，键盘优先、极速唤醒、变量注入、本地存储。

### 1.1 双端形态

| 维度 | 桌面端 (Tauri 2) | 扩展端 (Chrome MV3) |
|------|-----------------|-------------------|
| 唤醒方式 | 全局快捷键 Alt+Space（可自定义） | 浏览器快捷键 / 点击扩展图标（不可自定义） |
| 交互形态 | 无边框悬浮窗，居中偏上，失去焦点自动隐藏 | Side Panel 侧边栏，常驻 |
| 输出方式 | 写入剪贴板 → 模拟 Ctrl+V → 恢复原剪贴板 | 优先 DOM 插入 → 备选剪贴板写入 |
| 剪贴板来源 | 唤醒前读取系统剪贴板 | 读取当前页面 `window.getSelection()` |
| 数据存储 | 本地 JSON 文件 (`%APPDATA%/PromptX/data.json`) | `chrome.storage.local` |
| 设置范围 | 完整（主题/透明度/热键/自启/防抖/结果数等） | 精简（仅主题+maxResults） |
| 跨应用输出 | ✅ 任意应用 | ❌ 仅当前标签页 |

---

## 2. 功能清单

### 2.1 全局唤醒与窗口管理 ✅

| 功能 | 状态 | 实现方式 |
|------|------|---------|
| Alt+Space 全局唤醒/隐藏 | ✅ | Tauri global-shortcut 插件 |
| 快捷键自定义 | ✅ | 设置面板按键捕获 + `register_hotkey` + `parse_hotkey` |
| 无边框悬浮窗 | ✅ | `decorations: false, transparent: true` |
| 窗口居中偏上 | ✅ | 水平居中，垂直 1/3 处 |
| 窗口位置记忆 | ✅ | `save_window_position` + 启动恢复 |
| 失去焦点自动隐藏 | ✅ | `on_window_event(Focused(false))` |
| 窗口透明度 | ✅ | CSS eval 注入 `document.documentElement.style.opacity` |
| 鼠标拖拽 | ✅ | `data-tauri-drag-region` 顶部 8px 区域 |
| 开机自启 | ✅ | `tauri_plugin_autostart` + 设置面板复选框 |

### 2.2 搜索与导航 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| Fuse.js 模糊搜索 | ✅ | 标题(0.4) + 内容(0.3) + 标签(0.2) + 拼音(0.1) |
| 拼音首字母匹配 | ✅ | `pinyin-pro`，输入 `dj` 匹配"代码" |
| 搜索结果高亮 | ✅ | `highlightMatches()` + XSS 转义 + `v-html`（桌面端+扩展端均已接入） |
| Fuse 实例缓存 | ✅ | 按 `spaceId` 缓存 |
| 搜索防抖 | ✅ | `SearchBar.vue` 使用 `localQuery` + `onInput` 防抖，延迟读自 `settingsStore.searchDebounce`（默认 300ms） |
| 结果数量限制 | ✅ | `filteredPrompts` getter 按 `settingsStore.maxResults`（默认 6）截断 |
| ↑↓ 上下导航 | ✅ | `moveSelection(delta)` |
| Tab / Shift+Tab 切换空间 | ✅ | `nextSpace()` / `prevSpace()` |
| Enter 选中输出 | ✅ | 有自定义变量时弹出表单 |
| Esc 隐藏窗口 | ✅ | `invoke('hide_window')` |
| Ctrl+N/E/D/, | ✅ | 新建/编辑/删除/设置 |
| 点击提示词仅选中 | ✅ | 单击选中高亮，Enter 才触发输出 |

### 2.3 变量注入 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| `{{clipboard}}` | ✅ | 桌面端：唤醒前读取剪贴板；扩展端：读取页面选区 |
| `{{date}}` / `{{time}}` / `{{timestamp}}` | ✅ | 本地时间，timestamp 用秒 |
| 自定义变量 `{{变量名}}` | ✅ | Unicode 支持，弹窗输入，空值时禁用确认按钮 |
| 变量去重 | ✅ | 同名变量只出现一次 |
| 正则安全 | ✅ | split/join 替代 RegExp 构造 |

### 2.4 一键输出 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 写入剪贴板 + 模拟 Ctrl+V | ✅ | `paste_and_restore` (enigo) |
| 原剪贴板恢复 | ✅ | 粘贴后 150ms 恢复原内容 |
| 窗口自动隐藏 | ✅ | 粘贴前 50ms 隐藏窗口 |
| 使用计数更新 | ✅ | `update_prompt_usage` |
| 扩展端 DOM 插入 | ✅ | 支持 input/textarea/contenteditable/iframe |
| 扩展端剪贴板备选 + 恢复 | ✅ | DOM 插入失败时回退 + 500ms 恢复原剪贴板 |

### 2.5 数据管理 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| Prompt CRUD | ✅ | 8 个 Tauri 命令 + 扩展端 store |
| Space CRUD | ✅ | 3 个 Tauri 命令 + 扩展端 store（创建+编辑+删除） |
| Space 删除行为统一 | ✅ | 两端均为：提示词移至默认空间 + 确认提示数量 |
| 默认 3 空间 + 2 示例提示词 | ✅ | |
| JSON 导出/导入 | ✅ | 导出用 `get_app_data`，导入支持 merge=true（覆盖冲突）/ merge=false（跳过冲突） |
| 原子写入 + 备份 + 损坏恢复 | ✅ | temp file + sync_all + rename + backup + fallback |

### 2.6 设置面板 ✅

| 设置项 | 状态 | 说明 |
|-------|------|------|
| 主题 (亮/暗/系统) | ✅ | 含系统主题变化监听 |
| 全局快捷键自定义 | ✅ | 按键捕获 UI + `register_hotkey` |
| 窗口透明度 | ✅ | 滑块 50%-100%，300ms 防抖 |
| 失去焦点自动隐藏 | ✅ | 复选框 |
| 开机自启 | ✅ | 复选框 + autolaunch 插件 |
| 导入导出 | ✅ | 按钮 + 状态提示 |
| AI 快捷优化配置 | ✅ | API Key / 服务地址 / 模型 / 优化指令模板 / 优化快捷键捕获 / 测试连接（失焦自动保存） |
| 使用说明 | ✅ | 跳转 HelpPanel |

**注意**：`searchDebounce` 和 `maxResults` 字段存在于 Settings 类型+store+后端，但设置面板无 UI 控件。用户需通过直接编辑数据文件修改。

### 2.7 Chrome 扩展端 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| Side Panel 打开 | ✅ | 点击图标 / 快捷键 |
| 页面选区读取 | ✅ | `window.getSelection()` via content script |
| 页面文本插入 | ✅ | DOM 操作 + `execCommand`（含弃用说明 + 备选方案文档） |
| 消息发送者验证 | ✅ | `sender.id === chrome.runtime.id` |
| ConfirmDialog | ✅ | 自定义确认对话框，替换原生 `confirm()` |
| 搜索高亮 | ✅ | `highlightMatches()` + `truncate()` + `.highlight-match` CSS |
| VariableForm 空值验证 | ✅ | 空值时禁用确认按钮 |
| AI 快捷优化 | ✅ | `optimize-selection` 命令：content script 捕获选区上下文 → background 调 OpenAI 兼容接口 → 原位替换（含 React 受控组件兼容），徽标反馈进度 |
| 优化结果自动留存 | ✅ | 写入 `space_ai_history`「AI 优化」空间（不存在则自动创建） |

### 2.8 质量保障 ✅

| 项 | 状态 | 说明 |
|----|------|------|
| Rust 单元测试 | ✅ | 22 个 |
| 前端单元测试 | ✅ | 54 个 |
| CI/CD | ✅ | 6 个并行 job |
| ARIA 无障碍 | ✅ | 关键组件添加 role/aria 属性 |

### 2.9 AI 快捷优化 ✅（v3.2 新增）

按快捷键 → 截取选中文本 → 调用 OpenAI 兼容 Chat Completions 优化 → **原位替换**，结果自动存入「AI 优化」历史空间。与静态 SOP 提示词库互补：库管沉淀，AI 管即时。

| 能力 | 桌面端 | 扩展端 |
|------|--------|--------|
| 触发方式 | 全局快捷键（默认 `Ctrl+Alt+O`，设置可改） | `chrome.commands`（默认 `Alt+Shift+O`，浏览器快捷键页可改） |
| 选区截取 | enigo 模拟 Ctrl+C（窗口不显示、焦点不转移） | content script `window.getSelection()` |
| 选区上下文保持 | 不适用（截取后立即使用） | 缓存元素引用 + 选区边界 / contenteditable Range，跨 AI 等待期原位替换 |
| 替换前校验 | 剪贴板无变化/与原内容相同即中止 | input 路径校验原文片段未被改动，不匹配回退复制 |
| AI 请求发起 | 前端 webview fetch（CSP 已放开 `connect-src https:`，Rust 零新增依赖） | background service worker fetch（`host_permissions` http/https） |
| 失败反馈 | 唤起主窗口 + 错误横幅 | 徽标 `!`（红） |
| 成功反馈 | 无打扰（结果即反馈） | 徽标 `✓` / `C`（回退复制）/ `…`（进行中） |
| 结果留存 | Rust 写入 `space_ai_history`（标题=原文前 30 字，标签 `AI优化`） | background 写入 `chrome.storage.local` |
| 默认配置 | DeepSeek `https://api.deepseek.com` + `deepseek-flash`，两端一致 | 同左 |
| 推理模式开关 | 设置可切换（默认关闭=快速；开启=深度思考更慢，请求不再携带 `thinking: disabled`） | 同左 |

**设计要点**：
- 优化指令模板（system prompt）可在设置中自定义，默认模板强约束"只输出提示词本身"；
- 客户端兜底：60s 超时（AbortController）、输入超 12000 字符截断、Markdown 代码块包裹自动剥离、401/403/404/429 分类提示；
- 「唤醒窗口时自动 Ctrl+C」仍维持不做（见第 4 节），本功能的自动截取走**独立的后台快捷键路径**，不显示窗口，不受焦点切换问题影响。

---

## 3. 已知问题与技术债

### 3.1 仍存在的问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| Space 拖拽排序无 UI | 低 | `order` 字段存在但无排序 UI |
| PromptEditor 无草稿保存 | 低 | 意外关闭丢失编辑 |
| `searchDebounce`/`maxResults` 设置面板无 UI 控件 | 低 | 字段存在于类型+store+后端，但用户无法通过 UI 调整 |
| 扩展端 HelpPanel 未实现 | 低 | `uiStore` 有 stub 但无组件 |
| 扩展端 Settings 类型与桌面端不同 | 低 | AI 字段已对齐（v3.2），窗口相关字段仍仅桌面端持有，导入导出时按默认值补齐 |
| 桌面端 `import_data` merge=false 不是"全量替换" | 低 | 实际行为是"跳过冲突保留本地"，PRD P0-4 原始描述"全量替换"未实现 |
| 键盘模拟 (enigo) 初始化失败静默忽略 | 中 | `simulate_paste`/`simulate_cut` 无错误反馈 |
| `paste_and_restore` 依赖硬编码延迟 | 低 | 慢系统上可能不可靠 |
| 扩展端 `saveData()` 非原子操作 | 低 | 中途崩溃可能丢数据 |
| 桌面端 AI 请求依赖服务端 CORS | 低 | AI 请求由 webview fetch 发起，个别自建服务（如 Ollama）需配置允许跨域；如成为问题可引入 Tauri HTTP 插件改为 Rust 侧请求 |
| 推理类模型（deepseek-flash 等）响应较慢 | 低 | 思考过程计入总耗时，60s 超时对长文本可能偏紧 |

### 3.2 已解决的问题（v3.0 → v3.1）

| 问题 | 解决方式 |
|------|---------|
| `showInDock` 死设置 | 前后端均已移除 |
| Space 删除行为不一致 | 两端统一为"移至默认空间" |
| 搜索无防抖 | SearchBar 防抖 + searchDebounce 字段 |
| `import_data` merge 未实现 | merge=true 覆盖冲突，merge=false 跳过冲突 |
| 无 Space 编辑 UI | SpaceEditor 支持编辑模式，SpaceTabs 双击/✎ 触发 |
| 点击提示词直接输出 | 改为仅选中，Enter 才输出 |
| VariableForm 无空值验证 | 桌面端+扩展端均已添加 |
| 扩展端无 ConfirmDialog | 新增组件替换原生 `confirm()` |
| 扩展端无搜索高亮 | App.vue 接入 `highlightMatches` + `truncate` |
| `export_data` 重复 | 已移除，前端改用 `get_app_data` |
| `toggle_window`/`hide_window` 静默吞错误 | 改为返回 `Result<(), String>` |
| `maxResults` 前端未接入 | 类型+store+filteredPrompts 均已补齐 |
| `searchDebounce` 前端未接入 | 类型+store+SearchBar 均已补齐 |

---

## 4. 明确不做的事

| 需求 | 决定 | 原因 |
|------|------|------|
| 剪贴板自动剪切 (唤醒窗口时 Ctrl+C) | ❌ 不做 | 窗口显示会抢焦点，时序无法可靠解决；后台快捷键路径（AI 优化）已实现自动截取 |
| 5 版本历史轮转 | ❌ 不做 | 单备份已满足基本需求 |
| 剪贴板内容类型检测/超长截断 | ❌ 不做 | 仅处理文本，无实际需求 |
| 自动更新 | ❌ v1.0 不做 | 需签名+发布基础设施 |
| 数据加密 | ❌ 不做 | 本地存储威胁模型不成立 |
| 错误上报 | ❌ 不做 | 无服务端基础设施 |
| 安装包签名 | ❌ v1.0 不做 | 需购买证书+配置 CI |
| 多显示器支持 | ❌ 不做 | Tauri 窗口 API 限制 |
| 高对比度/字体缩放 | ❌ 不做 | 依赖系统 WebView |
| AI 快捷优化 | ✅ 已实现 | v3.2 落地，见 2.9 |
| 云端同步 / 团队协作 | ❌ 不做 | v2.0+ |
| E2E/Vue 组件测试 | ❌ 不做 | 项目规模不值得 |
| 替换 `execCommand` | ❌ 不做 | 仍可用，等浏览器真正移除 |

---

## 5. 数据模型（实态）

### Settings（桌面端）

```typescript
interface Settings {
  globalHotkey: string
  theme: 'light' | 'dark' | 'system'
  language: string              // 存在但无 UI，默认 "zh-CN"
  windowOpacity: number         // 0.5 ~ 1.0
  windowPosition: Position | null
  windowSize: Size
  autoHide: boolean
  searchDebounce: number        // 默认 300 (ms)
  maxResults: number            // 默认 6
  launchAtLogin: boolean
  // —— v3.2 新增（Rust 侧 serde default，兼容旧 data.json）——
  aiBaseUrl: string             // 默认 "https://api.deepseek.com"
  aiApiKey: string              // 默认空
  aiModel: string               // 默认 "deepseek-flash"
  optimizeTemplate: string      // 优化指令模板（system prompt）
  optimizeHotkey: string        // AI 优化全局快捷键，默认 "Ctrl+Alt+O"
}
```

### Settings（扩展端）

```typescript
interface Settings {
  theme: 'light' | 'dark' | 'system'
  maxResults: number
  // —— v3.2 新增（loadAppData 合并默认值，兼容旧数据）——
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  optimizeTemplate: string
}
```

### Space / Prompt / Variable / AppData

与 PRD3.0 相同，无变化。

---

## 6. API 清单（实态）

### 6.1 桌面端 Tauri Commands (22 个)

| 命令 | 功能 | 返回类型 |
|------|------|---------|
| `get_app_data` | 获取全部数据（含导出） | `Result<AppData, String>` |
| `get_all_prompts` | 获取提示词列表（可按 spaceId 过滤） | `Result<Vec<Prompt>, String>` |
| `search_prompts` | 按关键词搜索 | `Result<Vec<Prompt>, String>` |
| `create_prompt` | 创建提示词 | `Result<Prompt, String>` |
| `update_prompt` | 部分更新提示词 | `Result<Prompt, String>` |
| `delete_prompt` | 删除提示词 | `Result<(), String>` |
| `update_prompt_usage` | 递增使用计数 | `Result<(), String>` |
| `import_data` | 导入数据（merge=true 覆盖/false 跳过） | `Result<ImportResult, String>` |
| `create_space` | 创建空间 | `Result<Space, String>` |
| `update_space` | 部分更新空间 | `Result<Space, String>` |
| `delete_space` | 删除空间 + 提示词移至默认空间 | `Result<u32, String>` |
| `get_clipboard_text` | 读取系统剪贴板 | `Result<String, String>` |
| `get_wakeup_clipboard` | 获取唤醒时缓存的剪贴板 | `Result<String, String>` |
| `set_clipboard_text` | 写入系统剪贴板 | `Result<(), String>` |
| `paste_to_cursor` | 写入剪贴板 + 隐藏 + 模拟 Ctrl+V | `Result<(), String>` |
| `paste_and_restore` | 同上 + 150ms 后恢复原剪贴板 | `Result<(), String>` |
| `cut_selection` | 模拟 Ctrl+X | `Result<String, String>` |
| `optimize_apply_result` | AI 优化成功后回调：写剪贴板 → 隐藏窗口 → 模拟 Ctrl+V → 恢复原剪贴板 → 存历史 | `Result<(), String>` |
| `optimize_cancel` | AI 优化失败后回调：恢复原剪贴板并结束会话 | `Result<(), String>` |
| `get_settings` | 获取设置 | `Result<Settings, String>` |
| `update_settings` | 全量替换设置 + 应用副作用 | `Result<Settings, String>` |
| `register_hotkey` | 注销旧快捷键 + 注册新快捷键 | `Result<(), String>` |
| `toggle_window` | 显示/隐藏窗口 | `Result<(), String>` |
| `hide_window` | 隐藏窗口 | `Result<(), String>` |
| `save_window_position` | 保存窗口位置 | `Result<(), String>` |

---

## 7. 键盘快捷键

### 桌面端

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space` (可自定义) | 全局唤醒/隐藏 |
| `Ctrl+Alt+O` (可自定义) | 全局 AI 优化选中文本（不显示窗口） |
| `↑` `↓` | 上下切换结果 |
| `Tab` / `Shift+Tab` | 切换/反向切换命名空间 |
| `Enter` | 选中并输出 |
| `Esc` | 隐藏窗口 |
| `Ctrl+N` / `Ctrl+E` / `Ctrl+D` / `Ctrl+,` | 新建/编辑/删除/设置 |

### 扩展端

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space` / `Ctrl+Shift+P` (不可自定义) | 打开 Side Panel |
| `Alt+Shift+O` (浏览器快捷键页可改) | AI 优化选中文本并原位替换 |
| `↑` `↓` / `Tab` / `Enter` | 导航 |
| `Esc` | 清空搜索 |

---

## 8. 性能指标

| 指标 | 目标 | 实测 | 状态 |
|------|------|------|------|
| 启动时间 | < 500ms | ~300ms | ✅ |
| 唤醒延迟 | < 50ms | ~30ms | ✅ |
| 搜索响应 | < 50ms | ~20ms | ✅ |
| 内存占用 | < 50MB | ~35MB | ✅ |
| CPU 占用(空闲) | < 1% | ~0.5% | ✅ |
| 安装包大小 | < 10MB | ~11MB | ⚠️ 略超 |

---

## 9. 版本规划

### v1.1 — 当前（v3.2 文档对齐）

核心功能完成，PRD3.0 所有 P0/P1/P2 待办项均已实现，76 个测试通过。**AI 快捷优化已提前落地**（原规划于 v2.0，见 2.9）：两端快捷键截取选中文本 → OpenAI 兼容接口优化 → 原位替换 → 自动存入「AI 优化」空间。

### v1.2 — 润色

- 设置面板添加 `searchDebounce`/`maxResults` UI 控件
- 扩展端 HelpPanel 组件
- Space 拖拽排序

### v1.5 — 体验增强

- 自动更新 + 安装包签名
- 提示词收藏/置顶
- 使用统计面板
- 多语言 UI (i18n)

### v2.0 — 智能化

- 云端同步（可选）
- AI 优化增强：预览确认模式 / 流式输出 / 多优化风格预设（基础优化已随 v1.1 落地）
- 提示词模板市场
- 团队协作

---

**文档结束**

> PRD3.2 反映截至 2026-09-19 的代码实态（含 AI 快捷优化）。所有"已实现"条目均经代码+构建验证。
