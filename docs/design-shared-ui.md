# 设计方案：桌面端与扩展 UI 层合并（shared/ui）

> 状态：设计方案，未实施。本文是动手前的共识基线。

## 现状

`shared/` 已收敛纯逻辑（类型/AI 客户端/搜索/变量/AI 历史约定），但 UI 层仍双端各维护一份：

| 单元 | 桌面端 | 扩展端 | 差异 |
|------|--------|--------|------|
| SettingsPanel | src/components/SettingsPanel.vue（已拆分） | extension/.../SettingsPanel.vue | 桌面多窗口/热键项；扩展多 maxResults |
| PromptEditor | 204 行 | 117 行 | 标签编辑交互不同 |
| SpaceEditor | 单空间表单 | 空间管理列表 | 结构性差异 |
| ConfirmDialog / VariableForm | 近似 | 近似 | class 体系不同 |
| promptStore | Tauri invoke | chrome.storage + DOM 插入 | 后端完全不同 |
| uiStore / 键盘导航 | 窗口式 | 侧边栏式 | 行为差异（Esc 隐藏窗口 vs 重置搜索） |

## 合并的前置条件（为什么不直接抽组件）

1. **Tailwind token 不统一**：两端 `tailwind.config.js` 自定义色/类名不同
   （如桌面 `bg-background-light`，扩展用字面量色值）。共享组件必须先统一 design token。
2. **后端差异**：store 的 CRUD/输出路径一个是 `invoke()`，一个是 `chrome.storage` + DOM。
   需要一个显式的「平台适配层」而不是 if/else 散落在组件里。

## 目标架构

```
shared/
  ui/
    tokens.css          # 统一 design token（色板/间距），两端 tailwind.config 引用同一份
    components/         # 纯展示组件（ConfirmDialog、VariableForm、HotkeyRow、PromptItem…）
    composables/        # useKeyboardNavigation、useSearch（已有）
src/  &  extension/src/
    adapters/           # 平台适配层（每端一份）
      storage.ts        # loadAppData/saveAppData（invoke | chrome.storage）
      output.ts         # 输出（paste_and_restore | DOM 插入+剪贴板回退）
      window.ts         # 窗口/面板控制（hide window | 仅重置状态）
    stores/             # 薄 store：状态 + 调 adapter（两端各留一个文件，但只有装配代码）
```

## 分步实施（每步独立可发布）

1. **Step 1 token 统一**：把两端用到的色值抽成 `shared/ui/tokens.css` + JS 常量，
   两端 tailwind.config 从此引用。纯视觉回归，无逻辑风险。
2. **Step 2 纯展示组件下沉**：ConfirmDialog、VariableForm、PromptItem、HotkeyRow
   （不依赖 store 的）逐个迁入 `shared/ui/components`，两端替换引用。每迁一个跑双端构建+截图对比。
3. **Step 3 adapter 层**：定义 `PromptBackend` 接口（load/save/create/update/delete/output），
   两端各实现；promptStore 改为依赖接口（桌面端 store 保留现有测试，mock 即接口 mock）。
4. **Step 4 表单类组件下沉**：PromptEditor、SpaceEditor、SettingsPanel 分区块下沉
   （设置面板按「通用块 / AI 块（已拆）/ 平台专属块」组合，平台块由各端传入 slot）。

## 验收标准

- 双端 `vue-tsc`/`eslint`/`vitest` 全绿（shared/ui 纳入根检查）。
- 组件级快照或视觉走查：两端与合并前截图对比无可感知差异。
- 新增一个端侧功能（如新设置项）只需在 shared 改一处 + 平台 slot 差异。
