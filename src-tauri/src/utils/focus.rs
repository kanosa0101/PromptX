//! 前台窗口焦点工具
//! Windows 完整实现；其他平台为占位（AI 优化贴回目前在桌面端以 Windows 为主）

/// 当前前台窗口句柄（None 表示无法获取或非 Windows 平台）
#[cfg(windows)]
pub fn foreground_window() -> Option<isize> {
    Some(unsafe { windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow().0 as isize })
}

#[cfg(not(windows))]
pub fn foreground_window() -> Option<isize> {
    None
}

/// 窗口标题（诊断日志用）
#[cfg(windows)]
pub fn window_title(hwnd: isize) -> String {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::GetWindowTextW;
    unsafe {
        let mut buf = [0u16; 256];
        let len = GetWindowTextW(HWND(hwnd as _), &mut buf);
        String::from_utf16_lossy(&buf[..len as usize])
    }
}

#[cfg(not(windows))]
pub fn window_title(_hwnd: isize) -> String {
    String::new()
}

/// 将前台焦点恢复到指定窗口
/// SetForegroundWindow 受限（后台进程调用被系统拒绝）时，
/// 使用 AttachThreadInput + 模拟 Alt 抬键的组合方案
#[cfg(windows)]
pub fn restore_focus(hwnd: isize) -> bool {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYEVENTF_KEYUP, VK_MENU};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId, SetForegroundWindow,
    };
    unsafe {
        let target = HWND(hwnd as _);
        if GetForegroundWindow() == target {
            return true;
        }
        if SetForegroundWindow(target).as_bool() {
            return true;
        }
        // 前台切换被系统限制：附加到前台/目标线程的输入队列后重试
        let fg_thread = GetWindowThreadProcessId(GetForegroundWindow(), None);
        let this_thread = GetCurrentThreadId();
        let target_thread = GetWindowThreadProcessId(target, None);
        let _ = AttachThreadInput(this_thread, fg_thread, true);
        let _ = AttachThreadInput(this_thread, target_thread, true);
        // 模拟一次 Alt 抬键，解除 SetForegroundWindow 的前台锁
        keybd_event(VK_MENU.0 as u8, 0, KEYEVENTF_KEYUP, 0);
        let ok = SetForegroundWindow(target).as_bool();
        let _ = AttachThreadInput(this_thread, fg_thread, false);
        let _ = AttachThreadInput(this_thread, target_thread, false);
        ok
    }
}

#[cfg(not(windows))]
pub fn restore_focus(_hwnd: isize) -> bool {
    false
}
