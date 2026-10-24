# 从源码构建 / 参与开发

面向开发者的文档。用户安装请看 [README](../README.md)。

## 环境要求

- Node.js 20+ 与 npm
- Rust 1.70+（含 cargo）
- Windows 构建（桌面端）：WebView2（Windows 10/11 自带）

## 目录结构

```
PromptX/
├── shared/                 # 双端共享代码（类型/AI 客户端/搜索/变量/AI 历史/确认对话框/空间选项）
├── src/                    # 桌面端 Vue 前端（Tauri webview）
│   ├── components/         # UI 组件
│   ├── stores/             # Pinia 状态管理
│   ├── composables/        # 组合函数
│   └── types/              # 桌面端类型（Settings 等）
├── src-tauri/              # Rust 后端
│   ├── src/commands/       # Tauri 命令（提示词/空间/剪贴板/AI 优化/设置/窗口）
│   ├── src/services/       # 存储服务、密钥安全存储
│   ├── src/models/         # 数据模型
│   └── src/utils/          # 变量解析、Win32 焦点工具
├── extension/              # 浏览器扩展（MV3，独立 npm 工作区）
│   ├── src/background/     # Service Worker（快捷键 + AI 优化编排）
│   ├── src/content/        # 内容脚本（选区捕获与原位替换）
│   └── src/sidepanel/      # 侧边栏（Vue + Pinia）
└── docs/                   # 文档（PRD、设计方案、开发指南）
```

图标源文件在 `assets/`（`app-icon.png` 为 1024 源图）。重新生成全套图标：
`npx tauri icon assets/app-icon.png`（会重建 android/ios 等当前未使用的尺寸，可按需删除）。

## 常用命令

```bash
npm install            # 安装桌面端依赖

npm run tauri:dev      # 桌面端开发模式（带热更新）
npm run tauri:build    # 构建桌面端安装包（输出 src-tauri/target/release/bundle/）

npm run lint           # ESLint（含扩展源码）
npm run typecheck      # vue-tsc 类型检查
npm test               # Vitest 单元测试

cd extension           # 浏览器扩展（独立工作区）
npm install
npm run dev            # watch 模式构建
npm run build          # 构建到 extension/dist/，浏览器加载该目录
npm run typecheck      # 扩展类型检查
```

## 架构速览

```
桌面端：Vue(webview) ──invoke/events──► Rust(Tauri) ──► data.json + 凭据管理器
                │
                └── AI 请求由 webview 发起（OpenAI 兼容协议，shared/ai.ts）

扩展端：sidepanel(Vue) ──chrome.storage──► 本地数据
                │
                └── background 发起 AI 请求；content script 负责选区捕获/替换
```

- 桌面端与扩展端当前无运行时通信（方案见 [design.md](design.md)）
- `shared/` 通过 `@shared/*` 别名被两端共同引用，是逻辑层的单一来源
- Rust 侧不引入 HTTP 依赖，AI 调用全部在前端/Service Worker 完成

## 质量门槛（CI 全覆盖）

- 前端：ESLint、vue-tsc、Vitest、vite build
- 扩展：vue-tsc、vite build
- Rust：cargo fmt --check、cargo clippy -D warnings、cargo test（ubuntu + macos）

提交前建议本地跑一遍：`npm run lint && npm run typecheck && npm test`，以及 `cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test`。

## 打 Release

发布已自动化（`.github/workflows/release.yml`）：

1. 更新版本号：根 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`（同步 `Cargo.lock`）、`extension/package.json`、`extension/manifest.json`、`CHANGELOG.md`
2. 提交并打标签：`git tag v<版本号> && git push origin v<版本号>`
3. CI 自动构建 Windows 安装包（NSIS/MSI）与扩展 zip，并创建 GitHub Release 上传产物

仓库另有 CodeQL 安全扫描（`.github/workflows/security.yml`，每周一与代码变更时运行）。
