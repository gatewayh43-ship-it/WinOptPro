# WinOpt Pro — Troubleshooting Guide

This guide covers the most common issues users encounter with WinOpt Pro, organized by feature area. For each issue, the most likely cause is listed first, followed by resolution steps in order of increasing complexity.

---

## 1. App Won't Start

### Symptom: Nothing happens when I double-click the WinOpt Pro executable

**Cause 1: Missing WebView2 runtime**

WinOpt Pro uses the Tauri framework, which requires the Microsoft Edge WebView2 runtime.

Resolution:
1. Open Windows Settings → Apps → Installed Apps
2. Search for "Microsoft Edge WebView2 Runtime"
3. If not listed, download and install it from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
4. Re-launch WinOpt Pro

**Cause 2: Missing Visual C++ Redistributable**

The Rust backend requires the Microsoft Visual C++ 2015–2022 Redistributable.

Resolution:
1. Download the latest VC++ redistributable from Microsoft's website
2. Install both x64 and x86 versions if unsure
3. Re-launch WinOpt Pro

**Cause 3: UAC is blocking launch**

WinOpt Pro requires elevation (administrator rights) to write to system registry keys.

Resolution:
1. Right-click the WinOpt Pro shortcut or executable
2. Select "Run as administrator"
3. Click "Yes" on the UAC dialog

**Cause 4: Antivirus quarantined the executable**

Some antivirus programs may quarantine newly downloaded executables, especially ones that perform registry modifications.

Resolution:
1. Check your antivirus quarantine log
2. Restore the WinOpt Pro executable from quarantine
3. Add an exclusion for the WinOpt Pro installation directory
4. If the file was deleted, re-download from the GitHub Releases page and verify the file hash

**Cause 5: App crashes immediately on startup (blank window then closes)**

Resolution:
1. Open Event Viewer → Windows Logs → Application
2. Look for entries from "WinOpt Pro" or "winoptpro.exe" around the time of the crash
3. Note the error code and report it in a GitHub Issue
4. Try running from an elevated Command Prompt to see console output: `cd "C:\Program Files\WinOpt Pro" && winoptpro.exe`

---

## 2. Tweak Apply Fails

### Symptom: "Access Denied" error when applying a tweak

**Cause:** The app is not running with administrator privileges.

Resolution:
1. Close WinOpt Pro
2. Right-click → "Run as administrator"
3. Accept the UAC prompt
4. Retry the tweak

### Symptom: UAC prompt does not appear

**Cause 1: UAC is disabled system-wide**

Resolution:
1. Open `secpol.msc` (Local Security Policy)
2. Navigate to Security Settings → Local Policies → Security Options
3. Find "User Account Control: Run all administrators in Admin Approval Mode"
4. Set to "Enabled"
5. Reboot and retry

**Cause 2: The application manifest is not requesting elevation**

Resolution: Download the latest version of WinOpt Pro from GitHub — this has been fixed in recent builds.

### Symptom: "PowerShell execution policy" error

Some tweaks use PowerShell scripts internally. If the system execution policy is set to `Restricted` or `AllSigned`, these scripts may fail.

Resolution (choose one):

Option A — Change policy for the current session only (recommended):
1. Open PowerShell as administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope Process`
3. Retry the tweak from WinOpt Pro

Option B — Change policy machine-wide:
1. Open PowerShell as administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope LocalMachine`
3. Retry the tweak

Note: WinOpt Pro's Rust backend runs PowerShell with the `-ExecutionPolicy Bypass` flag for its own commands. If you are still seeing this error, the issue may be a Group Policy-enforced execution policy that overrides user settings.

### Symptom: "The operation completed successfully" but no change is visible

**Cause:** Some tweaks target registry keys under `HKLM\SOFTWARE\Policies` which Group Policy may immediately overwrite.

Resolution:
1. Open Group Policy Editor (`gpedit.msc`) and check if the relevant setting is configured
2. If on a domain-joined machine, the domain Group Policy may override local registry writes — contact your IT administrator
3. If on a standalone machine, run `gpresult /r` to identify any active policies

---

## 3. App Crashes or System Instability After Applying a Red Tweak

### Symptom: Windows fails to boot or enters a crash loop after applying a Red tweak

**Step 1: Boot into Safe Mode**

1. Hold Shift and click Start → Power → Restart
2. OR: interrupt boot 3 times in succession (Windows 11 enters WinRE automatically after 3 failed boots)
3. In WinRE: Troubleshoot → Advanced Options → Startup Settings → Restart
4. Press F4 for "Enable Safe Mode" or F6 for "Enable Safe Mode with Networking"

**Step 2: Revert via WinOpt Pro in Safe Mode**

1. Once in Safe Mode, open WinOpt Pro (run as administrator)
2. Go to History → find the last applied tweak → click Revert
3. Reboot normally

