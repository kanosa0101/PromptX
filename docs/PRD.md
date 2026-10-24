# 产品需求文档（PRD）：PromptX

**文档版本**: v4.0（三版合并版）
**对齐应用版本**: v1.2.0（2026-10-24）
**文档历史**: v1.0 初版规划（2026-05-15）→ v2.0 MVP 总结（2026-05-16）→ v3.x 实态对齐（2026-06 ~ 09）→ v4.0 合并为单份文档并对齐 v1.2.0

> 本文是产品唯一 PRD：既有规划（用户/价值/边界）也有实态对齐（功能/数据/API 均经代码验证）。
> 历史版本（PRD v1.0 / 2.0 / 3.x）已并入本文，不再单独保留。

---

## 1. 产品概述

### 1.1 定位

**PromptX** —— 轻量级 AI 提示词管理工具：键盘优先、极速唤醒、变量注入、AI 快捷优化、纯本地存储。桌面端（Windows）+ Chrome 扩展双形态，共享同一套核心逻辑（`shared/`：类型 / AI 客户端 / 搜索 / 变量解析 / AI 历史约定 / 确认对话框 / 空间选项）。

### 1.2 核心价值

- **极速**：全局快捷键随时唤出，秒级找到并输出提示词，不打断心流
- **模板化**：`{{变量}}` 注入剪贴板/日期/自定义值，提示词从「复制粘贴的文本」升级为「可参数化的模板」
- **AI 原位优化**：选中文本一键 AI 润色并贴回原位，与静态提示词库互补——库管沉淀，AI 管即时
- **本地与隐私**：数据纯本地存储，API Key 存系统钥匙串，无云端、无遥测

### 1.3 目标用户

| 画像 | 场景 |
|------|------|
| AI 应用开发者 / 研究人员 | 高频复用调试、评估、代码解释类提示词，跨 IDE/终端/浏览器输出 |
| 内容创作者 / 译员 | 翻译、改写、风格化模板，参数化批量生产 |
| 键盘流效率爱好者 | 拒绝鼠标，快捷键完成检索与输出 |

### 1.4 双端形态

| 维度 | 桌面端（Tauri 2） | 扩展端（Chrome MV3） |
|------|------------------|---------------------|
| 唤醒方式 | 全局快捷键（默认 Alt+Space，可自定义） | 浏览器快捷键 / 点击图标（浏览器侧管理） |
| 交互形态 | 无边框悬浮窗，居中偏上，失焦自动隐藏 | Side Panel 侧边栏，常驻 |
| 输出方式 | 写剪贴板 → 模拟 Ctrl+V → 恢复原剪贴板 | 优先 DOM 插入 → 失败回退剪贴板 |
| `{{clipboard}}` 来源 | 唤醒前读取系统剪贴板 | 当前页面选区 |
| 数据存储 | 本地 JSON（`%APPDATA%/PromptX/data.json`，原子写 + 备份 + 损坏自愈） | `chrome.storage.local`（跨上下文原子读写） |
| 设置范围 | 完整（主题/透明度/热键×3/自启/AI 等） | 主题 / 结果数 / AI 配置 |
| 跨应用输出 | ✅ 任意应用 | ❌ 仅当前标签页 |

---

## 2. 功能清单（实态，v1.2.0）

### 2.1 全局唤醒与窗口管理 ✅

| 功能 | 说明 |
|------|------|
| 全局快捷键唤醒/隐藏 | global-shortcut 插件；按键捕获 UI + 严格解析校验 |
| 无边框透明悬浮窗 | 居中偏上；顶部拖拽区 |
| 窗口位置记忆 | 隐藏前保存；恢复时校验目标显示器仍连接，失效自动居中（防拔显示器后窗口跑到屏幕外） |
| 失焦自动隐藏 | 按 `autoHide` 设置决定 |
| 窗口透明度 | 滑块 50%–100%，防抖应用 |
| 开机自启 | `--hidden` 参数静默驻留后台（登录不弹窗），快捷键唤出 |

### 2.2 搜索与导航 ✅

