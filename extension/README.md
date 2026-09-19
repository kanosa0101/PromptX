# PromptX 浏览器插件版

基于 Chrome Side Panel 的 AI 提示词剪贴板管理工具。

## 功能

- **自动获取选区**: 直接获取页面选中文本，无需手动复制
- **AI 快捷优化**: 快捷键截取选中文本，AI 优化后原位替换（支持 ChatGPT 等富文本编辑器）
- **模糊搜索**: 支持拼音首字母/完整拼音匹配
- **变量注入**: {{clipboard}}/{{date}}/{{time}} 自动填充
- **命名空间**: 分类管理提示词，优化结果自动存入「AI 优化」空间
- **一键输出**: 直接插入到页面输入框

## 安装

### 开发模式

```bash
cd extension
npm install
npm run build
```

然后在 Chrome 中:
1. 打开 `chrome://extensions/`
2. 启用 "开发者模式"
3. 点击 "加载已解压的扩展程序"
4. 选择 `extension/dist` 目录

### 使用

1. 在任意页面选中文字
2. 点击扩展图标或按 `Alt+Space` 打开 Side Panel
3. 搜索选择提示词
4. 按 Enter 输出到页面

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 打开 Side Panel | Alt+Space |
| AI 优化选中文本 | Alt+Shift+O |
| 上下选择 | ↑ ↓ |
| 切换空间 | Tab |
| 确认输出 | Enter |
| 新建提示词 | Ctrl+N |

## AI 快捷优化

在网页输入框中选中文本（如 AI 对话框里的提示词草稿），按 `Alt+Shift+O`，自动完成：截取选区 → 调用 AI 优化 → 原位替换，结果同时存入「AI 优化」空间。

1. **配置**: 打开 Side Panel → 设置 → 「AI 快捷优化」→ 填写 API Key、服务地址与模型（默认预置 DeepSeek，兼容任何 OpenAI 协议服务），点击「测试连接」验证
2. **使用**: 选中文本 → `Alt+Shift+O`（可在 chrome://extensions/shortcuts 修改）
3. **反馈**: 扩展图标徽标实时显示状态 — `…` 优化中 / `✓` 已替换 / `C` 已复制到剪贴板 / `!` 失败

> 在不可编辑区域（普通网页文本）选中文本时，优化结果会复制到剪贴板而非原位替换；优化指令模板可在设置中自定义。

## 变量语法

```
请解释以下代码：{{clipboard}}
今天是：{{date}}
当前时间：{{time}}
翻译为{{目标语言}}  (自定义变量，弹窗输入)
```

## 图标

请将以下图标文件放入 `public/icons/` 目录:
- icon16.png (16x16)
- icon32.png (32x32)
- icon48.png (48x48)
- icon128.png (128x128)

可使用在线图标生成工具如 https://favicon.io/emoji-favicons/

## 与 Tauri 版对比

| 功能 | Tauri 版 | 浏览器插件版 |
|------|---------|-------------|
| 获取选中内容 | ❌ 需手动 Ctrl+C | ✅ 直接获取 |
| 快捷键唤醒 | ✅ 全局生效 | ⚠️ 仅浏览器内 |
| 跨应用使用 | ✅ VS Code/终端 | ❌ 仅浏览器 |
| 安装方式 | ⚠️ 下载 exe | ✅ 插件商店 |

## 技术栈

- Chrome Extension Manifest V3
- Vue 3 + Pinia
- TypeScript
- Fuse.js + pinyin-pro
- Tailwind CSS