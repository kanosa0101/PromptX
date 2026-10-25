//! PromptX 应用入口

// Windows 下隐藏控制台窗口
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod models;
mod nm_host;
mod nm_registry;
mod services;
mod utils;

use commands::clipboard::capture_selection_on_wakeup;
use commands::window;
use parking_lot::{Mutex, RwLock};
use services::storage::StorageService;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// 应用状态
pub struct AppState {
    pub storage: Arc<RwLock<StorageService>>,
}

/// 全局快捷键注册状态：(名称, 键, 是否成功)，供前端提示冲突
pub static HOTKEY_STATUS: Mutex<Vec<(String, String, bool)>> = Mutex::new(Vec::new());

fn main() {
    // Native Messaging host 模式：浏览器按注册清单拉起（--nm-host 参数），
    // 纯 stdio 服务，不初始化窗口/插件/单实例（不与主实例冲突）
    if std::env::args().any(|a| a == "--nm-host") {
        std::process::exit(nm_host::run());
    }

    tauri::Builder::default()
        // 单实例保护：重复启动时唤起已有实例的窗口并退出新进程，
        // 避免多个实例抢占全局快捷键（否则快捷键会静默失效）
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            // MacosLauncher 参数仅在 macOS 上生效，其他平台会被 Tauri 忽略
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        // 自动更新：检查/下载/安装由前端触发（设置面板 + 启动后台检查）
        .plugin(tauri_plugin_updater::Builder::new().build())
        // 更新安装完成后重启应用
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // 初始化应用状态（必须在注册快捷键之前）
            let storage = Arc::new(RwLock::new(StorageService::new(app)));

            // 供失焦事件闭包使用（storage 本体将移入 AppState）
            let storage_for_events = storage.clone();

            app.manage(AppState { storage });

            // 窗口在配置中默认不可见，由这里统一决定是否显示：
            // 开机自启带 --hidden 参数 → 仅驻留后台（快捷键唤出），避免登录时弹窗
            if let Some(window) = app.get_webview_window("main") {
                if !std::env::args().any(|a| a == "--hidden") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            // 旧版本兼容：把 data.json 中的明文 API Key 迁移到系统钥匙串
            // （仅钥匙串可用的平台生效；迁移后 data.json 不再含明文 key）
            {
                let state = app.state::<AppState>();
                let storage = state.storage.write();
                if let Ok(mut data) = storage.load() {
                    if crate::services::secret::migrate_plaintext_key(
                        &mut data,
                        &crate::services::secret::keychain(),
                    ) {
                        eprintln!("已将明文 API Key 迁移到系统钥匙串");
                        let _ = storage.save(data);
                    }
                }
            }

            // 按设置注册全部全局快捷键（窗口呼出 + AI 优化）
            let app_handle = app.handle().clone();
            apply_shortcuts(&app_handle);

            // 监听窗口失去焦点事件：按 autoHide 设置决定是否隐藏（隐藏后异步保存位置）
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                let app_for_events = app_handle.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        // 窗口已不可见 = 焦点丢失是「隐藏」的副作用：
                        // 各隐藏路径（hide_window 命令/快捷键）已自行保存位置，跳过避免双重全量保存
                        if !window_clone.is_visible().unwrap_or(false) {
                            return;
                        }
                        let auto_hide = storage_for_events
                            .read()
                            .load_arc()
                            .map(|d| d.settings.auto_hide)
                            .unwrap_or(true);
                        if auto_hide {
                            // 先隐藏（用户无感延迟），再在后台线程保存位置：
                            // 保存含双 fsync，在事件循环线程执行会阻塞整个 UI
                            window_clone.hide().unwrap_or_default();
                            let app_bg = app_for_events.clone();
                            std::thread::spawn(move || {
                                window::save_position(&app_bg);
                            });
                        }
                    }
                });
            }

            // 启动时应用保存的设置
            let state = app_handle.state::<AppState>();
            let storage_read = state.storage.read();
            if let Ok(data) = storage_read.load() {
                // 应用窗口透明度
                window::apply_opacity(&app_handle, data.settings.window_opacity);

                // 同步开机自启状态
                if data.settings.launch_at_login {
                    let _ = app_handle.autolaunch().enable();
                } else {
                    let _ = app_handle.autolaunch().disable();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 提示词管理
            commands::prompt::get_app_data,
            commands::prompt::create_prompt,
            commands::prompt::update_prompt,
            commands::prompt::delete_prompt,
            commands::prompt::update_prompt_usage,
            commands::prompt::import_data,
            // 空间管理
            commands::space::create_space,
            commands::space::update_space,
            commands::space::delete_space,
            commands::space::reorder_spaces,
            // 剪贴板
            commands::clipboard::get_wakeup_clipboard,
            commands::clipboard::paste_and_restore,
            // AI 优化
            commands::ai::optimize_apply_result,
            commands::ai::optimize_cancel,
            commands::ai::ai_debug_log,
            commands::ai::clipboard_optimize_apply_result,
            commands::ai::clipboard_optimize_cancel,
            // 设置
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::register_hotkey,
            commands::settings::get_hotkey_status,
            // 窗口
            commands::window::hide_window,
            commands::window::show_window,
            // 浏览器扩展同步（Native Messaging）
            commands::nm::get_nm_status,
            commands::nm::set_nm_sync,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 按当前设置注册全部全局快捷键（先注销已有注册）
/// setup 启动与 update_settings 保存后共用
pub fn apply_shortcuts(app: &tauri::AppHandle) {
    use commands::settings::parse_hotkey;

    let (global_hotkey, optimize_hotkey, clipboard_hotkey) = {
        let state = app.state::<AppState>();
        let storage = state.storage.read();
        match storage.load() {
            Ok(data) => (
                data.settings.global_hotkey.clone(),
                data.settings.optimize_hotkey.clone(),
                data.settings.clipboard_optimize_hotkey.clone(),
            ),
            Err(_) => (
                "Alt+Space".to_string(),
                "Ctrl+Alt+O".to_string(),
                "Ctrl+Shift+B".to_string(),
            ),
        }
    };

    // 先注销全部已注册快捷键，避免残留旧绑定
    let _ = app.global_shortcut().unregister_all();
    let mut status: Vec<(String, String, bool)> = Vec::new();

    // 窗口呼出快捷键
    match parse_hotkey(&global_hotkey) {
        Ok(shortcut) => {
            let result = app
                .global_shortcut()
                .on_shortcut(shortcut, |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // 切换窗口显示/隐藏（带剪贴板捕获）
                        toggle_window_with_clipboard_capture(app);
                    }
                });
            let ok = result.is_ok();
            match result {
                Ok(()) => eprintln!("已注册窗口快捷键: {}", global_hotkey),
                Err(e) => eprintln!("注册窗口快捷键 {} 失败: {}", global_hotkey, e),
            }
            status.push(("窗口呼出".to_string(), global_hotkey.clone(), ok));
        }
        Err(_) => status.push(("窗口呼出".to_string(), global_hotkey.clone(), false)),
    }

    // AI 优化快捷键（后台全自动流程：截取选中文本 → 前端调 AI → 贴回原位，不显示窗口）
    // 关键：监听松开（Released）而非按下 —— 若在按下瞬间模拟 Ctrl+C，用户手指
    // 仍按着 Ctrl/Shift，目标应用实际收到 Ctrl+Shift+C，复制会静默失败
    if let Ok(shortcut) = parse_hotkey(&optimize_hotkey) {
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Released {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        commands::ai::capture_selection_for_optimize(app).await;
                    });
                }
            });
        let ok = result.is_ok();
        match result {
            Ok(()) => eprintln!("已注册 AI 优化快捷键: {} (松开触发)", optimize_hotkey),
            Err(e) => eprintln!("注册 AI 优化快捷键 {} 失败: {}", optimize_hotkey, e),
        }
        status.push(("AI 优化".to_string(), optimize_hotkey.clone(), ok));
    }

    // 剪贴板优化快捷键（不模拟按键：优化剪贴板内容并写回，适用于终端等选区不可靠场景）
    if let Ok(shortcut) = parse_hotkey(&clipboard_hotkey) {
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Released {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        commands::ai::capture_clipboard_for_optimize(app).await;
                    });
                }
            });
        let ok = result.is_ok();
        match result {
            Ok(()) => eprintln!("已注册剪贴板优化快捷键: {} (松开触发)", clipboard_hotkey),
            Err(e) => eprintln!("注册剪贴板优化快捷键 {} 失败: {}", clipboard_hotkey, e),
        }
        status.push(("剪贴板优化".to_string(), clipboard_hotkey.clone(), ok));
    }

    *HOTKEY_STATUS.lock() = status;
}

/// 切换窗口显示/隐藏（带剪贴板捕获，用于快捷键回调）
/// 关键：在窗口显示前执行复制，此时焦点仍在原窗口
pub fn toggle_window_with_clipboard_capture(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            // 窗口已显示 → 隐藏（先隐藏，位置后台保存；失焦处理器见窗口已隐藏会跳过）
            window.hide().unwrap_or_default();
            let app_bg = app.clone();
            tauri::async_runtime::spawn_blocking(move || {
                window::save_position(&app_bg);
            });
        } else {
            // 窗口隐藏 → 显示窗口
            // 关键步骤：在窗口显示前捕获选中内容
            capture_selection_on_wakeup(app);

            // 恢复保存的位置（显示器已断开时自动居中），无保存位置则居中
            let state = app.state::<AppState>();
            window::restore_window_position(&window, &state);

            // 显示窗口并获取焦点
            window.show().unwrap_or_default();
            window.set_focus().unwrap_or_default();
        }
    }
}