| 功能 | 说明 |
|------|------|
| Fuse.js 模糊搜索 | 标题(0.4) + 内容(0.3) + 标签(0.2) |
| 拼音匹配 | `pinyin-pro` 首字母 / 全拼；索引按对象缓存，跨按键复用 |
| 高亮 | XSS 转义后插入高亮 span（双端共用，含测试覆盖） |
| 索引缓存 | Fuse 实例按列表引用失效，逐键搜索不重建索引 |
| 列表排序 | 默认创建时间倒序（最新在前）；搜索时按相关度 |
| 键盘导航 | ↑↓ 选择、Tab/Shift+Tab 切空间、Enter 输出、Esc 逐层关闭面板/隐藏窗口、Ctrl+N/E/D/, |
| 搜索防抖 / 结果数 | `searchDebounce`（300ms）/ `maxResults`（6），⚠️ 桌面端暂无 UI 控件 |

### 2.3 变量注入 ✅

| 功能 | 说明 |
|------|------|
| 系统变量 | `{{clipboard}}` `{{date}}` `{{time}}` `{{timestamp}}`（本地时间，秒级时间戳） |
| 自定义变量 | Unicode 变量名（含中文），弹窗填写，空值禁用确认 |
| 去重与安全 | 同名去重；split/join 替换避免正则注入 |

### 2.4 一键输出 ✅

| 功能 | 说明 |
|------|------|
| 剪贴板 + 模拟粘贴 | `paste_and_restore`（enigo），窗口自动隐藏 |
| 原剪贴板恢复 | 粘贴后 500ms 恢复（慢速应用可靠读取） |
| 使用计数 | 每次输出递增并持久化（双端） |
| 扩展端 DOM 插入 | input/textarea/contenteditable/iframe；React 受控组件兼容；失败回退剪贴板 |

### 2.5 数据管理 ✅

| 功能 | 说明 |
|------|------|
| Prompt / Space CRUD | 空间删除时提示词移至默认空间（双端一致） |
| JSON 导出/导入 | merge=true 覆盖冲突 / false 跳过 |
| 原子写入 | 临时文件 + fsync + rename；备份同步原子化 |
| 损坏自愈 | 主文件损坏 → 备份恢复；双损坏 → 隔离 `.corrupt` 后回退默认数据 |
| 内存缓存 | 全部读写经缓存，磁盘 IO 只发生在保存；11 个数据命令异步执行（不卡 UI） |

### 2.6 设置面板 ✅（双端各有）

主题 / 全局快捷键 / AI 优化快捷键 / 剪贴板优化快捷键（桌面端）；主题 / 结果数（扩展端）；
透明度 / 失焦隐藏 / 开机自启 / 导入导出（桌面端）；AI 配置双端一致：API Key / 服务地址 / 模型 /
深度思考开关 / 优化模板（留空=默认，可「填入默认/恢复默认」）/ 测试连接（401/404/429 等分类提示）。

### 2.7 Chrome 扩展端 ✅

| 功能 | 说明 |
|------|------|
| Side Panel | 图标 / 快捷键打开；⚙ 设置入口（AI 配置） |
| 页面选区 | content script 捕获选区与可编辑上下文 |
| 原位替换 | 跨 AI 等待期保持选区边界；替换前校验原文未变 |
| 消息安全 | `sender.id === chrome.runtime.id` 校验 |
| 跨上下文存储 | 写队列 + Web Locks 互斥（background ↔ sidepanel 读改写原子化，不丢数据） |
| 失败通知 | AI 失败弹系统通知展示原因；徽标反馈进度（…/✓/C/!） |
| 主题记忆 | 打开侧边栏即应用已存主题（含跟随系统） |

### 2.8 AI 快捷优化 ✅（两种模式）

选中文本 → AI 优化 → **原位替换**，结果自动存入「AI 优化」历史空间（上限 200 条，超出清最旧）。

| 能力 | 选区替换模式 | 剪贴板模式 |
|------|-------------|-----------|
| 触发 | 全局快捷键（默认 `Ctrl+Alt+O`） | 全局快捷键（默认 `Ctrl+Shift+B`） |
| 输入 | enigo 模拟 Ctrl+C 截取（窗口不显示、焦点不转移；哨兵判定防陈旧剪贴板） | 直接读剪贴板 |
| 输出 | 模拟 Ctrl+V 贴回原位（恢复截取时刻焦点窗口），恢复原剪贴板 | 优化结果写回剪贴板，用户自行粘贴 |
| 适用 | 编辑器/文档等可选区场景 | 终端/自绘界面等选区不可靠场景 |
| 扩展端 | `Alt+Shift+O`：选区原位替换（等价选区模式） | —（浏览器内无此场景） |