**Step 3: Manual registry recovery (if WinOpt Pro won't open in Safe Mode)**

1. Open Registry Editor (`regedit.exe`) as administrator
2. Navigate to the key documented in the tweak's educational overlay
3. Restore the original value (the original value is documented in the overlay, e.g., "original: 1")

**Step 4: Recovery for VBS / Hyper-V / bcdedit changes**

If you disabled VBS or modified boot configuration:

Open Command Prompt as administrator (in Safe Mode or WinRE) and run:

```
bcdedit /set hypervisorlaunchtype auto
bcdedit /deletevalue {current} hypervisors
bcdedit /deletevalue {current} safeboot
```

Then reboot normally. Windows will re-enable VBS on the next boot.

**Step 5: System Restore**

If the above steps do not resolve the issue:
1. Boot into WinRE (Troubleshoot → Advanced Options → System Restore)
2. Select a restore point created before WinOpt Pro was used
3. Follow the wizard to restore

---

## 4. GPU Driver Cleaner Issues

### Symptom: "pnputil is not recognized" or pnputil not found

**Cause:** Very old Windows 10 builds may have an older version of pnputil that does not support `/delete-driver`.

Resolution:
1. Ensure you are on Windows 10 version 2004 or later: run `winver`
2. If on an older build, update Windows first
3. As a workaround, manually delete driver store entries using `devcon.exe` (from Windows Driver Kit)

### Symptom: Display goes black during uninstall

This is **expected behavior**. When the GPU driver is removed, Windows temporarily loses access to the GPU and falls back to the basic display driver (Microsoft Basic Display Adapter). The screen may go black for 5–15 seconds or the resolution may drop to 1024x768.

Do not panic and do not force-power-off the PC. Wait for the screen to come back.

### Symptom: Screen resolution is wrong after clean uninstall

This is also **expected**. Without a GPU driver, Windows runs at a low resolution using the Basic Display Adapter. Install your new GPU driver immediately after the clean uninstall to restore normal resolution.

### Symptom: "Safe Mode boot" was scheduled but Windows did not boot into Safe Mode

Resolution:
1. Open an elevated Command Prompt and check if the RunOnce entry was created:
   ```
   reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
   ```
2. Check if the safeboot flag is set:
   ```
   bcdedit | findstr safeboot
   ```
3. If neither is present, the scheduling step failed — retry the "Schedule Safe Mode Boot" action with the app running as administrator
4. If safeboot is set but the system booted normally anyway, there may be a UEFI Secure Boot issue — consult your motherboard documentation

### Symptom: Driver reinstalls itself after removal

**Cause:** Windows Update automatically reinstalls drivers it knows about.

Resolution:
1. Before clean-installing, go to Tweaks → Windows Update and apply the "Disable Automatic Driver Updates" tweak
2. Alternatively, use the "Show or hide updates" troubleshooter (Microsoft provided tool) to block the specific driver
3. Ensure "Delete from Driver Store" is checked in GPU Driver Cleaner before uninstalling

---

## 5. WSL Issues

### Symptom: WSL option is greyed out or "WSL not available"

**Cause 1: Windows Home edition may have restrictions**

WSL 2 requires the VirtualMachinePlatform Windows feature, which is available on Windows Home. However, older Windows 10 Home builds may require a manual update.

Resolution:
1. Run `winver` — ensure you are on Windows 10 2004 (build 19041) or later
2. In an elevated PowerShell, run:
   ```
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. Reboot
4. Update the WSL kernel: `wsl --update`
5. Set WSL 2 as default: `wsl --set-default-version 2`

**Cause 2: Virtualization is disabled in BIOS/UEFI**

WSL 2 requires hardware virtualization (Intel VT-x or AMD-V).

Resolution:
1. Restart and enter BIOS/UEFI (usually F2, F10, or Delete during POST)
2. Find the virtualization option (Intel VT-x, AMD-V, or SVM Mode)
3. Enable it, save and exit
4. Retry WSL installation

### Symptom: WSL kernel update required

```
Error: 0x80370102 The virtual machine could not be started because a required feature is not installed.
```

Resolution:
```
wsl --update
wsl --shutdown
```
Then retry launching your distro.

### Symptom: Linux Mode is not available (WSLg not showing)

**Cause:** WSLg requires Windows 11. On Windows 10, Linux GUI apps are not supported.

Resolution: Linux Mode (WSLg) is a Windows 11-exclusive feature. On Windows 10, you can still use WSL for terminal-based Linux tools; you simply cannot launch a graphical desktop environment. The Linux Mode card is hidden when running on Windows 10.

### Symptom: Distro installation fails

Resolution:
1. Ensure you have internet connectivity
2. Ensure the Microsoft Store is accessible (some corporate environments block it)
3. Try installing via command line: `wsl --install -d Ubuntu`
4. If the store is blocked, download the distro `.appx` package directly from Microsoft's GitHub and install with: `Add-AppxPackage .\Ubuntu.appx`

---

## 6. Gaming Optimizer Issues

### Symptom: Game is not detected even while running

**Cause:** Your game's process name is not in the 190+ game executable detection list.

Resolution:
1. Open Task Manager while the game is running
2. Find the game process in the "Details" tab and note the exact `.exe` name
3. Submit a GitHub Issue requesting the process be added, including the executable name and game title
4. As a temporary workaround, you can manually click "Start Auto-Optimize" on the Gaming Optimizer page without relying on detection

### Symptom: Gaming overlay window does not appear

**Cause 1:** A second monitor with different DPI settings can confuse the transparent window positioning.

Resolution:
1. Click "Launch Overlay" again
2. The overlay may have appeared off-screen — check all monitors
3. If still not visible, try setting all monitors to the same DPI scale in Display Settings

**Cause 2:** The overlay window was blocked by the operating system's window manager.

Resolution:
1. Right-click WinOpt Pro in the taskbar → "Always on Top" (if available)
2. Restart WinOpt Pro as administrator

### Symptom: Overlay metrics show "N/A" for GPU values

**Cause:** GPU metrics beyond basic WMI are sourced from `nvidia-smi` for NVIDIA cards. On AMD and Intel GPUs, these detailed metrics are not available through the same interface.

Resolution: This is expected on AMD/Intel. CPU% still displays correctly. GPU% shows what Windows reports via WMI. Detailed power/temperature data from AMD cards is a planned future enhancement.

---

## 7. Latency Optimizer Issues

### Symptom: "Flush Standby List" button returns an error about privileges

**Cause:** `NtSetSystemInformation` with `SystemMemoryListInformation` requires SeProfileSingleProcessPrivilege, which is granted to administrators.

Resolution: Ensure WinOpt Pro is running as administrator (right-click → Run as administrator).

### Symptom: Standby flush shows "0 MB freed"

This is **not an error**. It means the standby list was already empty or minimal — Windows had already reclaimed those pages. This is normal on systems with adequate RAM or after the system has been idle for a while.

### Symptom: Timer resolution shows 15.625 ms instead of the expected ~0.5 ms

**Cause:** No application is currently requesting a high-resolution timer. Windows defaults to 15.625 ms when no multimedia applications (audio players, games, etc.) have called `timeBeginPeriod`.

Resolution: This is expected when no real-time applications are running. The resolution drops automatically to 15.625 ms to save power. The DisableDynamicTick tweak and running a game/audio application will both cause Windows to maintain the higher resolution.

---

## 8. Network Issues

### Symptom: DNS change appears to apply but browsing still uses old DNS

**Cause:** Windows DNS cache and application-level DNS caches retain old records.

Resolution:
1. Open an elevated Command Prompt and run: `ipconfig /flushdns`
2. Restart your browser (browsers maintain their own DNS cache)
3. If the issue persists, run `ipconfig /all` to verify the new DNS server is listed for your adapter
4. Some changes require a network adapter reset: `netsh interface ip set dns "Local Area Connection" dhcp` followed by re-applying the new DNS

### Symptom: "Ping failed" or all pings show packet loss

**Cause 1:** Windows Firewall is blocking outbound ICMP (ping) packets.

Resolution:
1. Open Windows Defender Firewall with Advanced Security
2. Go to Outbound Rules → New Rule → Custom
3. Protocol: ICMPv4, any remote address, allow the connection
4. Apply

**Cause 2:** The target host blocks ICMP (many servers do this).

Resolution: Try pinging a known-responsive address like `1.1.1.1` or `8.8.8.8`.

### Symptom: TCP tweaks (auto-tuning, LSO) seem to have no effect

**Cause:** Network adapter drivers may override these settings at the driver level.

Resolution:
1. Open Device Manager → Network Adapters → your adapter → Properties → Advanced
2. Check for driver-level settings like "Large Send Offload" and configure them directly in the driver
3. Some enterprise-grade NICs require their own management software to change these settings

---

## 9. Process Manager Issues

### Symptom: Cannot kill a process — "Access Denied"

**Cause:** The process is running as SYSTEM, as another user, or is a protected process (PPL — Protected Process Light).

Processes you cannot kill regardless of privilege:
- `System`, `smss.exe`, `csrss.exe`, `wininit.exe`, `lsass.exe` (if PPL is active)
- Processes protected by anti-cheat (e.g., `vgc.exe` — Vanguard)
- Processes owned by another user when not running as that user or SYSTEM

Resolution:
- For user-owned processes: ensure WinOpt Pro is running as administrator
- For SYSTEM processes: use `PsSuspend`/`PsKill` from Sysinternals as a last resort, understanding the stability risks
- For protected processes (PPL): these cannot be killed by any user-mode tool

### Symptom: CPU% values for processes seem wrong or always 0%

**Cause:** The process list refreshes every 3 seconds; CPU% is calculated as a delta over the refresh interval. On first load, all values show 0% until the second sample arrives.

Resolution: Wait 3–6 seconds after the page loads for accurate CPU% readings.

---

## 10. Startup Items Issues

### Symptom: A startup item I disabled re-enables itself

**Cause:** Some applications manage their own startup entries and restore them on next launch (common with Teams, Spotify, Discord, OneDrive, Dropbox).

Resolution:
1. Open the application's own settings and look for a "Launch at startup" or "Start minimized" option — disable it there
2. Re-disable the entry in WinOpt Pro after changing the app setting
3. For OneDrive specifically: right-click the OneDrive tray icon → Settings → Sync and backup → uncheck "Start OneDrive when I sign in to Windows"

### Symptom: Startup item does not appear in the list

**Cause:** Some startup mechanisms are not covered by WinOpt Pro's scanner (e.g., service-based startup, WMI event subscriptions, AppInit_DLLs).

Resolution:
1. Use Autoruns from Sysinternals for a comprehensive startup item list
2. Submit a GitHub Issue describing the startup mechanism so it can be added to a future version

---

## 11. AI Assistant Issues

### Symptom: "Cannot connect to Ollama" or no response from AI

**Cause 1:** Ollama is not installed or not running.

Resolution:
1. Download and install Ollama from https://ollama.com/
2. Run `ollama serve` in a terminal to start the Ollama server
3. Verify it is running: open a browser and navigate to `http://localhost:11434` — you should see `{"ollama":"running"}`
4. In WinOpt Pro Settings, click "Test Connection" to verify

**Cause 2:** The model has not been downloaded.

Resolution:
1. Open a terminal and run: `ollama pull llama3`
2. Wait for the model to download (may be several GB)
3. Retry from WinOpt Pro

**Cause 3:** Wrong endpoint configured.

Resolution:
1. Go to Settings → AI Assistant
2. Ensure the endpoint is `http://localhost:11434` (or whatever host/port Ollama is listening on)
3. Ensure no trailing slash
4. Click "Test Connection"

**Cause 4:** Firewall blocking local loopback connections.

Resolution:
1. Check that Windows Firewall is not blocking inbound connections on port 11434
2. Add a firewall exception for Ollama if necessary

---

## 12. Performance Seems Worse After Applying Tweaks

### Diagnosing the problematic tweak

1. Go to **History** and note the tweaks applied in the last session
2. Go to **Tweaks** and revert tweaks one by one, testing after each revert
3. Alternatively, load a Profile from before the tweaks were applied, or use Backup & Restore to restore a prior state

### Common tweaks that can reduce performance in certain scenarios

| Tweak | Potential Issue |
|-------|----------------|
| Disable Memory Compression | Can increase RAM pressure on systems with less than 16 GB RAM |
| Disable VBS | After reverting, VBS re-enablement can cause a one-time performance dip during the next few boots |
| CPU Core Parking disabled | On laptops, can increase heat and reduce sustained clock speeds |
| High Performance Power Plan | Can cause thermal throttling on laptops without adequate cooling |
| Disable Dynamic Tick | Marginally higher idle power consumption; can cause scheduling issues on some older CPUs |

### If performance is significantly worse and you cannot identify the cause

1. Use the **Revert All** function on the Tweaks page to revert everything at once
2. Reboot
3. If still worse after reverting all tweaks, the issue may be unrelated to WinOpt Pro — check Windows Event Viewer for hardware errors or driver crashes

---

## 13. Getting Help

If none of the above steps resolve your issue, please open a GitHub Issue.

**What to include in your bug report:**

1. **WinOpt Pro version** (visible in Settings → About)
2. **Windows version** — run `winver` and include the full build number (e.g., Windows 11 23H2 Build 22631.3737)
3. **Steps to reproduce** — exact sequence of actions that trigger the issue
4. **Expected behavior** — what you expected to happen
5. **Actual behavior** — what actually happened (include any error messages verbatim)
6. **History export** — if a tweak-related issue, export the last few History entries (use the export function) and attach
7. **Event Viewer logs** — open Event Viewer → Windows Logs → Application, filter for errors around the time of the issue, export as CSV and attach
8. **System specs** — CPU model, RAM amount, GPU model, drive type (SSD/HDD)

**GitHub Issues:** https://github.com/[your-org]/winopt-pro/issues

Please search existing issues before opening a new one — your problem may already be reported with a workaround.

---

*Last updated: 2026-03-11*
