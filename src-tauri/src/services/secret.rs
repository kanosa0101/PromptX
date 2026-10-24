//! AI API Key 的安全存储
//!
//! Windows：写入系统凭据管理器（Credential Manager），data.json 不再落盘明文。
//! 其他平台暂保持随 data.json 明文存储（应用当前仅正式支持 Windows；
//! macOS/Linux 支持落地时在此接入对应后端即可，命令层无需改动）。
//!
//! 兼容迁移策略：旧版本 data.json 中的明文 key 在启动时与保存设置时
//! 自动挪入钥匙串并从 data.json 清除；钥匙串不可用时优雅回退为原行为。

/// API Key 存取抽象（便于测试注入内存实现）
pub trait ApiKeyStore: Send + Sync {
    fn save(&self, key: &str) -> Result<(), String>;
    /// Ok(None) 表示钥匙串中没有存储值
    fn load(&self) -> Result<Option<String>, String>;
    fn delete(&self) -> Result<(), String>;
}

#[cfg(target_os = "windows")]
const SERVICE: &str = "PromptX";
#[cfg(target_os = "windows")]
const USER: &str = "ai_api_key";

/// Windows 凭据管理器实现
#[cfg(target_os = "windows")]
pub struct OsKeychainStore;

#[cfg(target_os = "windows")]
impl ApiKeyStore for OsKeychainStore {
    fn save(&self, key: &str) -> Result<(), String> {
        keyring::Entry::new(SERVICE, USER)
            .and_then(|e| e.set_password(key))
            .map_err(|e| e.to_string())
    }

