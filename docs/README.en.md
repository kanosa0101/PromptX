# PromptX (English)

<p align="center"><img src="../assets/app-icon.png" width="110" alt="PromptX"></p>

A lightweight, local-first, keyboard-driven AI prompt manager for Windows. Summon it with a global hotkey, search, and paste anywhere — plus one-hotkey AI optimization of any selected text.

## Install

### Desktop (Windows)

Download `PromptX_1.1.0_x64-setup.exe` from the [Releases page](https://github.com/kanosa0101/PromptX/releases) and run the installer. Press `Alt+Space` to summon.

### Browser Extension (Chrome / Edge)

1. Download and unzip `promptx-extension.zip` from Releases
2. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**
3. Click **Load unpacked** and select the unzipped folder

> The extension keeps its own local data; use Export/Import to move prompts between desktop and extension.

## Quick Start

1. **Summon** — `Alt+Space` anywhere
2. **Search** — type keywords or pinyin initials (`"dm"` finds 代码解释 / code explanation)
3. **Output** — `↑`/`↓` to select, `Enter` to paste at the cursor; the window hides itself

Press `Ctrl+N` to create your first prompt. `Tab` switches workspaces.

## AI Quick Optimize

| Mode | Hotkey | Use case |
|------|--------|----------|
| Selection optimize | `Ctrl+Alt+O` | Normal apps (editors, chat boxes) |
| Clipboard optimize | `Ctrl+Shift+B` | Terminals and apps where selection copy is unreliable: copy first, press the hotkey, the optimized text is written back to the clipboard |

Configure under Settings (`Ctrl+,`) → "AI Quick Optimize": API Key, Base URL and model. DeepSeek is preconfigured; any OpenAI-compatible service works. Results are saved to a dedicated "AI Optimize" space.

## Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle window | `Alt+Space` (configurable) |
| AI optimize selection | `Ctrl+Alt+O` (configurable) |
| AI optimize clipboard | `Ctrl+Shift+B` (configurable) |
| Navigate / switch space | `↑` `↓` / `Tab` |
| Confirm output | `Enter` |
| New / edit / delete prompt | `Ctrl+N` / `Ctrl+E` / `Ctrl+D` |
| Settings | `Ctrl+,` |
| Close | `Esc` |

## Variables

`{{clipboard}}` (auto-filled with copied text), `{{date}}`, `{{time}}`, `{{timestamp}}`, and custom variables like `{{language}}` (asked via popup before output).

## Privacy

- All data stays local (`%APPDATA%\com.promptx.app\data.json`); nothing is uploaded
- The desktop app stores your API Key in Windows Credential Manager — no plaintext key in data files
- Use Settings → Export data for backup and cross-device migration

## More

- [Changelog](../CHANGELOG.md) · [Development guide](DEVELOPMENT.md) · [中文 README](../README.md)
- MIT License
