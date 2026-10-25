# PromptX

<p align="center"><img src="assets/app-icon.png" width="110" alt="PromptX"></p>

轻量、本地、键盘优先的 AI 提示词管理工具。全局快捷键一键唤起，搜索即达，回车即贴；
还能把选中的任意文本一键交给 AI 优化并原位替换。

![Windows](https://img.shields.io/badge/platform-Windows-blue) ![License](https://img.shields.io/badge/license-MIT-green) [![Releases](https://img.shields.io/badge/download-Releases-orange)](https://github.com/kanosa0101/PromptX/releases)

## 下载安装

### 桌面端（Windows）

1. 打开 [Releases 页面](https://github.com/kanosa0101/PromptX/releases)，下载最新版的 `PromptX_x64-setup.exe`（或 `PromptX_x64_en-US.msi`）
2. 双击运行安装，完成后按 `Alt+Space` 即可唤起

> v1.3.0 起支持应用内自动更新：设置（Ctrl+,）→ 「软件更新」即可检查并升级，无需重新下载安装包。

### 浏览器扩展（Chrome / Edge）

1. 在 Releases 页面下载 `promptx-extension.zip` 并解压
2. 打开浏览器扩展管理页（Chrome 地址栏输入 `chrome://extensions`，Edge 输入 `edge://extensions`）
3. 打开右上角「开发者模式」，点击「加载已解压的扩展程序」，选择解压出的文件夹
4. 点击工具栏 PromptX 图标，即可在侧边栏使用

> 扩展与桌面端数据相互独立，可单独使用；用「导出/导入数据」功能可以在两端之间迁移提示词。

## 快速上手

```
1. 唤起     任意界面按 Alt+Space
2. 搜索     输入关键词或拼音首字母（输入 "daima" 或 "dm" 找到「代码解释」）
3. 输出     ↑↓ 选中，Enter 粘贴到光标位置，窗口自动隐藏
```

- 第一次使用按 `Ctrl+N` 新建你自己的提示词
- `Tab` 切换空间（默认/工作/个人…），空间可在设置里管理
- 复制过内容后，含 `{{clipboard}}` 变量的提示词会自动带上剪贴板内容

## AI 快捷优化

选中任意应用里的文本，一个快捷键完成「截取 → AI 优化 → 原位替换」，全程无窗口打断：

| 模式 | 快捷键 | 适用场景 |
|------|--------|----------|
| 选区优化 | `Ctrl+Alt+O` | 普通应用（编辑器、聊天框、网页输入框） |
| 剪贴板优化 | `Ctrl+Shift+B` | 终端、选区不可靠的应用：先复制，再按快捷键，优化结果写回剪贴板 |

**配置**：`Ctrl+,` 打开设置 → 「AI 快捷优化」→ 填入 API Key、服务地址与模型 → 点击「测试连接」。
默认预置 DeepSeek（[获取 API Key](https://platform.deepseek.com)），也兼容任何 OpenAI 协议的服务（如 OpenAI、Moonshot、本地 Ollama 等）。

优化结果自动保存到「AI 优化」空间，随时可搜索复用；快捷键和优化指令模板均可在设置中自定义。

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 呼出 / 隐藏 | `Alt+Space`（可修改） |
| AI 优化选中文本 | `Ctrl+Alt+O`（可修改） |
| AI 优化剪贴板内容 | `Ctrl+Shift+B`（可修改） |
| 上下选择 | `↑` `↓` |
| 切换空间 | `Tab` / `Shift+Tab` |
| 确认输出 | `Enter` |
| 新建 / 编辑 / 删除提示词 | `Ctrl+N` / `Ctrl+E` / `Ctrl+D` |
| 打开设置 | `Ctrl+,` |
| 关闭窗口 | `Esc` |

## 变量语法

提示词内容中支持变量占位，输出时自动填充：

```
请解释以下代码：{{clipboard}}      ← 自动填入复制的内容
今天是：{{date}}                   ← 当前日期
当前时间：{{time}}                 ← 当前时间
翻译为{{目标语言}}语言              ← 自定义变量，输出前弹窗询问
```

## 数据与隐私

- **全部本地存储**：提示词与设置保存在本机 `%APPDATA%\com.promptx.app\data.json`，不上传任何服务器
- **API Key 安全存储**（桌面端）：AI 服务的 API Key 保存在 Windows 凭据管理器中，数据文件里没有明文密钥
- **备份**：设置 → 导出数据，生成 JSON 文件，可在另一台电脑或浏览器扩展中导入
- **浏览器扩展**：数据仅存于本浏览器的扩展存储中

## 常见问题

**按 Alt+Space 没反应？**
可能被其他软件占用了该快捷键。打开设置（Ctrl+,）把「全局快捷键」改成其他组合；若提示注册失败，说明新组合也被占用。

**在终端里 Ctrl+Alt+O 提示"未截取到选中文本"？**
终端中 Ctrl+C 是中断信号，无法复制选区。改用剪贴板模式：先复制内容，按 `Ctrl+Shift+B`，优化结果会写回剪贴板，直接粘贴即可。

**AI 优化报错？**
打开设置点击「测试连接」：401/403 说明 API Key 不对；404 通常是服务地址少了 `/v1`；其他报错信息里会给出具体提示。

**开机没有自动启动？**
在设置中打开「开机自启动」；若被系统清理软件禁用，请在对应软件中放行。

## 更多文档

- [更新日志](CHANGELOG.md)
- [English README](docs/README.en.md)
- [从源码构建 / 参与开发](docs/DEVELOPMENT.md)
- 产品需求文档：[PRD](docs/PRD.md)
- 未实施方案：[双端数据打通 / UI 层合并](docs/design.md)

## License

[MIT](LICENSE)