    fn load(&self) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new(SERVICE, USER).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    fn delete(&self) -> Result<(), String> {
        let entry = keyring::Entry::new(SERVICE, USER).map_err(|e| e.to_string())?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

/// 非 Windows 占位实现：所有写操作失败 → 命令层回退为明文随 data.json 存储
#[cfg(not(target_os = "windows"))]
pub struct OsKeychainStore;

#[cfg(not(target_os = "windows"))]
impl ApiKeyStore for OsKeychainStore {
    fn save(&self, _key: &str) -> Result<(), String> {
        Err("当前平台未接入系统钥匙串".to_string())
    }

    fn load(&self) -> Result<Option<String>, String> {
        Ok(None)
    }

    fn delete(&self) -> Result<(), String> {
        Err("当前平台未接入系统钥匙串".to_string())
    }
}

/// 系统钥匙串实例
pub fn keychain() -> OsKeychainStore {
    OsKeychainStore
}

/// update_settings 路径：把明文 key 从 Settings 中剥离到钥匙串。
/// 成功后返回的 Settings 中 key 字段为空（持久化用）；
/// 钥匙串不可用时原样返回（回退为随 data.json 明文存储）。
pub fn stash_api_key(
    mut settings: crate::models::Settings,
    store: &dyn ApiKeyStore,
) -> crate::models::Settings {
    if settings.ai_api_key.is_empty() {
        // 用户清空了 key：同步删除钥匙串中的旧值（失败不影响）
        let _ = store.delete();
        return settings;
    }
    match store.save(&settings.ai_api_key) {
        Ok(()) => {
            settings.ai_api_key = String::new();
            settings
        }
        Err(_) => settings,
    }
}

/// get_settings 路径：把钥匙串中的 key 附加到返回值给前端。
/// 钥匙串无值/不可用时保留 data.json 中的值（可能是旧版明文遗留，
/// 将在下次保存设置时由 stash_api_key 完成迁移）。
pub fn attach_api_key(
    mut settings: crate::models::Settings,
    store: &dyn ApiKeyStore,
) -> crate::models::Settings {
    match store.load() {
        Ok(Some(key)) if !key.is_empty() => {
            settings.ai_api_key = key;
            settings
        }
        _ => settings,
    }
}

/// 启动迁移：把旧版 data.json 中的明文 key 挪入钥匙串并清空落盘值。
/// 钥匙串不可用时保持原状。返回 true 表示发生了迁移（用于日志）。
pub fn migrate_plaintext_key(data: &mut crate::models::AppData, store: &dyn ApiKeyStore) -> bool {
    if data.settings.ai_api_key.is_empty() {
        return false;
    }
    if store.save(&data.settings.ai_api_key).is_ok() {
        data.settings.ai_api_key = String::new();
        return true;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Settings;
    use std::sync::Mutex;

    /// 内存实现（可注入故障）
    struct MemStore {
        value: Mutex<Option<String>>,
        fail: bool,
    }

    impl MemStore {
        fn new() -> Self {
            MemStore {
                value: Mutex::new(None),
                fail: false,
            }
        }
        fn failing() -> Self {
            MemStore {
                value: Mutex::new(None),
                fail: true,
            }
        }
    }

    impl ApiKeyStore for MemStore {
        fn save(&self, key: &str) -> Result<(), String> {
            if self.fail {
                return Err("unavailable".to_string());
            }
            *self.value.lock().unwrap() = Some(key.to_string());
            Ok(())
        }
        fn load(&self) -> Result<Option<String>, String> {
            if self.fail {
                return Err("unavailable".to_string());
            }
            Ok(self.value.lock().unwrap().clone())
        }
        fn delete(&self) -> Result<(), String> {
            if self.fail {
                return Err("unavailable".to_string());
            }
            *self.value.lock().unwrap() = None;
            Ok(())
        }
    }

    fn settings_with_key(key: &str) -> Settings {
        Settings {
            ai_api_key: key.to_string(),
            ..Settings::default()
        }
    }

    #[test]
    fn test_stash_saves_to_keychain_and_clears_field() {
        let store = MemStore::new();
        let stashed = stash_api_key(settings_with_key("sk-123"), &store);
        assert!(stashed.ai_api_key.is_empty(), "持久化的 key 字段应清空");
        assert_eq!(store.load().unwrap(), Some("sk-123".to_string()));
    }

    #[test]
    fn test_stash_falls_back_to_plaintext_when_unavailable() {
        let store = MemStore::failing();
        let stashed = stash_api_key(settings_with_key("sk-123"), &store);
        assert_eq!(stashed.ai_api_key, "sk-123", "钥匙串不可用时应保留明文");
    }

    #[test]
    fn test_stash_empty_key_deletes_existing() {
        let store = MemStore::new();
        store.save("sk-old").unwrap();
        let stashed = stash_api_key(settings_with_key(""), &store);
        assert!(stashed.ai_api_key.is_empty());
        assert_eq!(store.load().unwrap(), None, "清空 key 应删除钥匙串旧值");
    }

    #[test]
    fn test_attach_prefers_keychain_value() {
        let store = MemStore::new();
        store.save("sk-from-keychain").unwrap();
        let mut s = settings_with_key("sk-legacy-plaintext");
        s = attach_api_key(s, &store);
        assert_eq!(s.ai_api_key, "sk-from-keychain");
    }

    #[test]
    fn test_attach_keeps_plaintext_when_keychain_empty() {
        let store = MemStore::new();
        let s = attach_api_key(settings_with_key("sk-legacy"), &store);
        assert_eq!(s.ai_api_key, "sk-legacy");
    }

    #[test]
    fn test_migrate_moves_plaintext_into_keychain() {
        let store = MemStore::new();
        let mut data = crate::models::AppData::default();
        data.settings.ai_api_key = "sk-legacy".to_string();
        assert!(migrate_plaintext_key(&mut data, &store));
        assert!(data.settings.ai_api_key.is_empty());
        assert_eq!(store.load().unwrap(), Some("sk-legacy".to_string()));
    }

    #[test]
    fn test_migrate_noop_when_unavailable_or_empty() {
        let mut data = crate::models::AppData::default();
        data.settings.ai_api_key = "sk-legacy".to_string();
        assert!(!migrate_plaintext_key(&mut data, &MemStore::failing()));
        assert_eq!(data.settings.ai_api_key, "sk-legacy");

        data.settings.ai_api_key = String::new();
        assert!(!migrate_plaintext_key(&mut data, &MemStore::new()));
    }
}
