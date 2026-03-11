# WinOpt Pro — Feature Reference

This document is the canonical reference for every module and feature in WinOpt Pro. It covers what each feature is, what it does, when to use it, and all key sub-features.

---

## Table of Contents

1. [Dashboard / Overview](#dashboard--overview)
2. [System Tuning — Tweaks](#system-tuning--tweaks)
3. [System Tuning — Privacy Audit](#system-tuning--privacy-audit)
4. [System Tuning — Network Tweaks](#system-tuning--network-tweaks)
5. [System Tuning — Power Tweaks](#system-tuning--power-tweaks)
6. [System Tuning — Gaming Tweaks](#system-tuning--gaming-tweaks)
7. [System Tuning — Debloat](#system-tuning--debloat)
8. [System Tuning — Windows UI](#system-tuning--windows-ui)
9. [System Tuning — Windows Update](#system-tuning--windows-update)
10. [Apps & Packages — App Store](#apps--packages--app-store)
11. [Apps & Packages — WSL Manager](#apps--packages--wsl-manager)
12. [Apps & Packages — Driver Manager](#apps--packages--driver-manager)
13. [Apps & Packages — GPU Driver Cleaner](#apps--packages--gpu-driver-cleaner)
14. [Apps & Packages — Startup Apps](#apps--packages--startup-apps)
15. [Utilities — Gaming Optimizer](#utilities--gaming-optimizer)
16. [Utilities — Latency Optimizer](#utilities--latency-optimizer)
17. [Utilities — Power Manager](#utilities--power-manager)
18. [Utilities — Windows Defender](#utilities--windows-defender)
19. [Utilities — Process Manager](#utilities--process-manager)
20. [Utilities — Network Analyzer](#utilities--network-analyzer)
21. [Utilities — Storage Optimizer](#utilities--storage-optimizer)
22. [Utilities — System Report](#utilities--system-report)
23. [System — Profiles](#system--profiles)
24. [System — History & Audit Log](#system--history--audit-log)
25. [System — Settings](#system--settings)
26. [System — Help Center](#system--help-center)
27. [Cross-Cutting Features](#cross-cutting-features)

---

## Dashboard / Overview

**What it is:** The landing page of WinOpt Pro. Provides a real-time snapshot of your system health and acts as a launch point for common actions.

**When to use it:** Open this page first to get an at-a-glance assessment of system health, quickly jump to a specific module, or review recent optimization activity.

### System Vitals

Displays six live metrics updated continuously:

| Metric | Source | Details |
|--------|--------|---------|
| CPU Usage | sysinfo crate | Aggregate % across all logical cores |
| RAM Usage | sysinfo crate | Used / Total in GB |
| Disk Activity | sysinfo crate | Read + write bytes per second |
| GPU Usage | nvidia-smi / Win32_VideoController WMI | % GPU engine utilization |
| GPU VRAM | nvidia-smi / WMI | Used / Total VRAM in MB |
| Network | sysinfo crate | Total rx + tx bytes per second across all interfaces |

### Health Score

A composite 0–100 score calculated from:
- Number of recommended tweaks not yet applied
- Privacy issues detected
- Number of high-risk startup items
- System resource utilization at scan time

The score is color-coded: green (80–100), amber (50–79), red (below 50). It is recalculated each time the Dashboard loads.

### Quick-Action Cards

Shortcut cards to the most frequently used actions:
- **Run Privacy Audit** — launches the Privacy Audit scanner
- **Apply Recommended Tweaks** — batch-applies all Green-risk tweaks
- **Clean Startup** — opens Startup Apps page
- **Open Gaming Optimizer** — opens the Gaming Optimizer page

### Recent Activity

A scrollable list of the last 10 actions recorded in the encrypted audit log, shown with timestamp, tweak name, and apply/revert status. Each entry links to the full History page.

---

## System Tuning — Tweaks

**What it is:** The core feature of WinOpt Pro. A curated library of 165 Windows registry, Group Policy, service, and PowerShell tweaks organized into 10 categories with risk ratings.

**When to use it:** Whenever you want to optimize Windows performance, improve privacy, reduce latency, customize the UI, or remove bloat.

### Search and Filtering

- **Full-text search** across tweak names and descriptions
- **Category filter** — select one or more of the 10 categories
- **Risk filter** — show only Green, Yellow, or Red tweaks
- **Applied filter** — show only tweaks that have been applied
- Filters are combinable and reset instantly

### Risk Levels

| Level | Color | Meaning |
|-------|-------|---------|
| Green | Green | Safe for all users. Reversible. No impact on stability. |
| Yellow | Amber | Moderate impact. May affect some features. Recommended to understand before applying. |
| Red | Red | Advanced. May impact security, compatibility, or require a reboot. Requires Expert Mode. |

### One-Click Apply / Revert

Each tweak card has a single toggle button:
- **Apply** — executes the tweak (registry write, service change, PowerShell command, or Group Policy modification)
- **Revert** — restores the original value captured before the tweak was applied
- Applied state is persisted in the local SQLite database (encrypted)
- A toast notification confirms success or reports the error

### Expert Mode Toggle

Red-risk tweaks are hidden and disabled by default. Enabling Expert Mode (via the toggle in the header or the Settings page) unlocks them. Expert Mode state is persisted between sessions.

When Expert Mode is enabled a persistent banner reminds the user that Red tweaks carry higher risk.

### Batch Operations

The **Deploy Selected** flow allows applying multiple tweaks at once:
1. Check the checkbox on each desired tweak card
2. Click **Deploy Selected** in the action bar
3. A **Confirm Deploy Modal** shows the full list of tweaks to be applied, their risk levels, and any reboot requirements
4. Click **Confirm** to begin sequential execution
5. A **Progress Modal** shows real-time progress with a per-tweak status indicator

A **Revert All** action is also available to undo all currently-applied tweaks in a single operation.

### Educational Overlay

Each tweak card has an info (?) button that opens a detail panel containing:
- **What it does** — plain-English explanation of the change
- **Registry/command** — the exact key, value, or command that is executed
- **Pros** — benefits of applying
- **Cons / trade-offs** — what functionality may be affected
- **Requires reboot** badge if applicable
- **Risk rationale** — why this tweak carries its risk level

### Tweak Categories

| Category | Count | Description |
|----------|-------|-------------|
| Performance | 17 | CPU scheduler, memory management, I/O priority, write-back cache, memory compression, FTH (Fault Tolerant Heap) |
| Gaming | 19 | Game Mode, GPU scheduling, dynamic tick, fullscreen optimizations, Xbox services |
| Privacy | 48 | Telemetry, diagnostic data, Cortana, activity history, advertising ID, app permissions |
| Network | 20 | TCP/IP stack, DNS, auto-tuning, ECN, large send offload, QoS |
| Power | 11 | Hibernate, fast startup, USB selective suspend, display power, CPU park |
| Security | 15 | VBS, HVCI, SMB signing, speculative execution mitigations, Windows Script Host |
| Debloat | 13 | Remove pre-installed Microsoft and OEM apps |
| Windows UI | 14 | Animations, transparency, snap layouts, context menu, taskbar behavior |
| Windows Update | 5 | Delivery Optimization, automatic update behavior, driver updates via Windows Update |
| Tools | 9 | System-level utilities and helper tweaks |

---

## System Tuning — Privacy Audit

**What it is:** An automated scanner that checks 9 specific privacy-related Windows settings and reports which ones are exposing data.

**When to use it:** Run after a fresh Windows install, after a major Windows Update, or periodically (monthly recommended) to catch settings that Windows resets.

### The 9 Checks

1. **Telemetry Level** — verifies `HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection\AllowTelemetry` is set to 0
2. **Diagnostic Data** — checks the DiagTrack service is disabled
3. **Advertising ID** — checks `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo\Enabled` is 0
4. **Activity History** — verifies `PublishUserActivities` and `UploadUserActivities` are disabled
5. **Location Services** — checks location consent registry key
6. **App Diagnostics** — verifies app diagnostic permission is restricted
7. **Connected User Experiences** — checks the Connected User Experiences and Telemetry service (DiagTrack) is stopped and disabled
8. **Customer Experience Improvement** — checks CEIP participation registry key
9. **Windows Error Reporting** — verifies WER service state and `Disabled` registry value

### Issue Severity Display

Each check is displayed as a card with:
- **Pass** (green) — setting is privacy-safe
- **Warning** (amber) — partial exposure
- **Fail** (red) — setting is actively exposing data

The total number of issues is shown in the page header.

### Fix All At Once

The **Fix All Issues** button iterates through every failed check and applies the corresponding registry or service change automatically. Each fix is logged to the encrypted audit log.

### Re-Scan

After fixing issues (manually or via Fix All), click **Re-Scan** to re-run all 9 checks and confirm the fixes took effect.

---

## System Tuning — Network Tweaks

**What it is:** A subset of the Tweaks library focused on network stack configuration.

**Key tweaks include:**

- **TCP Auto-Tuning** — disable or set the TCP receive window auto-tuning level
- **ECN (Explicit Congestion Notification)** — enable/disable ECN capability
- **Large Send Offload (LSO)** — enable/disable LSO v1 and v2 on adapters
- **Nagle Algorithm** — disable Nagle (TcpAckFrequency=1, TCPNoDelay=1) for lower latency
- **QoS Packet Scheduler** — limit or remove QoS bandwidth reservation
- **Network Throttling Index** — adjust or disable Windows network throttling
- **DNS over HTTPS** — configure DoH at the Windows level
- **Receive Side Scaling (RSS)** — configure multi-core NIC processing

### DNS Provider Selection

A dedicated control on the Network Tweaks section allows selecting a preset DNS provider:

| Provider | Primary | Secondary |
|----------|---------|-----------|
| Cloudflare | 1.1.1.1 | 1.0.0.1 |
| Google | 8.8.8.8 | 8.8.4.4 |
| Quad9 | 9.9.9.9 | 149.112.112.112 |
| AdGuard | 94.140.14.14 | 94.140.15.15 |
| Mullvad | 194.242.2.2 | 194.242.2.3 |
| NextDNS | (config-specific) | — |
| OpenDNS | 208.67.222.222 | 208.67.220.220 |
| ControlD | (profile-specific) | — |
| ISP Default | Removes static DNS | Reverts to DHCP-assigned |

Selecting a provider applies it to all active network adapters and logs the change.

---

## System Tuning — Power Tweaks

**What it is:** Registry and powercfg-based tweaks affecting power consumption and performance trade-offs.

**Key tweaks include:**

- **Hibernate** — enable or disable hibernation (frees hiberfil.sys space)
- **Fast Startup** — disable Hybrid Boot / Fast Startup (fixes some boot issues)
- **USB Selective Suspend** — disable USB hub power-saving to prevent device disconnects
- **CPU Core Parking** — force all CPU cores active (disables park state)
- **Display Power Saving** — disable panel self-refresh on laptops
- **High Performance Power Plan** — switch to High Performance via powercfg

---

## System Tuning — Gaming Tweaks

**What it is:** Tweaks specifically tuned for low-latency gaming and maximum frame rates.

**Key tweaks include:**

- **Game Mode** — enable Windows Game Mode (`GameBar\AutoGameModeEnabled`)
- **Hardware-Accelerated GPU Scheduling (HAGS)** — enable HAGS for lower GPU latency
- **Dynamic Tick** (`DisableDynamicTick`) — disables the kernel's variable timer tick to reduce scheduling jitter
- **Fullscreen Optimizations** — disable FSO for games that perform better in exclusive fullscreen
- **Xbox Game Bar** — disable the Xbox Game Bar overlay
- **Xbox Services** — disable Xbox-related background services
- **NVIDIA Reflex / Low Latency Mode** — configure driver-level latency reduction
- **Priority Tweaks for Games** — raise I/O and CPU priority for game processes

---

## System Tuning — Debloat

**What it is:** Removes pre-installed Windows applications and optional features that most users do not need.

**Apps targeted include:**
- Microsoft Solitaire Collection
- Xbox apps (Xbox, Xbox Game Overlay, Xbox Identity Provider, Xbox Speech To Text)
- Skype
- OneNote (Store version)
- Mixed Reality Portal
- 3D Viewer
- Paint 3D
- Microsoft Teams (consumer)
- News, Weather, Maps, Mail and Calendar
- Get Help / Tips

Each debloat tweak removes the APPX package via PowerShell `Remove-AppxPackage` and is individually reversible (reinstalls the package from the Microsoft Store or cached source).

---

## System Tuning — Windows UI

**What it is:** Visual and UX tweaks that customize the Windows shell.

**Key tweaks include:**

- **Disable Animations** — reduce or eliminate window and taskbar animations
- **Disable Transparency** — turn off Fluent Design acrylic/transparency effects
- **Classic Context Menu** — restore the Windows 10-style right-click menu in Windows 11
- **Taskbar Centering** — move taskbar icons back to the left (Windows 11)
- **Snap Layouts** — disable the Snap Layouts hover popup
- **News and Interests** — disable taskbar widgets/news feed
- **Snap Assist** — disable snap suggestion flyouts
- **Verbose Startup/Shutdown Messages** — enable detailed status messages during boot
- **Dark Mode** — enforce dark mode for system and apps via registry

---

## System Tuning — Windows Update

**What it is:** Controls how and when Windows Update downloads and installs updates.

**Key tweaks include:**

- **Delivery Optimization** — disable P2P Windows Update sharing (LAN and Internet)
- **Automatic Driver Updates** — prevent Windows Update from installing hardware drivers automatically
- **Update Notifications** — suppress update restart prompts
- **Pause Updates** — pause Windows Update delivery for up to 35 days
- **Feature Updates** — defer feature updates via policy

---

## Apps & Packages — App Store

**What it is:** A curated catalog of popular Windows applications with one-click install via winget or Chocolatey. WinOpt Pro ships with a hand-curated catalog of 391 apps across 7 categories (Web Browsers, Game Launchers, Media & Entertainment, System Utilities, Communication, Other Tools, Development & IT), each with full metadata including logos, detailed descriptions, pros/cons, user reviews, and source/store links (GitHub for open-source, Microsoft Store for proprietary apps).

**When to use it:** After a fresh Windows install to quickly get your preferred software without browsing the web.

### Curated App List

Apps are sourced from a local `apps.json` file (not a live search) and organized into categories:

- **Browsers** — Firefox, Brave, Chrome, Edge, Vivaldi
- **Communication** — Discord, Slack, Signal, Telegram, WhatsApp
- **Development** — VS Code, Git, Node.js, Python, Windows Terminal, PowerShell 7
- **Media** — VLC, MPV, HandBrake, Audacity, OBS Studio
- **Utilities** — 7-Zip, Notepad++, Everything, PowerToys, WinDirStat, TreeSize
- **Gaming** — Steam, Epic Games, GOG Galaxy, Xbox App
- **Security** — Malwarebytes, Bitwarden, KeePassXC
- **Office** — LibreOffice, Notion, Obsidian

### Install Backend

- **winget** is the primary install method (built into Windows 10 2004+)
- **Chocolatey** is used as a fallback or for packages not available in winget
- Install status is tracked: installed apps show a green "Installed" badge; uninstalled apps show the **Install** button
- A real-time install log appears during installation showing stdout from winget/choco

### Install Status Tracking

WinOpt Pro queries `winget list` on page load to determine which apps are already installed and marks them accordingly. Status refreshes after each install.

---

## Apps & Packages — WSL Manager

**What it is:** A full graphical interface for managing Windows Subsystem for Linux (WSL 2), including distro lifecycle, resource configuration, desktop environment setup, and Linux GUI app support (WSLg).

**When to use it:** When you want to run Linux tools, develop in a Linux environment, or launch a full Linux desktop (XFCE4, KDE Plasma, GNOME) on Windows.

### Tabs

The WSL Manager is organized into three tabs:

#### Overview Tab

- **WSL Status** — whether WSL is enabled and which version (WSL 1 / WSL 2)
- **Default Distro** — displays the currently set default distribution
- **Linux Mode Card** — launch a full Linux desktop via WSLg; prompts for setup if not configured
- **Quick Stats** — total distros installed, running distros, kernel version

#### Distros Tab

Displays an 8-card grid of supported distributions:

| Distro | Publisher |
|--------|-----------|
| Ubuntu 22.04 LTS | Canonical |
| Ubuntu 24.04 LTS | Canonical |
| Debian | Debian Project |
| Fedora Remix | Fedora |
| Kali Linux | Offensive Security |
| openSUSE Leap | SUSE |
| Alpine Linux | Alpine |
| Arch Linux (unofficial) | Community |

Each card shows install status (installed / not installed / installing), running state, and action buttons:
- **Install** — runs `wsl --install -d <distro>`
- **Set Default** — runs `wsl --set-default <distro>`
- **Launch Terminal** — opens WSL in Windows Terminal
- **Stop** — runs `wsl --terminate <distro>`
- **Remove** — unregisters the distro (`wsl --unregister`) with a confirmation dialog
- **Export** / **Import** — tar backup/restore of the distro filesystem

#### Settings Tab

A graphical editor for `%USERPROFILE%\.wslconfig`:

| Setting | Control | Description |
|---------|---------|-------------|
| Memory limit | Slider (512 MB – system max) | Max RAM allocated to WSL2 VM |
| Processors | Slider (1 – logical core count) | vCPU count for WSL2 VM |
| Swap size | Slider (0 – 32 GB) | Virtual swap space |
| Networking mode | Select (NAT / bridged / mirrored) | Network topology |
| DNS tunneling | Toggle | Route DNS through WSL2 |
| Firewall | Toggle | Enable Windows firewall for WSL2 |
| WSLg (GUI support) | Toggle | Enable Linux GUI app support |
| Localhostforwarding | Toggle | Forward localhost ports to Windows |

Changes are written to `.wslconfig` and require a `wsl --shutdown` + restart to take effect (user is prompted).

**Danger Zone:** A collapsible section with a **Clean Uninstall WSL** button that removes all distros, removes the WSL optional feature, and cleans up the `.wslconfig` file. Requires explicit confirmation by typing "REMOVE WSL".

### Linux Mode (WSLg Desktop)

The Linux Mode card in the Overview tab allows launching a full graphical Linux desktop environment directly on Windows using WSLg.

**Requirements:**
- Windows 11 (WSLg is not available on Windows 10)
- A distro with a desktop environment installed (XFCE4, KDE Plasma, or GNOME)

**Actions:**
- **Launch Linux Mode** — fires the desktop environment in a WSLg window (fire-and-forget process)
- **Setup / Re-setup** — opens the 7-step WSL Setup Wizard

### WSL Setup Wizard

A 7-step full-screen modal that guides users through complete WSL setup:

| Step | Name | Content |
|------|------|---------|
| 1 | Welcome | Introduction to WSL and Linux Mode; prerequisites check |
| 2 | Enable WSL | Enables VirtualMachinePlatform and Microsoft-Windows-Subsystem-Linux features; installs WSL kernel update |
| 3 | Choose Distro | Card grid to pick a distribution to install |
| 4 | Configure Resources | Memory and processor sliders; writes `.wslconfig` |
| 5 | Desktop Environment | Choose between XFCE4 (lightweight), KDE Plasma (full-featured), or GNOME (standard) |
| 6 | Set as Default | Checklist: set as default distro, configure Windows Terminal profile, add desktop shortcut |
| 7 | Launch | Summary of what was configured; Launch button; stores completion state in localStorage |

---

## Apps & Packages — Driver Manager

**What it is:** A viewer for all installed Windows device drivers, with a focus on detecting unsigned drivers that may be a security or stability risk.

**When to use it:** After installing new hardware, after a Windows upgrade, or as part of a security audit.

### Driver List

Queries `Win32_PnPSignedDriver` via WMI and displays:
- Driver name and device class
- Driver version
- Driver date
- Provider / manufacturer
- **Signed** status (boolean badge)
- INF filename

Columns are sortable. The full list can be filtered by device class or signed status.

### Unsigned Driver Detection

The **Show Unsigned Only** toggle filters the list to display only drivers that do not have a valid Microsoft or WHQL digital signature. Unsigned drivers are highlighted in red.

### Export Driver List

The **Export** button generates a plain-text or CSV report of all installed drivers (optionally filtered to unsigned only) and saves it to a user-chosen path.

### Link to Windows Update

A shortcut card opens Windows Update's driver update section directly, making it easy to update outdated drivers.

---

## Apps & Packages — GPU Driver Cleaner

**What it is:** A tool for performing a clean uninstall of GPU drivers — removing the driver package, associated registry entries, and driver store files — without needing a third-party tool like DDU in Safe Mode.

**When to use it:** Before installing a new GPU, when switching GPU vendors (e.g., NVIDIA to AMD), or when troubleshooting display driver crashes.

### Driver Detection

On page load, queries installed GPU drivers using:
- `Win32_VideoController` WMI class
- `pnputil /enum-drivers` to enumerate the driver store

Results are displayed as cards grouped by vendor tab: **All / NVIDIA / AMD / Intel**.

Each driver card shows:
- GPU name
- Driver version and date
- INF file name in the driver store
- Vendor badge

### Clean Uninstall

The **Uninstall Now** button performs:
1. `pnputil /delete-driver <inf> /uninstall /force` — removes the driver from the driver store and uninstalls it from the device
2. A registry sweep removing residual NVIDIA/AMD/Intel keys from `HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968...}` and related locations

Before uninstalling, the user can check the **Delete from Driver Store** checkbox (checked by default) to ensure the driver does not reinstall automatically on next boot.

A **removal log** panel at the bottom of the page streams the output of each pnputil and registry operation in real time.

### Safe Mode Scheduling

The **Schedule Safe Mode Boot** button:
1. Adds a RunOnce registry entry to execute the pnputil uninstall at next boot
2. Configures a one-time Safe Mode boot via `bcdedit /set {current} safeboot minimal`
3. Prompts the user to reboot

This is the recommended path for stubborn drivers that cannot be removed while Windows is running normally.

### Reboot Integration

After uninstall (or scheduling), a **Reboot Now** prompt appears in the removal log panel. Clicking it calls the Rust `reboot_system` command which invokes `shutdown /r /t 5`.

---

## Apps & Packages — Startup Apps

**What it is:** A manager for all applications and services configured to run at Windows startup.

**When to use it:** To speed up Windows boot time by disabling unnecessary startup items.

### Entry List

Displays all startup items found in:
- `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
- `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
- `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` folder
- `%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup` folder
- Task Scheduler startup tasks

Each entry shows:
- Application name
- Publisher
- Startup type (Registry / Folder / Scheduled Task)
- Registry path or file path
- **Enabled / Disabled** status toggle

### Enable / Disable

The toggle switch next to each entry writes the appropriate registry value or renames the shortcut file with a `.disabled` extension. Changes are immediate and do not require a reboot (take effect on next login).

Disabled items are shown with reduced opacity and a "Disabled" badge.

---

## Utilities — Gaming Optimizer

**What it is:** An active monitoring and optimization tool for gaming sessions. It detects when a known game is running and can automatically apply performance tweaks, display a heads-up overlay, and capture before/after performance snapshots.

**When to use it:** Before and during gaming sessions for maximum in-game performance.

### Active Game Detection

WinOpt Pro polls the running process list every 5 seconds and compares against a list of 190+ known game executable names including:
`steam.exe, EpicGamesLauncher.exe, csgo.exe, cs2.exe, valorant.exe, fortnite.exe, cod.exe, rdr2.exe, cyberpunk2077.exe, eldenring.exe`, and more.

When a game is detected, the page header displays the detected game name and a "Game Active" badge.

### Gaming Overlay

The **Launch Overlay** button opens a transparent, always-on-top 340 x 150 pixel widget window that displays live metrics as colored pills:

| Pill | Metric | Color |
|------|--------|-------|
| CPU | CPU usage % | Blue |
| GPU | GPU usage % | Green |
| VRAM | VRAM usage in MB | Purple |
| TEMP | GPU temperature in °C | Amber |
| POWER | GPU power draw in W | Red |

The overlay is draggable anywhere on screen. It can be closed via its X button which emits an `overlay-closed` event back to the main window.

### Auto-Optimize

A toggle (persisted in `localStorage`) that automatically applies a curated set of gaming tweaks (`GAMING_TWEAK_IDS`) the moment a game process is detected. Tweaks are reverted when no game is running and the session is ended via the **Stop Session** button.

Auto-applied tweak IDs include: Game Mode, HAGS, dynamic tick, fullscreen optimization disable, Xbox game bar disable, and network throttling disable.

### Before / After Performance Baseline

1. Click **Capture Baseline** before applying tweaks or launching a game — records GPU %, GPU temp, GPU power, CPU %, and timestamp as the "before" snapshot
2. Apply tweaks or let Auto-Optimize run
3. View the **Before / After** panel which shows a side-by-side comparison of both snapshots
4. Difference values are shown in green (improvement) or red (regression)

---

## Utilities — Latency Optimizer

**What it is:** A diagnostic and tuning page focused on system-level latency — specifically Windows timer resolution, standby memory, and boot-time clock settings.

**When to use it:** For competitive gaming, audio production, real-time workloads, or any scenario where low and consistent latency matters.

### Timer Resolution Display

Uses `NtQueryTimerResolution` (Windows NT Native API via Rust FFI) to read:
- **Current resolution** — the active timer resolution in milliseconds (lower = better; 0.5 ms is optimal)
- **Minimum resolution** — the best resolution the hardware can achieve
- **Maximum resolution** — the lowest precision available (typically 15.625 ms)

A status badge indicates whether the current resolution is at its optimal minimum.

### Standby RAM Flush

The **Flush Standby List** button calls `NtSetSystemInformation` with `SystemMemoryListInformation` to clear the Windows standby memory list. The amount of RAM freed (in MB) is returned and displayed.

This is useful when RAM appears "used" by the standby list rather than actively allocated applications, and can reduce memory-related stuttering.

### Boot Settings Viewer

Reads and displays the current `bcdedit` configuration relevant to latency:

| Setting | Description |
|---------|-------------|
| Dynamic Tick | Whether the kernel uses variable timer interrupts (disable for lower latency) |
| Platform Clock | Whether Windows uses the platform timer instead of TSC |
| Hypervisor Launch Type | Whether Hyper-V / VBS hypervisor is active at boot |
| TSCSYNCPOLICY | Time Stamp Counter synchronization across cores |

### Link to Related Tweaks

A shortcut button opens the Tweaks page pre-filtered to the Gaming category, highlighting the `DisableDynamicTick` and `DisableVBS` tweaks.

---

## Utilities — Power Manager

**What it is:** A graphical interface for Windows power plans and detailed per-plan power settings, including battery health diagnostics on laptops.

**When to use it:** To switch between performance modes, fine-tune when the display turns off, or check battery wear level.

### Power Plan Switching

Lists all available Windows power plans:
- Balanced (default)
- High Performance
- Power Saver
- Ultimate Performance (if enabled)
- Any custom OEM plans

The active plan is highlighted. Clicking a plan card activates it via `powercfg /setactive <GUID>`.

### Battery Health

Reads battery information from WMI (`Win32_Battery`) and displays:
- **Design Capacity** — original rated capacity in mWh
- **Full Charge Capacity** — current maximum charge in mWh
- **Wear Level** — `(1 - FullCharge / DesignCapacity) * 100` as a percentage
- **Charge Status** — Charging / Discharging / Plugged In (not charging)
- **Estimated Remaining** — time remaining in hours:minutes
- Health badge: Excellent (<10% wear), Good (10–25%), Fair (25–40%), Poor (>40%)

On desktop PCs without a battery, this section shows "No battery detected."

### Per-Plan Settings

For the currently selected plan, displays and allows editing:

| Setting | AC (Plugged In) | DC (Battery) |
|---------|----------------|--------------|
| CPU Minimum % | Slider (0–100) | Slider (0–100) |
| CPU Maximum % | Slider (0–100) | Slider (0–100) |
| Display Turn Off | Slider (1 min – Never) | Slider (1 min – Never) |
| Sleep / Hibernate | Slider (1 min – Never) | Slider (1 min – Never) |

Changes are applied via `powercfg /setacvalueindex` and `powercfg /setdcvalueindex` and take effect immediately.

---

## Utilities — Windows Defender

**What it is:** A status and control page for Microsoft Defender Antivirus components.

**When to use it:** When you need to temporarily disable specific Defender components for troubleshooting, or to monitor Defender status.

### Defender Status

Reads the current state of key Defender components:
- **Real-Time Protection** — on/off
- **Cloud-Delivered Protection** — on/off
- **Automatic Sample Submission** — on/off
- **Tamper Protection** — on/off (note: cannot be disabled via registry when tamper protection is on)
- **Controlled Folder Access** — on/off
- **Network Protection** — enabled / audit / disabled

### Enable / Disable Components

Toggle switches for each component. Changes are written to:
- `HKLM\SOFTWARE\Policies\Microsoft\Windows Defender`
- `HKLM\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection`

A warning banner is displayed when Real-Time Protection is off.

---

## Utilities — Process Manager

**What it is:** A real-time process viewer with the ability to manage running processes directly from WinOpt Pro.

**When to use it:** To identify resource-hungry processes, terminate unresponsive applications, or adjust process priority.

### Process List

Queries the running process list every 3 seconds via the sysinfo Rust crate. Columns:

| Column | Description |
|--------|-------------|
| PID | Process ID |
| Name | Executable name |
| CPU % | Per-process CPU utilization |
| Memory | RAM usage in MB |
| Disk Read | Bytes read per second |
| Disk Write | Bytes written per second |
| Priority | Current Windows priority class |

The list is sortable by any column. A search box filters by process name.

### Kill Process

Right-click a process row (or use the row action menu) and select **Kill** to terminate the process. WinOpt Pro calls `TerminateProcess` via Rust. A confirmation dialog is shown for processes not owned by the current user.

### Set Priority

The priority sub-menu allows changing the Windows scheduling priority class:

| Priority | Windows Class |
|----------|--------------|
| Realtime | REALTIME_PRIORITY_CLASS |
| High | HIGH_PRIORITY_CLASS |
| Above Normal | ABOVE_NORMAL_PRIORITY_CLASS |
| Normal | NORMAL_PRIORITY_CLASS |
| Below Normal | BELOW_NORMAL_PRIORITY_CLASS |
| Idle | IDLE_PRIORITY_CLASS |

Setting "Realtime" requires administrator privileges and shows a warning.

### Open File Location

The **Open File Location** action opens Windows Explorer to the directory containing the process executable.

---

## Utilities — Network Analyzer

**What it is:** A network diagnostic tool that displays interface information and runs an active ping test with latency statistics.

**When to use it:** To diagnose network connectivity, measure latency and jitter, or identify packet loss.

### Network Interfaces

Displays all active network adapters with:
- Adapter name
- MAC address
- IPv4 address(es)
- IPv6 address(es)
- Bytes received (total and per-second)
- Bytes sent (total and per-second)
- Interface type badge (Ethernet / Wi-Fi / Loopback / VPN)

The list auto-refreshes every 3 seconds.

### Ping Tool

Enter a hostname or IP address and click **Start Ping** to begin a continuous ICMP ping test. Results are shown in a scrollable table and summary panel:

| Statistic | Description |
|-----------|-------------|
| Latency (ms) | Round-trip time of the most recent ping |
| Minimum | Lowest RTT observed in the session |
| Maximum | Highest RTT observed in the session |
| Average | Mean RTT across all pings |
| Jitter | Standard deviation of RTT |
| Packet Loss % | Percentage of pings that timed out or failed |

A real-time line chart plots latency over time. Presets for common targets (1.1.1.1, 8.8.8.8, google.com) are available as quick-select buttons.

---

## Utilities — Storage Optimizer

**What it is:** A comprehensive storage management tool covering drive health monitoring, TRIM optimization, storage usage, and scheduled maintenance tasks.

**When to use it:** To check drive health, run TRIM on SSDs, review disk usage, or set up automated cleanup.

### Drive Health (SMART)

Queries PowerShell `Get-PhysicalDisk` and `Get-StorageReliabilityCounter` to display per-drive SMART data:

| Attribute | Description |
|-----------|-------------|
| Wear % | Percentage of drive life consumed (SSD) |
| Temperature | Current drive temperature in °C |
| Read Errors | Count of uncorrectable read errors |
| Write Errors | Count of uncorrectable write errors |
| Power On Hours | Total hours the drive has been powered on |
| Health Status | Healthy / Warning / Unhealthy (from Windows Storage Spaces) |

Each drive is shown as a card with a drive-type badge (SSD / HDD / NVMe) and a health color indicator.

### TRIM Optimization

The **Run TRIM** button executes `Optimize-Volume -DriveLetter X -ReTrim -Verbose` via PowerShell for each eligible SSD. Output is streamed to a log panel. TRIM improves long-term SSD performance by notifying the drive which blocks are no longer in use.

### Storage Usage Overview

A horizontal bar chart per drive showing used vs. free space with GB values. Clicking a drive opens Windows Explorer to that drive root.

### Scheduled Maintenance Tasks

A list of Windows maintenance tasks related to storage:

- **Disk Cleanup (cleanmgr)** — scheduled via Task Scheduler
- **Storage Sense** — Windows built-in automatic storage cleanup
- **Defragment and Optimize Drives (SysMain)** — scheduled defragmentation

Each task can be:
- **Run Now** — triggers the task immediately via `schtasks /run`
- **Enable / Disable** — changes the task's enabled state
- **View Schedule** — shows the current trigger

### Storage Sense Integration

A toggle to enable/disable Windows Storage Sense (`HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Config\StorageSenseSetting`) and a link to the Storage Sense settings page in Windows Settings.

---

## Utilities — System Report

**What it is:** Generates a comprehensive HTML report of the system's hardware, software, drivers, applied tweaks, and current settings.

**When to use it:** To document a system configuration, share diagnostics with support, or create a snapshot before making major changes.

### Report Contents

The generated HTML report includes:
- System overview (computer name, OS version, uptime)
- Hardware summary (CPU model, RAM, GPU, motherboard, BIOS version)
- Storage devices list
- Network adapters
- All installed drivers
- Currently applied WinOpt Pro tweaks
- Privacy Audit results
- Startup items list
- Windows Update status
- Defender status

### Save to File

The **Save Report** button opens a file save dialog and writes the HTML file to the chosen path. The report is self-contained (no external dependencies) and can be opened in any browser.

---

## System — Profiles

**What it is:** Named configuration snapshots of the current tweak state. Allows saving, loading, and sharing sets of tweaks.

**When to use it:** To switch between different optimization configurations (e.g., "Gaming Mode" vs. "Work Mode"), or to share a configuration with others.

### Profile Operations

- **Save Current State as Profile** — captures which tweaks are applied and stores as a named profile in the local SQLite database
- **Load Profile** — applies all tweaks in the saved profile and reverts any tweaks not in the profile
- **Delete Profile** — removes the named profile permanently
- **Export Profile** — saves the profile as a `.winopt` JSON file for sharing
- **Import Profile** — loads a `.winopt` file and makes it available in the list

Profiles include metadata: name, creation date, number of tweaks, description (optional).

---

## System — History & Audit Log

**What it is:** A chronological log of every tweak operation performed by WinOpt Pro, with field-level AES-256-GCM encryption on sensitive command data.

**When to use it:** To review what changes have been made, audit the system for unauthorized modifications, or revert a specific operation.

### Encryption

The `command_executed`, `stdout`, and `stderr` fields of each log entry are encrypted with AES-256-GCM. The encryption key is derived from `SHA-256(MachineGuid)` — unique per machine, never leaves the device. Entries are prefixed with `enc:` for backward compatibility detection.

### Log Viewer

Displays all history entries in a table:

| Column | Description |
|--------|-------------|
| Timestamp | Date and time of the operation |
| Tweak Name | Human-readable tweak name |
| Operation | Apply or Revert |
| Status | Success or Error |
| User | Windows username that performed the action |

### Filtering

- Filter by date range (from / to date pickers)
- Filter by operation type (Apply / Revert)
- Filter by status (Success / Error)
- Free-text search on tweak name

### Revert from History

Each log entry has a **Revert** button that re-runs the inverse of that specific operation, regardless of the current tweak state. This is useful for reverting individual tweaks that may have been part of a larger batch.

---

## System — Settings

**What it is:** Application-wide configuration for WinOpt Pro.

### Theme

- **Dark / Light** mode toggle — respects system preference by default, can be overridden
- **Color Scheme** — 5 accent color themes:
  - Violet (default)
  - Teal
  - Rose
  - Amber
  - Emerald

Theme and color scheme selections are persisted in localStorage.

### Expert Mode

A toggle to unlock Red-risk tweaks application-wide. Equivalent to the toggle on the Tweaks page header. Persisted in localStorage.

### AI Assistant

- **Ollama Endpoint** — text field to configure the local Ollama API URL (default: `http://localhost:11434`)
- **Model** — text field to specify the Ollama model name (default: `llama3`)
- A **Test Connection** button pings the Ollama API and reports whether the model is available

### Backup & Restore

- **Export Backup** — saves the current applied-tweak state, profiles, and settings to a `.winopt` JSON file
- **Import Backup** — loads a `.winopt` file and restores the state
- **Backup Info** — displays the date and contents of the most recent backup file
- Backup files use the schema `{ version, date, tweaks, profiles, settings }` and are human-readable JSON

### About

- Application version number
- Tauri and WebView2 runtime versions
- Link to GitHub repository
- License information (MIT)

---

## System — Help Center

**What it is:** A comprehensive built-in knowledge base for WinOpt Pro. Provides searchable documentation, an interactive tweak browser, category guides, keyboard shortcuts reference, FAQ, and a getting-started walkthrough — all without leaving the app.

**When to use it:** When you want to understand what a tweak does before applying it, learn keyboard shortcuts, get answers to common questions, or find the right optimization for your goal.

### Tweaks Browser

- Browse all 162 tweaks organized by category
- Enable/Disable any tweak directly from the Help page — changes sync immediately with the Tweaks page (shared Zustand state via `useAppStore`)
- Expand each tweak card to see full description, risk level, apply/revert commands, and whether a reboot is required
- Filter by category tab or use the search input to find tweaks by name or description

### Category Guides

Quick-reference cards for each tweak category explaining what the category covers, who it is for, and recommended starting tweaks:

| Guide | Audience | Focus |
|-------|----------|-------|
| Performance | All users | Memory, CPU scheduling, visual effects |
| Gaming | Gamers | Latency, GPU priority, game mode |
| Privacy | Privacy-conscious | Telemetry, diagnostic data, advertising ID |
| Network | All users | TCP tuning, DNS, Nagle algorithm |
| Power | Laptop/desktop | Power plans, USB power management |
| Security | All users | Mitigations, VBS, SMBv1, autorun |
| Debloat | All users | Remove pre-installed apps, Xbox, Widgets |
| Windows UI | Power users | Taskbar, Start menu, animations |

### Keyboard Shortcuts Reference

A visual panel showing all application keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| Ctrl + K | Open Command Palette |
| Ctrl + , | Open Settings |
| Ctrl + H | Open History / Audit Log |
| Esc | Close modal or overlay |

### FAQ

An accordion FAQ covering the most common questions about safety, risk levels, admin requirements, Expert Mode, reversibility, and performance expectations.

### Getting Started

A step-by-step quick-start walkthrough for new users, covering first launch, running a Privacy Audit, applying Safe tweaks, and setting up Gaming Optimizer.

---

## Cross-Cutting Features

### Command Palette (Ctrl+K)

A fuzzy-search modal (opens with Ctrl+K or via toolbar button) that provides instant navigation to any page, tweak, or action in WinOpt Pro.

- Type any keyword to search across all pages, tweak names, and settings
- Uses a Web Worker for non-blocking semantic search
- Results are grouped by type (Navigation / Tweaks / Actions)
- Arrow key navigation, Enter to activate
- Escape to close

### AI Assistant

A chat sidebar powered by a local Ollama LLM. All inference runs locally — no data is sent to any external server.

- Type a question in the input box and press Enter
- The assistant has context about WinOpt Pro features and can answer questions like "which tweaks improve gaming performance?" or "is it safe to disable VBS?"
- Chat history is kept in session memory and cleared on app restart
- Configurable endpoint and model via Settings

### Toast Notifications

Non-intrusive overlay notifications appear in the bottom-right corner for:
- Tweak apply / revert success and failure
- Background task completion
- Error messages from Rust commands

Toasts auto-dismiss after 4 seconds. Error toasts require manual dismissal.

### Sidebar Navigation

The left sidebar contains all navigation links organized into 4 collapsible groups:
- **Tuning** — Tweaks, Privacy Audit
- **Apps** — App Store, WSL Manager, Driver Manager, GPU Driver Cleaner, Startup Apps
- **Utilities** — Gaming Optimizer, Latency Optimizer, Power Manager, Defender, Process Manager, Network Analyzer, Storage Optimizer, System Report
- **System** — Profiles, History, Settings

Each group is expanded by default. Groups collapse with a click to reduce visual clutter. On narrow windows the sidebar collapses to icon-only mode.

A **sidebar search** field at the top of the sidebar filters navigation items by name.

### Responsive Layout

WinOpt Pro adjusts to the window size:
- Standard width (>= 860 px): full sidebar with text labels
- Narrow width (< 860 px): icon-only sidebar; hover tooltips show page names

---

*Last updated: 2026-03-11*
