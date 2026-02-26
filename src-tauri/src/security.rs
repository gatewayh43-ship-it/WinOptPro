use tauri::command;

/// Check if the current process is running with administrator privileges.
#[command]
pub fn is_admin() -> Result<bool, String> {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::IsUserAnAdmin;
        // SAFETY: IsUserAnAdmin is a simple Win32 query with no unsafe memory access.
        Ok(unsafe { IsUserAnAdmin().as_bool() })
    }
    #[cfg(not(windows))]
    {
        Ok(false)
    }
}
