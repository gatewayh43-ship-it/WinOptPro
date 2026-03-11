# WinOpt Pro — Frequently Asked Questions

---

## General Safety

### 1. Is WinOpt Pro safe to use? Will it break my PC?

For the vast majority of tweaks: yes, it is safe. WinOpt Pro categorizes every tweak by risk level:

- **Green** tweaks are safe for all users. They are well-documented, reversible, and have no meaningful negative side-effects. Examples include disabling telemetry, enabling Hardware-Accelerated GPU Scheduling, or adjusting TCP auto-tuning.
- **Yellow** tweaks carry a moderate risk. They may affect a specific Windows feature you use (such as disabling Delivery Optimization, which also disables sharing updates with nearby PCs). Read the educational overlay before applying.
- **Red** tweaks are advanced configurations that could affect system security, stability, or compatibility with specific software. These require Expert Mode to be enabled and should only be applied if you understand the trade-off. Examples include disabling VBS (Virtualization-Based Security) or disabling memory compression.

The app always stores the original value before making any change, so every tweak can be individually reverted. No tweak permanently destroys data; the worst case is a reboot into Safe Mode and a registry restore, which is documented in the Troubleshooting guide.

### 2. Do I need to run WinOpt Pro as an administrator?

Yes. Most tweaks write to `HKLM` (the machine-wide registry hive) or modify system services, both of which require administrator privileges. WinOpt Pro will request elevation via UAC when it launches. If you decline UAC, some actions will silently fail or return "Access Denied."

For best results, right-click the WinOpt Pro shortcut and choose "Run as administrator," or accept the UAC prompt when the app launches.

### 3. What is Expert Mode?

Expert Mode unlocks Red-risk tweaks that are hidden from standard users. When Expert Mode is off (the default), only Green and Yellow tweaks are visible and applicable.

To enable Expert Mode: go to **Settings** and toggle **Expert Mode**, or use the toggle in the Tweaks page header. The state persists between sessions.

When Expert Mode is active, a persistent warning banner is displayed on the Tweaks page as a reminder that the unlocked tweaks carry higher risk.

### 4. What are the three risk levels exactly?

| Level | Who should use it | Reversible? | Example |
|-------|------------------|-------------|---------|
| Green | Everyone | Yes, instantly | Disable advertising ID |
| Yellow | Intermediate users | Yes | Disable Delivery Optimization |
| Red | Advanced users only | Yes (may need reboot) | Disable VBS/HVCI |

Red tweaks are not inherently dangerous, but they can have meaningful security or compatibility implications that require understanding before applying.

---

## Tweaks & Changes

### 5. How do I undo a change?

Every tweak has a **Revert** button on its card. Clicking it restores the exact original value that was captured before the tweak was applied.

You can also:
- Go to **History** and click **Revert** on any individual log entry
- Load a saved **Profile** that reflects your pre-tweak state
- Use **Backup & Restore** in Settings to restore from a `.winopt` backup file

If the app cannot be opened (e.g., after a crash loop from a Red tweak), see the Safe Mode recovery steps in the Troubleshooting guide.

### 6. What does "requires reboot" mean?

Some tweaks write to registry keys or modify boot configuration data (bcdedit) that Windows only reads during boot. These tweaks are applied immediately to the registry or configuration file, but the effect does not take place until the next restart. The tweak card displays a "Requires Reboot" badge for these cases.

Tweaks that require a reboot include: disabling VBS/HVCI, Dynamic Tick changes, Hyper-V launch type changes, and some memory management settings.

### 7. How do I know if a tweak actually worked?

Several ways to verify:
- **Registry Editor** — open `regedit.exe` and navigate to the key listed in the tweak's educational overlay to confirm the value was written correctly
- **Services.msc** — for service-based tweaks, check the service state in the Services console
- **PowerShell** — some tweaks can be verified with PowerShell commands listed in the overlay (e.g., `Get-NetTCPSetting`, `bcdedit`)
- **Performance benchmarks** — before/after comparisons using built-in tools like `winsat formal`, or third-party benchmarks

The History page confirms that the tweak was applied without errors, which is a good first indicator.

### 8. Will applying tweaks affect Windows Update?

Some tweaks in the **Windows Update** category change how Windows Update behaves (e.g., pausing updates, disabling automatic driver installation). These are clearly labeled. Tweaks in other categories (Performance, Gaming, Privacy, etc.) do not affect Windows Update behavior.

Note: Microsoft sometimes resets certain settings (especially telemetry and privacy settings) during major feature updates (annual Windows 11 releases). Running the Privacy Audit after a major update is recommended.

---

## Gaming

### 9. Will WinOpt Pro get me banned from online games or anti-cheat systems?

Tweaks applied by WinOpt Pro modify the Windows operating system — they do not modify game files, inject code into game processes, or hook DirectX. They are equivalent to what you would do manually in `regedit` or `services.msc`.

No known anti-cheat system (EAC, Battleye, Vanguard, FACEIT) bans players for Windows registry optimizations of the type WinOpt Pro performs.