**共性设计**：
- OpenAI 兼容 Chat Completions；默认 DeepSeek（`https://api.deepseek.com` / `deepseek-flash`），任意兼容服务可配
- 60s 超时（AbortController）、超时/网络/5xx/429 自动重试一次；用户取消立即中止且不重试、不报错
- 桌面端优化进行中主窗口显示进度条 + 取消按钮，完成有成功提示
- 桌面端 API Key 存 Windows 凭据管理器（`data.json` 不落明文，旧数据自动迁移）；扩展端存 `chrome.storage.local`
- 输入超 12000 字符截断；Markdown 代码块包裹自动剥离；深度思考开关（关闭时请求 `thinking: disabled`）
- 并发防护：进行中重复触发直接忽略（双端）

### 2.9 质量保障 ✅

| 项 | 说明 |
|----|------|
| 测试 | 118 个前端（搜索/高亮转义/变量/AI 客户端含取消/store 契约）+ 35 个 Rust（热键解析/存储原子性与损坏恢复/密钥存取/历史清理） |
| CI | 8 个 job：双端 lint/typecheck/test/build + clippy -D warnings + rustfmt + macOS 编译 |
| 发布 | 推 `v*` 标签自动构建 NSIS/MSI/扩展 zip 并发布 Release |
| 安全 | CodeQL 每周扫描；API Key 钥匙串存储；CSP 收敛 |

---

## 3. 数据模型（实态）

### Settings（桌面端）

```typescript
interface Settings {
  globalHotkey: string            // 默认 "Alt+Space"
  optimizeHotkey: string          // AI 选区优化，默认 "Ctrl+Alt+O"
  clipboardOptimizeHotkey: string // AI 剪贴板优化，默认 "Ctrl+Shift+B"
  theme: 'light' | 'dark' | 'system'
  language: string                // 存在但无 UI，默认 "zh-CN"
  windowOpacity: number           // 0.5 ~ 1.0
  windowPosition: Position | null
  windowSize: Size
  autoHide: boolean
  searchDebounce: number          // 默认 300ms
  maxResults: number              // 默认 6
  launchAtLogin: boolean
  aiBaseUrl: string               // 默认 "https://api.deepseek.com"
  aiApiKey: string                // 运行时由钥匙串附加，data.json 不落明文
  aiModel: string                 // 默认 "deepseek-flash"
  optimizeTemplate: string        // 空 = 使用内置默认（单源维护在 shared/types.ts）
  optimizeThinking: boolean       // 深度思考开关
}
```

### Settings（扩展端）

`theme` / `maxResults` + AI 五字段（与桌面端语义一致，存 `chrome.storage.local`）。

### Space / Prompt / Variable

`Space { id, name, icon, color, order, createdAt, updatedAt }`；
`Prompt { id, title, content, tags, spaceId, variables, usageCount, lastUsedAt, createdAt, updatedAt }`；
`Variable { name, type: 'system'|'custom', defaultValue? }`。
空间图标/颜色选项双端共用（`shared/spaceOptions.ts`）。

---

## 4. API 清单（桌面端 Tauri Commands，23 个）

| 分组 | 命令 |
|------|------|
| 提示词（6） | `get_app_data` `create_prompt` `update_prompt` `delete_prompt` `update_prompt_usage` `import_data` |
| 空间（3） | `create_space` `update_space` `delete_space` |
| 剪贴板（2） | `get_wakeup_clipboard` `paste_and_restore` |
| AI 优化（5） | `optimize_apply_result` `optimize_cancel` `clipboard_optimize_apply_result` `clipboard_optimize_cancel` `ai_debug_log` |
| 设置（4） | `get_settings` `update_settings` `register_hotkey` `get_hotkey_status` |
| 窗口（3） | `toggle_window` `hide_window` `show_window` |

数据类命令均为 async（脱离主线程执行）；存储经内存缓存，写路径原子化。

