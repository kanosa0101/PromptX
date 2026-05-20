# PromptX

[中文](#中文) | [English](#english)

---

<a name="中文"></a>

## 中文

轻量级 AI 提示词管理工具，专为 AI 开发者和研究人员设计。

### 特性

- **极速唤醒** - Alt+Space 全局快捷键，延迟 < 50ms
- **键盘优先** - 全程键盘操作，无需鼠标
- **动态变量** - 支持 `{{clipboard}}`, `{{date}}`, `{{time}}`, `{{timestamp}}` 等系统变量
- **命名空间** - 分类管理提示词，Tab 快速切换
- **模糊搜索** - 拼音首字母匹配，输入 "dj" 找到"代码解释"
- **本地存储** - 数据不上云，隐私安全

### 安装

#### Windows

下载 `promptx.exe` 直接运行，或运行安装包。

#### 从源码构建

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建
npm run tauri:build
```

### 使用流程

```
┌─────────────────────────────────────────────────────────────┐
│                      PromptX 使用流程                         │
├─────────────────────────────────────────────────────────────┤
│  1. 准备内容: 在编辑器中选中文字 → Ctrl+C 复制                │
│                                                             │
│  2. 唤醒: Alt + Space → 窗口居中弹出                         │
│                                                             │
│  3. 搜索: 输入关键词或拼音 (如 "dj" → "代码解释")             │
│                                                             │
│  4. 选择: ↑↓ 键浏览，Tab 切换空间                            │
│                                                             │
│  5. 输出: Enter → 内容粘贴到光标位置，窗口自动隐藏            │
└─────────────────────────────────────────────────────────────┘
```

### 快捷键

| 操作 | 快捷键 |
|------|--------|
| 呼出/隐藏 | Alt+Space |
| 上下选择 | ↑ ↓ |
| 切换空间 | Tab |
| 确认输出 | Enter |
| 关闭窗口 | Esc |
| 新建提示词 | Ctrl+N |
| 编辑提示词 | Ctrl+E |
| 删除提示词 | Ctrl+D |
| 打开设置 | Ctrl+, |

### 变量语法

**系统变量** (自动填充):
```
请解释以下代码：{{clipboard}}
今天是：{{date}}
当前时间：{{time}}
时间戳：{{timestamp}}
```

**自定义变量** (弹窗输入):
```
翻译为{{目标语言}}语言
请用{{风格}}的风格重写以下内容
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Tauri | 2.x |
| 前端 | Vue 3 | 3.4+ |
| 构建 | Vite | 5.x |
| 样式 | Tailwind CSS | 3.x |
| 状态 | Pinia | 2.x |
| 搜索 | Fuse.js + pinyin-pro | - |
| 后端 | Rust | 1.70+ |

### 项目结构

```
PromptX/
├── src/                    # Vue 前端
│   ├── components/         # UI 组件
│   ├── stores/             # Pinia 状态管理
│   ├── composables/        # 组合函数
│   ├── types/              # TypeScript 类型
│   └── styles/             # 全局样式
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── commands/       # Tauri 命令
│   │   ├── services/       # 业务服务
│   │   ├── models/         # 数据模型
│   │   └── utils/          # 工具函数
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                   # 文档
├── package.json
├── vite.config.ts
└── eslint.config.js
```

### 数据存储

- Windows: `%APPDATA%/PromptX/data.json`
- macOS: `~/Library/Application Support/PromptX/data.json`
- Linux: `~/.config/promptx/data.json`

### 开发命令

```bash
npm run dev          # 前端开发
npm run tauri:dev    # Tauri 开发 (带热更新)
npm run build        # 前端构建
npm run tauri:build  # Tauri 构建
npm run lint         # ESLint 检查
```

### 文档

- [docs/PRD.md](docs/PRD.md) - 产品需求文档
- [docs/PRD2.0.md](docs/PRD2.0.md) - MVP 实现总结

---

<a name="english"></a>

## English

A lightweight AI prompt management tool designed for AI developers and researchers.

### Features

- **Instant Activation** - Alt+Space global hotkey with < 50ms latency
- **Keyboard First** - Full keyboard operation, no mouse needed
- **Dynamic Variables** - Supports `{{clipboard}}`, `{{date}}`, `{{time}}`, `{{timestamp}}` and custom variables
- **Workspaces** - Organize prompts by category, switch with Tab key
- **Fuzzy Search** - Pinyin matching, type "dj" to find "代码解释" (Code Explanation)
- **Local Storage** - Data stays local, privacy protected

### Installation

#### Windows

Download and run `promptx.exe`, or use the installer package.

#### Build from Source

```bash
# Install dependencies
npm install

# Development mode
npm run tauri:dev

# Build
npm run tauri:build
```

### Usage Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      PromptX Workflow                        │
├─────────────────────────────────────────────────────────────┤
│  1. Prepare: Select text in editor → Ctrl+C to copy          │
│                                                             │
│  2. Activate: Alt + Space → Window pops up centered          │
│                                                             │
│  3. Search: Enter keyword or pinyin (e.g., "dj")             │
│                                                             │
│  4. Select: ↑↓ to browse, Tab to switch workspace            │
│                                                             │
│  5. Output: Enter → Paste to cursor, window auto-hides       │
└─────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Window | Alt+Space |
| Navigate | ↑ ↓ |
| Switch Workspace | Tab |
| Confirm Output | Enter |
| Close Window | Esc |
| New Prompt | Ctrl+N |
| Edit Prompt | Ctrl+E |
| Delete Prompt | Ctrl+D |
| Open Settings | Ctrl+, |

### Variable Syntax

**System Variables** (auto-filled):
```
Explain this code: {{clipboard}}
Today is: {{date}}
Current time: {{time}}
Timestamp: {{timestamp}}
```

**Custom Variables** (popup input):
```
Translate to {{language}}
Rewrite in {{style}} style
```

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Tauri | 2.x |
| Frontend | Vue 3 | 3.4+ |
| Build | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| State | Pinia | 2.x |
| Search | Fuse.js + pinyin-pro | - |
| Backend | Rust | 1.70+ |

### Project Structure

```
PromptX/
├── src/                    # Vue frontend
│   ├── components/         # UI components
│   ├── stores/             # Pinia state management
│   ├── composables/        # Composition functions
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri commands
│   │   ├── services/       # Business services
│   │   ├── models/         # Data models
│   │   └── utils/          # Utility functions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                   # Documentation
├── package.json
├── vite.config.ts
└── eslint.config.js
```

### Data Storage

- Windows: `%APPDATA%/PromptX/data.json`
- macOS: `~/Library/Application Support/PromptX/data.json`
- Linux: `~/.config/promptx/data.json`

### Development Commands

```bash
npm run dev          # Frontend dev server
npm run tauri:dev    # Tauri dev (with HMR)
npm run build        # Frontend build
npm run tauri:build  # Tauri build
npm run lint         # ESLint check
```

### Documentation

- [docs/PRD.md](docs/PRD.md) - Product Requirements Document
- [docs/PRD2.0.md](docs/PRD2.0.md) - MVP Implementation Summary

---

## License

MIT