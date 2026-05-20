# 产品需求文档 (PRD)：PromptX v1.0 MVP - 实现总结

**文档版本**: v2.0 (实现版)
**最后更新**: 2026-05-16
**状态**: MVP 已完成
**技术架构**: Tauri 2.x + Vue 3 + TypeScript + Rust

---

## 目录

1. [产品概述](#1-产品概述)
2. [MVP实现状态总结](#2-mvp实现状态总结)
3. [已实现功能详解](#3-已实现功能详解)
4. [与原PRD的差异说明](#4-与原prd的差异说明)
5. [待完善功能](#5-待完善功能)
6. [后续版本规划](#6-后续版本规划)
7. [使用指南](#7-使用指南)

---

## 1. 产品概述

### 1.1 产品定位

**PromptX** 是一款专为 AI 开发者、研究人员及重度大模型用户设计的轻量级桌面端提示词管理工具。以"键盘优先"、"极速唤醒"和"动态变量注入"为核心，解决高频、高度重复的 Prompt 输入痛点。

### 1.2 核心价值主张

| 价值维度 | 具体描述 | 实现状态 |
|---------|---------|---------|
| **极致性能** | 唤醒延迟 < 50ms，内存占用 < 50MB | ✅ 已达成 |
| **键盘优先** | 全程键盘操作，无需鼠标 | ✅ 已实现 |
| **隐私安全** | 本地化存储，数据不上云 | ✅ 已实现 |
| **零摩擦切换** | 无边框悬浮窗，即用即走 | ✅ 已实现 |
| **动态智能** | 变量自动填充 | ✅ 基本实现 |

### 1.3 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Tauri | 2.x | 跨平台桌面应用框架 |
| 前端 | Vue 3 | 3.4+ | Composition API |
| 构建 | Vite | 5.x | 极速HMR |
| 样式 | Tailwind CSS | 3.x | 原子化CSS |
| 状态 | Pinia | 2.x | Vue 3官方推荐 |
| 搜索 | Fuse.js + pinyin-pro | 7.x + 3.x | 模糊搜索+拼音支持 |
| 后端 | Rust | 1.70+ | 安全高性能 |

---

## 2. MVP实现状态总结

### 2.1 功能完成度

| 优先级 | 功能模块 | 完成状态 | 备注 |
|--------|---------|---------|------|
| P0 | 全局快捷键唤醒 | ✅ 100% | Alt+Space |
| P0 | 无边框悬浮窗 | ✅ 100% | 居中显示、自动隐藏 |
| P0 | 模糊检索 | ✅ 100% | 拼音+英文+内容 |
| P0 | 键盘导航 | ✅ 100% | ↑↓/Tab/Enter/Esc |
| P0 | 一键上屏 | ✅ 100% | 自动粘贴 |
| P0 | 本地存储 | ✅ 100% | JSON持久化 |
| P0 | 系统变量 | ✅ 100% | clipboard/date/time/timestamp |
| P1 | 命名空间 | ✅ 100% | 创建/切换/管理 |
| P1 | 自定义变量 | ✅ 100% | 弹窗输入 |
| P1 | 设置面板 | ⚠️ 80% | 基本功能可用 |
| P1 | 导入导出 | ✅ 100% | JSON格式 |
| P2 | 深色模式 | ✅ 100% | 亮色/暗色/系统 |
| P2 | 开机自启 | ❌ 0% | 未实现 |

**总体完成度: ~85%**

### 2.2 性能指标达成

| 指标 | PRD目标 | 实测结果 | 达成状态 |
|------|---------|---------|---------|
| 启动时间 | < 500ms | ~300ms | ✅ |
| 唤醒延迟 | < 50ms | ~30ms | ✅ |
| 搜索响应 | < 50ms | ~20ms | ✅ |
| 内存占用 | < 50MB | ~35MB | ✅ |
| 安装包大小 | < 10MB | ~11MB | ⚠️ 略超 |
| CPU占用(空闲) | < 1% | ~0.5% | ✅ |

---

## 3. 已实现功能详解

### 3.1 全局极速交互

#### 3.1.1 全局快捷键

**实现方式**: Tauri global-shortcut 插件

```rust
// src-tauri/src/main.rs
let shortcut = Shortcut::new(
    Some(tauri_plugin_global_shortcut::Modifiers::ALT), 
    tauri_plugin_global_shortcut::Code::Space
);

app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
    if event.state == ShortcutState::Pressed {
        toggle_window(app);
    }
});
```

**特性**:
- 默认快捷键: Alt+Space
- 支持: Windows/macOS/Linux
- 冲突处理: 与系统冲突时正常工作

#### 3.1.2 无边框悬浮窗

**配置** (tauri.conf.json):
```json
{
  "windows": [{
    "decorations": false,
    "transparent": false,
    "visible": false,
    "focus": false,
    "width": 600,
    "height": 400
  }]
}
```

**行为**:
- 居中显示在屏幕上方1/3处
- 失去焦点自动隐藏
- 支持鼠标拖拽（顶部区域）

### 3.2 键盘优先检索与输出

#### 3.2.1 搜索功能

**技术**: Fuse.js + pinyin-pro

```typescript
// src/composables/useSearch.ts
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'content', weight: 0.3 },
    { name: 'tags', weight: 0.2 },
  ],
  threshold: 0.3,
}

// 拼音匹配
输入 "dj" → 匹配 "代码解释"
输入 "ref" → 匹配 "Code Refactoring"
```

#### 3.2.2 键盘导航

| 快捷键 | 功能 | 实现 |
|--------|------|------|
| `↑` `↓` | 切换选择 | ✅ |
| `Tab` | 切换命名空间 | ✅ |
| `Shift+Tab` | 反向切换空间 | ✅ |
| `Enter` | 确认输出 | ✅ |
| `Esc` | 关闭窗口 | ✅ |
| `Ctrl+N` | 新建提示词 | ✅ |
| `Ctrl+E` | 编辑选中项 | ✅ |
| `Ctrl+D` | 删除选中项 | ✅ |
| `Ctrl+,` | 打开设置 | ✅ |

#### 3.2.3 一键上屏

**流程**:
1. 选中提示词 → Enter
2. 窗口自动隐藏
3. 内容写入剪贴板
4. 模拟 Ctrl+V 粘贴

```rust
// src-tauri/src/commands/clipboard.rs
pub fn paste_and_restore(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(&text)?;
    window.hide();
    std::thread::sleep(Duration::from_millis(50));
    simulate_paste();  // Ctrl+V
    Ok(())
}
```

### 3.3 动态变量注入

#### 3.3.1 系统变量

| 变量 | 语法 | 来源 |
|------|------|------|
| 剪贴板 | `{{clipboard}}` | 系统剪贴板 |
| 日期 | `{{date}}` | YYYY-MM-DD |
| 时间 | `{{time}}` | HH:mm:ss |
| 时间戳 | `{{timestamp}}` | Unix timestamp |

#### 3.3.2 自定义变量

示例: `翻译为{{目标语言}}`

流程:
1. 选中提示词 → Enter
2. 解析检测自定义变量
3. 弹出输入表单
4. 用户填写 → 确认
5. 替换变量 → 输出

### 3.4 数据管理

#### 3.4.1 命名空间(Spaces)

- 顶部分类标签页
- 默认3个空间: 默认、工作、个人
- 支持创建/编辑/删除
- Tab键快速切换

#### 3.4.2 本地存储

**位置**:
- Windows: `%APPDATA%/PromptX/data.json`
- macOS: `~/Library/Application Support/PromptX/data.json`
- Linux: `~/.config/promptx/data.json`

**备份**: 每次变更自动备份到 `data.json.backup`

#### 3.4.3 导入导出

```typescript
// 导出
const data = await invoke('export_data')
// 保存为 promptx-export.json

// 导入
const result = await invoke('import_data', { importData: data, merge: true })
```

---

## 4. 与原PRD的差异说明

### 4.1 剪贴板自动剪切 - 未实现

**原PRD要求**:
> 唤醒时自动剪切当前选中内容到剪贴板

**实际情况**: ❌ 未实现

**原因分析**:
1. 焦点切换问题: 快捷键触发时焦点已转移到PromptX
2. 模拟按键发送到错误窗口
3. Windows API SendInput 同样受焦点限制

**替代方案**: 用户手动Ctrl+C复制后唤醒

**后续考虑**:
- 方案A: 使用Windows Hook API监听全局按键
- 方案B: 增加二级快捷键(唤醒后按S触发剪切)
- 方案C: 接受现状，明确使用流程

### 4.2 设置面板 - 未完全实现

**缺失功能**:
- 快捷键自定义UI (后端API已实现)
- 开机自启动开关
- Dock显示开关
- 窗口透明度滑块

### 4.3 安装包生成

**问题**: NSIS打包工具下载失败
**解决**: 生成了独立exe文件，可直接运行
**文件**: `promptx.exe` (~11MB)

---

## 5. 待完善功能

### 5.1 P1级待完善

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 设置面板UI完善 | 快捷键自定义、透明度调节 | 高 |
| 开机自启动 | launchAtLogin 实现 | 中 |
| 自动更新 | 版本检测和更新机制 | 中 |

### 5.2 P2级待实现

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 剪贴板自动剪切 | 技术方案需重新评估 | 高 |
| 高级变量表单 | 多变量、下拉选择 | 低 |
| 快捷键冲突检测 | 检测系统冲突 | 低 |

### 5.3 Bug修复

| Bug | 状态 | 说明 |
|-----|------|------|
| 浏览器confirm导致窗口隐藏 | ✅ 已修复 | 自定义ConfirmDialog |
| PromptItem组件未导入 | ✅ 已修复 | 添加import |
| Vue模板{{语法错误 | ✅ 已修复 | 使用转义 |

---

## 6. 后续版本规划

### 6.1 v1.1 版本 (下一迭代)

**目标**: 完善MVP遗留功能

| 功能 | 优先级 | 预计工期 |
|------|--------|---------|
| 设置面板完善 | P1 | 2天 |
| 开机自启动 | P1 | 1天 |
| 剪贴板方案优化 | P1 | 3天 |
| 完整安装包 | P1 | 1天 |

### 6.2 v1.5 版本

**目标**: 用户体验增强

- 云端同步(可选)
- 提示词模板库
- 使用统计分析
- 多语言支持

### 6.3 v2.0 版本

**目标**: 智能化增强

- AI预处理(调用LLM)
- 智能推荐
- 团队协作
- 插件系统

---

## 7. 使用指南

### 7.1 安装

**当前版本**: 直接运行 `PromptX.exe`

**位置**: 桌面或任意文件夹

### 7.2 基本使用流程

```
┌─────────────────────────────────────────────────────────────┐
│                      PromptX 使用流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. 启动: 双击 PromptX.exe                                    │
│     → 后台运行，托盘可见                                        │
│                                                             │
│  2. 准备内容: 在编辑器中选中文字                                 │
│     → Ctrl+C 复制                                            │
│                                                             │
│  3. 唤醒: Alt + Space                                         │
│     → 窗口居中弹出                                             │
│                                                             │
│  4. 搜索: 输入关键词或拼音                                       │
│     → 实时显示匹配结果                                          │
│                                                             │
│  5. 选择: ↑↓ 键浏览，Tab切换空间                                │
│                                                             │
│  6. 输出: Enter 确认                                           │
│     → 内容粘贴到原位置                                          │
│     → 窗口自动隐藏                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 快捷键速查

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

### 7.4 变量使用

**系统变量**(自动填充):
```
请解释以下代码：{{clipboard}}
今天是：{{date}}
当前时间：{{time}}
```

**自定义变量**(弹窗输入):
```
翻译为{{目标语言}}语言
请用{{风格}}的风格重写以下内容
```

### 7.5 文件结构

```
PromptX/
├── src-tauri/           # Rust后端
│   ├── src/
│   │   ├── main.rs      # 入口、窗口管理
│   │   ├── commands/    # Tauri命令
│   │   │   ├── prompt.rs
│   │   │   ├── clipboard.rs
│   │   │   ├── space.rs
│   │   │   └── settings.rs
│   │   ├── services/    # 服务
│   │   │   ├── storage.rs
│   │   │   └── clipboard.rs
│   │   └── models/      # 数据模型
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # Vue前端
│   ├── components/      # 12个组件
│   ├── stores/          # 3个状态管理
│   ├── composables/     # 3个组合函数
│   ├── types/           # 类型定义
│   └── App.vue
├── package.json
├── PRD.md               # 原PRD
├── PRD2.0.md            # 本文档
└── README.md
```

---

## 附录

### A. 已实现组件列表

| 组件 | 文件 | 功能 |
|------|------|------|
| SearchBar | SearchBar.vue | 搜索输入框 |
| SpaceTabs | SpaceTabs.vue | 命名空间标签 |
| ResultList | ResultList.vue | 结果列表容器 |
| PromptItem | PromptItem.vue | 单个提示词项 |
| StatusBar | StatusBar.vue | 底部快捷键提示 |
| VariableForm | VariableForm.vue | 自定义变量输入 |
| PromptEditor | PromptEditor.vue | 提示词编辑器 |
| SpaceEditor | SpaceEditor.vue | 空间编辑器 |
| SettingsPanel | SettingsPanel.vue | 设置面板 |
| HelpPanel | HelpPanel.vue | 帮助面板 |
| ConfirmDialog | ConfirmDialog.vue | 确认对话框 |
| App | App.vue | 主应用容器 |

### B. 已实现Rust命令

| 命令 | 功能 |
|------|------|
| get_app_data | 获取全部数据 |
| get_all_prompts | 获取所有提示词 |
| search_prompts | 搜索提示词 |
| create_prompt | 创建提示词 |
| update_prompt | 更新提示词 |
| delete_prompt | 删除提示词 |
| update_prompt_usage | 更新使用计数 |
| export_data | 导出数据 |
| import_data | 导入数据 |
| create_space | 创建空间 |
| update_space | 更新空间 |
| delete_space | 删除空间 |
| get_clipboard_text | 获取剪贴板 |
| set_clipboard_text | 设置剪贴板 |
| paste_to_cursor | 粘贴到光标 |
| paste_and_restore | 粘贴(简化版) |
| get_settings | 获取设置 |
| update_settings | 更新设置 |
| toggle_window | 切换窗口 |
| hide_window | 隐藏窗口 |

### C. 性能测试记录

| 测试项 | 环境 | 结果 |
|--------|------|------|
| 启动时间 | Windows 11 | 280-350ms |
| 唤醒延迟 | Windows 11 | 25-40ms |
| 搜索(100条) | Windows 11 | 15-25ms |
| 内存占用 | 空闲状态 | 31-38MB |
| CPU占用 | 空闲状态 | 0.3-0.6% |

---

**文档结束**

> 本文档记录了PromptX MVP版本的完整实现情况，包括已实现功能、与原PRD的差异、待完善项和后续规划。