However, **use common sense**: do not apply tweaks that disable security features (like disabling kernel-mode Code Integrity) if you play games with kernel-level anti-cheat that relies on those features being active. Vanguard in particular has been known to refuse to run if HVCI is disabled.

### 10. What does the Gaming Optimizer actually do?

The Gaming Optimizer does three things:

1. **Detects active games** by polling the running process list every 5 seconds against a list of 190+ known game executable names.
2. **Auto-optimize** (when toggled on) batch-applies a curated set of performance tweaks the moment a game is detected and reverts them when you stop the session. Tweaks include: Game Mode, HAGS, disabling dynamic tick, disabling Xbox Game Bar, and disabling network throttling.
3. **Overlay** — launches a transparent always-on-top widget showing CPU%, GPU%, VRAM, temperature, and power draw so you can monitor performance without alt-tabbing.

### 11. My game is not detected. What do I do?

The detection list includes 190+ common game processes. If your game uses an unusual executable name it may not be detected automatically.

Workarounds:
- Submit a GitHub Issue with the process name of your game (check in Task Manager) to have it added to the list
- You can manually trigger auto-optimize from the Gaming Optimizer page without game detection

---

## Privacy & Security

### 12. Is the AI Assistant sending data to the cloud?

No. The AI Assistant uses [Ollama](https://ollama.com/), which runs a large language model entirely on your local machine. Your prompts and responses never leave your computer. No account is required, no telemetry is sent.

The Ollama endpoint is configurable in Settings (default: `http://localhost:11434`). If you point it to a remote server, your queries would be sent to that server — but the default configuration is entirely local.

### 13. What is the audit log? How is it encrypted?

The audit log (History page) records every tweak operation performed by WinOpt Pro: the tweak name, the command executed, the output, and whether it succeeded. This is useful for reviewing what was changed and for reverting specific operations.

Sensitive fields (`command_executed`, `stdout`, `stderr`) are encrypted with AES-256-GCM. The encryption key is derived from `SHA-256(MachineGuid)` — a value unique to your Windows installation that never leaves your machine. This means the audit log cannot be read on another computer even if the database file is copied.

Entries are prefixed with `enc:` to distinguish encrypted entries from legacy plaintext entries.

### 14. How often should I run the Privacy Audit?

We recommend:
- **After a fresh Windows install** — Windows ships with several privacy-unfriendly defaults
- **After a major Windows feature update** — Microsoft sometimes resets privacy settings during annual upgrades (23H2, 24H2, etc.)
- **Monthly** — as a routine check to catch any settings that may have drifted

The audit is non-destructive (read-only scan), so running it frequently has no downside.

### 15. What is VBS / HVCI and should I disable it?

**Virtualization-Based Security (VBS)** is a Windows security feature that uses hardware virtualization to isolate a secure portion of memory. **Hypervisor-Protected Code Integrity (HVCI)**, sometimes called Memory Integrity, uses VBS to prevent unsigned or malicious code from being loaded into the kernel.

**When VBS/HVCI should remain enabled:**
- You are on a corporate machine with security requirements
- You play games with strict kernel-level anti-cheat (e.g., Valorant/Vanguard)
- Security is your priority

**When disabling VBS/HVCI can be considered:**
- You are on a dedicated gaming machine and want maximum GPU/CPU throughput (VBS can reduce gaming performance by 5–10% on some systems)
- You use software that is incompatible with HVCI (certain older hypervisors, some debugging tools)

Disabling VBS is a Red-risk tweak. If you are unsure, leave it enabled.

### 16. Will these tweaks affect Windows Defender?

Tweaks in the **Security** category can affect Defender behavior if they modify related registry keys. There is also a dedicated **Windows Defender** page with explicit toggles for Defender components.

No tweak in the Performance, Gaming, Privacy, Network, Power, Debloat, or UI categories affects Defender directly.

If you are concerned, the Windows Defender page shows the current status of each Defender component at all times.

---

## Compatibility

### 17. Does WinOpt Pro work on Windows 10?

Yes. WinOpt Pro supports Windows 10 version 2004 (May 2020 Update, build 19041) and later. This includes all Windows 10 22H2 releases and all Windows 11 versions.

A small number of features require Windows 11:
- **WSL Linux Mode (WSLg)** — WSLg requires Windows 11; WSL management itself works on Windows 10
- **Snap Layouts tweaks** — Windows 11 only (the control is hidden on Windows 10)

### 18. Does this work with AMD GPUs?

Yes for most features. Specific behavior by GPU vendor:

- **NVIDIA**: Full support — GPU metrics via `nvidia-smi`, VRAM, temperature, power draw in overlay; driver cleaner targets NVIDIA-specific registry keys
- **AMD**: Partial — GPU usage via WMI Win32_VideoController; `nvidia-smi`-specific metrics (power limit, detailed VRAM) are not available; driver cleaner targets AMD registry keys via pnputil
- **Intel integrated graphics**: Basic WMI-based info; no detailed metrics

The Gaming Optimizer overlay shows "N/A" for nvidia-smi-specific metrics (VRAM, power) on AMD systems. CPU% still displays correctly.

### 19. Can I use WinOpt Pro on a work or corporate computer?

Use caution. Corporate machines are often:
- Managed by Group Policy, which may prevent or override registry changes
- Locked down with elevated security software that could flag WinOpt Pro's registry writes
- Subject to IT policies that prohibit running unsigned software

We recommend:
- Getting explicit approval from your IT department before using WinOpt Pro on a managed machine
- Using only Green-risk tweaks if you do run it
- Avoiding the GPU Driver Cleaner and WSL Manager on managed machines

WinOpt Pro does not install any background services, drivers, or agents. It is a portable-style app that makes discrete registry/service changes.

### 20. Why does Windows SmartScreen warn about the installer?

SmartScreen assigns reputation scores based on how many users have downloaded a given file. Because WinOpt Pro is a new application with a limited install base, the installer executable may not yet have built enough reputation to bypass the SmartScreen warning.

The warning does not mean the software is malicious. To install despite the warning:
1. Click "More info" on the SmartScreen dialog
2. Click "Run anyway"

If you prefer to verify authenticity before running, check the file's digital signature (right-click → Properties → Digital Signatures) or build from source — the full source code is available on GitHub.

### 21. Is there an auto-update mechanism?

Not in the current release. WinOpt Pro does not auto-update or run any background processes when closed. To update, download the new installer from the GitHub Releases page and run it.

A future release may add an update check (opt-in) that notifies you of new versions without downloading automatically.

---

## Specific Features

### 22. What is WSL / Linux Mode?

WSL (Windows Subsystem for Linux) is a Microsoft feature that lets you run a full Linux kernel and distributions on Windows. WinOpt Pro's WSL Manager provides a graphical interface for managing distros, configuring resources, and launching Linux desktop environments (via WSLg).

**Linux Mode** specifically refers to launching a full graphical Linux desktop (XFCE4, KDE Plasma, or GNOME) inside a WSLg window. This requires Windows 11 and a distro with a desktop environment installed (the Setup Wizard handles this automatically).

### 23. Can I export my settings and use them on another PC?

Yes. Go to **Settings → Backup & Restore → Export Backup**. This creates a `.winopt` JSON file containing:
- All applied tweak IDs
- Saved profiles
- App settings (theme, expert mode, Ollama config)

On the new machine, go to **Settings → Backup & Restore → Import Backup** and select the file. WinOpt Pro will apply the tweaks and restore profiles.

Note: profile and backup files do not contain the encrypted audit log, which is machine-specific.

### 24. How do I clean install GPU drivers?

The GPU Driver Cleaner module handles this:

1. Go to **Apps → GPU Driver Cleaner**
2. Review the detected drivers for your GPU(s)
3. Download your new driver installer from NVIDIA/AMD/Intel (but do not run it yet)
4. Click **Uninstall Now** with "Delete from Driver Store" checked, OR click **Schedule Safe Mode Boot** for a deeper clean
5. If using Safe Mode scheduling, reboot when prompted
6. After the old driver is fully removed and Windows boots back to standard mode, run your new driver installer

This achieves a result similar to DDU (Display Driver Uninstaller) without requiring you to manually enter Safe Mode.

### 25. What is the Latency Optimizer actually doing?

Three distinct things:

1. **Timer Resolution** — reads `NtQueryTimerResolution` to show the current Windows multimedia timer resolution. A lower number (e.g., 0.5 ms) means the system clock ticks more frequently, which reduces the maximum scheduling delay for processes that request fine-grained timing. WinOpt Pro reads and displays this value; the `DisableDynamicTick` tweak in the Gaming category is the primary knob for improving it.

2. **Standby RAM Flush** — calls `NtSetSystemInformation(SystemMemoryListInformation, MemoryPurgeStandbyList)` which tells Windows to immediately reclaim all pages in the standby (evicted but not yet reused) list. This is cosmetic in terms of RAM pressure but can reduce occasional stutters caused by the OS evicting pages at an inconvenient time.

3. **bcdedit Boot Settings** — reads and displays the current boot configuration relevant to latency (dynamic tick state, hypervisor launch type, platform clock source). These are informational; changing them requires the related tweaks in the Tweaks page.

### 26. What if my PC won't boot after applying tweaks?

First, try a standard reboot — some Red tweaks (like VBS) require a reboot to take full effect, and if the tweak was only partially applied during shutdown, a clean reboot may resolve the issue.

If Windows fails to boot normally:

1. **Boot into Safe Mode**: Press F8 or hold Shift during boot → Troubleshoot → Advanced Options → Startup Settings → Enable Safe Mode
2. In Safe Mode, open WinOpt Pro and revert the problematic tweak, OR manually use `regedit` to restore the original value (check the History page or tweak educational overlay for the key/value)
3. For boot configuration changes (bcdedit): open an elevated Command Prompt in the Windows Recovery Environment (WinRE) and run:
   - `bcdedit /set hypervisorlaunchtype auto` — re-enables Hyper-V/VBS
   - `bcdedit /deletevalue {current} safeboot` — clears safe mode boot flag
4. For VBS: the recovery command is `bcdedit /set hypervisorlaunchtype auto` followed by a reboot

Full recovery steps are in the TROUBLESHOOTING.md file.

---

*Last updated: 2026-03-11*
