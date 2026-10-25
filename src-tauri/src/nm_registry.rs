//! Native Messaging 主机注册（Windows：HKCU 注册表 + 主机清单文件）
//!
//! 启用「浏览器扩展同步」时由设置命令调用：写清单 JSON 到应用数据目录、
//! 在 HKCU 的 Chrome / Edge NativeMessagingHosts 下登记清单路径
//! （HKCU 无需管理员权限）。卸载/停用时删除登记。

use std::path::Path;

/// 写入主机清单文件并登记注册表（Chrome + Edge）
#[cfg(windows)]
pub fn apply_registration(
    exe_path: &str,
    extension_id: &str,
    data_dir: &Path,
) -> Result<(), String> {
    let manifest = serde_json::json!({
        "name": crate::nm_host::NM_HOST_NAME,
        "description": "PromptX 桌面端数据同步",
        "path": exe_path,
        "type": "stdio",
        "allowed_origins": [format!("chrome-extension://{extension_id}/")],
    });
    let manifest_path = data_dir.join(format!("{}.json", crate::nm_host::NM_HOST_NAME));
    std::fs::write(
        &manifest_path,
        serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("清单文件写入失败: {e}"))?;

    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    for subkey in [
        r"Software\Google\Chrome\NativeMessagingHosts",
        r"Software\Microsoft\Edge\NativeMessagingHosts",
    ] {
        let (key, _) = hkcu
            .create_subkey(subkey)
            .map_err(|e| format!("注册表打开失败（{subkey}）: {e}"))?;
        key.set_value(
            crate::nm_host::NM_HOST_NAME,
            &manifest_path.to_string_lossy().to_string(),
        )
        .map_err(|e| format!("注册表写入失败（{subkey}）: {e}"))?;
    }
    Ok(())
}

/// 删除注册表登记与清单文件（不存在的项静默跳过）
#[cfg(windows)]
pub fn remove_registration(data_dir: &Path) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_WRITE};
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    for subkey in [
        r"Software\Google\Chrome\NativeMessagingHosts",
        r"Software\Microsoft\Edge\NativeMessagingHosts",
    ] {
        if let Ok(key) = hkcu.open_subkey_with_flags(subkey, KEY_WRITE) {
            let _ = key.delete_value(crate::nm_host::NM_HOST_NAME);
        }
    }
    let manifest_path = data_dir.join(format!("{}.json", crate::nm_host::NM_HOST_NAME));
    let _ = std::fs::remove_file(manifest_path);
    Ok(())
}

/// 当前已登记的扩展 ID（读清单的 allowed_origins[0] 反解）；未注册返回 None
#[cfg(windows)]
pub fn registered_extension_id(data_dir: &Path) -> Option<String> {
    let manifest_path = data_dir.join(format!("{}.json", crate::nm_host::NM_HOST_NAME));
    let content = std::fs::read_to_string(manifest_path).ok()?;
    let manifest: serde_json::Value = serde_json::from_str(&content).ok()?;
    let origin = manifest.get("allowed_origins")?.get(0)?.as_str()?;
    origin
        .strip_prefix("chrome-extension://")
        .map(|rest| rest.trim_end_matches('/').to_string())
}

#[cfg(not(windows))]
pub fn apply_registration(
    _exe_path: &str,
    _extension_id: &str,
    _data_dir: &Path,
) -> Result<(), String> {
    Err("浏览器扩展同步目前仅支持 Windows".to_string())
}

#[cfg(not(windows))]
pub fn remove_registration(_data_dir: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn registered_extension_id(_data_dir: &Path) -> Option<String> {
    None
}