---

## 5. 键盘快捷键

### 桌面端

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space`（可自定义） | 全局唤醒/隐藏 |
| `Ctrl+Alt+O`（可自定义） | AI 优化选中文本并原位替换 |
| `Ctrl+Shift+B`（可自定义） | AI 优化剪贴板内容并写回 |
| `↑` `↓` / `Tab` `Shift+Tab` | 导航 / 切换空间 |
| `Enter` / `Esc` | 输出 / 逐层关闭面板（无面板时隐藏窗口） |
| `Ctrl+N/E/D/,` | 新建 / 编辑 / 删除 / 设置 |

### 扩展端

| 快捷键 | 功能 |
|--------|------|
| `Alt+Space` / `Ctrl+Shift+P`（浏览器快捷键页可改） | 打开 Side Panel |
| `Alt+Shift+O` | AI 优化选中文本并原位替换 |
| `↑` `↓` / `Tab` / `Enter` / `Esc` | 导航 / 清空搜索 |

---

## 6. 性能指标

| 指标 | 目标 | 实测（v1.2.0） | 状态 |
|------|------|---------------|------|
| 启动时间 | < 500ms | ~300ms | ✅ |
| 唤醒延迟 | < 50ms | ~30ms | ✅ |
| 搜索响应 | < 50ms | ~20ms（索引缓存后逐键无重建） | ✅ |
| 内存占用 | < 50MB | ~35MB | ✅ |
| 安装包 | < 10MB | NSIS 2.8MB / MSI 4.1MB | ✅ |

---

## 7. 已知问题与边界

### 7.1 已知问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| `searchDebounce`/`maxResults` 桌面端无 UI 控件 | 低 | 扩展端有 maxResults 控件但列表截断未生效 |
| Space 拖拽排序无 UI | 低 | `order` 字段存在 |
| PromptEditor 无草稿保存 | 低 | 意外关闭丢失编辑 |
| 扩展端 HelpPanel 未实现 | 低 | uiStore 有 stub 无组件 |
| 扩展安装提示较宽 | 低 | 键盘触发的页面注入需全域 host 权限，无法用 activeTab 替代（有意取舍） |
| 桌面端 AI 请求依赖服务端 CORS | 低 | webview 发起；如自建服务（Ollama 等）受限可改走 Rust 侧请求 |
| 推理模型响应慢 | 低 | 思考计入 60s 超时，长文本可能偏紧 |

### 7.2 明确不做的事

| 需求 | 决定 | 原因 |
|------|------|------|
| 唤醒窗口时自动 Ctrl+C | ❌ | 窗口显示抢焦点，时序不可靠；自动截取已由独立后台快捷键路径实现 |
| 多版本历史轮转 | ❌ | 单备份 + 损坏自愈已满足 |
| 自动更新 / 安装包签名 | ❌ 暂缓 | 需证书与发布基础设施 |
| 数据加密 / 错误上报 | ❌ | 本地威胁模型不成立 / 无服务端 |
| E2E / 组件快照测试 | ❌ | 项目规模不值得 |
| 替换 `execCommand`（扩展插入） | ❌ | 仍可用，等浏览器真正移除 |
| 云端同步 / 团队协作 | ❌ v2.0+ | 见版本规划 |

---

## 8. 版本规划

- **v1.2.0（当前）**：全面复查修复（自启静默、剪贴板恢复时序、并发防护、跨上下文存储原子化等）、AI 优化进度与取消、发布与安全扫描自动化
- **v1.3 润色**：设置面板补 `searchDebounce`/`maxResults` 控件并使扩展端生效；扩展 HelpPanel；Space 排序 UI；PromptEditor 草稿
- **v1.5 体验增强**：自动更新 + 签名；提示词收藏/置顶；使用统计；i18n
- **v2.0 智能化与打通**：双端数据打通（Native Messaging）与 UI 层合并（见 [design.md](design.md)）；优化预览确认 / 流式输出 / 多风格预设；模板市场；云端同步（可选）

---

**文档结束**

> 本文反映截至 2026-10-24 的代码实态（应用 v1.2.0）。所有"已实现"条目均经代码 + 构建 + 测试验证。
