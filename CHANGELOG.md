# Changelog

All notable changes to WinOpt Pro are documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions. Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_Changes staged for the next release will appear here._

---

## [1.1.0] - 2026-03-11

### Summary

Post-launch enhancements: expanded game detection library, comprehensive Help Center with interactive tweak browser, complete app catalog metadata, and extended test coverage.

### Added

- **Help Center** (`HelpPage.tsx`) — searchable knowledge base with:
  - Interactive Tweaks Browser: browse all 162 tweaks by category with live Enable/Disable toggle; uses shared `useAppStore` state so changes reflect immediately on the Tweaks page
  - Category guides (Performance, Gaming, Privacy, Network, Power, Security, Debloat, Windows UI)
  - Keyboard shortcuts reference panel
  - FAQ accordion (common questions and answers)
  - Getting Started quick-start section
- Help Center nav item added to Sidebar under the System group
- `validationCmd` populated for 8 tweaks that were missing it (USB Selective Suspend, PCIe Link State PM, Adaptive Brightness, CPU Boost mode, Min CPU State, Flush DNS, Reset Winsock, Explorer Folder Discovery)

### Changed

- **Gaming Optimizer** — game detection expanded from 32 → 190+ known executables across categories: AAA titles, competitive FPS, open-world RPGs, survival, simulation, strategy, VR, indie, and all major game launchers (Steam, Battle.net, Epic, GOG, EA, Rockstar, Ubisoft, itch.io, etc.)
- **App Store** — all 391 apps now have complete metadata:
  - GitHub repository links for 105+ open-source apps
  - SourceForge links for legacy open-source projects (7-Zip, Dual Monitor Tools, FFmpeg Batch, SDIO)
  - Microsoft Store links for 60+ proprietary/freeware apps (Discord, Spotify, iTunes, foobar2000, etc.)
  - Official download page links for remaining apps
  - Fixed corrupted `HWiNFO®` name encoding
  - Fixed 14 broken logo paths (new Game Launcher + Media apps now use UI-avatars)
  - Expanded 12 short descriptions to full detail
- Removed unused npm dependencies: `radix-ui`, `class-variance-authority`, `clsx`

### Fixed

- `App.tsx`: `handleSelectTweak` typed as `(tweak: Tweak)` (was `any`)
- `SettingsPage`: onboarding re-trigger now calls `onTriggerGuide?.()` instead of `window.location.reload()`

### Tests

- Test suite expanded from 417 → **643 tests across 58 files**
- 19 new test files added:
  - Pages: Dashboard, GamingPage, HelpPage, PrivacyAuditPage, LatencyPage, DriverManagerPage, GamingOverlayPage, SystemReportPage, AppDetailsPage, TweaksPage
  - Hooks: useBackup, useDrivers, useGaming, useGlobalCache, useLatency, usePrivacyAudit, useScheduler, useSmartStore, useSystemReport

---

## [1.0.0] - 2026-03-04

### Summary

Full initial production release of WinOpt Pro. This release represents the completion of all planned modules and features across four implementation phases. 417 automated tests passing across 39 test files.

### Added — Core Application

- Full Tauri 2 + React 19 + Rust desktop application for Windows 10 2004+ and Windows 11
- Custom view-switching via React state (no router dependency)
- Tailwind CSS 4 with `@tailwindcss/vite` plugin (CSS-based config, no `tailwind.config.js`)
- shadcn/ui component library integrated via CLI (`src/components/ui/`)
- Dark/light theme with 5 color scheme accents: Violet, Teal, Rose, Amber, Emerald
- Persistent theme and color scheme selection via localStorage
- Collapsible sidebar with 4 navigation groups: Tuning, Apps, Utilities, System
- Icon-only sidebar mode for narrow window widths
- Sidebar full-text search field
- Command Palette (Ctrl+K) with fuzzy search across all pages, tweaks, and actions; Web Worker-based semantic search
- AI Assistant sidebar powered by local Ollama LLM; all inference runs on-device
- Toast notification system with auto-dismiss and error persistence
- Onboarding modal for first-launch experience
- Error boundary for graceful runtime error handling
- Expert Mode gate component (blocks Red-risk tweaks by default)

### Added — Tweaks System

- 165 system tweaks across 10 categories (Performance: 17, Gaming: 19, Privacy: 48, Network: 20, Power: 11, Security: 15, Debloat: 13, Windows UI: 14, Windows Update: 5, Tools: 9)
- Risk-level classification: Green / Yellow / Red
- Full-text search and multi-filter (category, risk, applied state)
- One-click apply and revert per tweak with original value capture
- Batch deploy with Confirm Deploy Modal and live Progress Modal
- Revert All operation
- Educational overlay per tweak (what it does, exact key/command, pros, cons, reboot requirement)
- Expert Mode toggle (unlocks Red tweaks); persisted in localStorage
- DNS provider selector with 9 presets (Cloudflare, Google, Quad9, AdGuard, Mullvad, NextDNS, OpenDNS, ControlD, ISP Default)
- Reboot-required badge on applicable tweak cards

### Added — Privacy Audit

- 9-item automated telemetry and privacy scan:
  1. Telemetry level (AllowTelemetry registry key)
  2. DiagTrack service state
  3. Advertising ID (`AdvertisingInfo\Enabled`)
  4. Activity History (PublishUserActivities, UploadUserActivities)
  5. Location Services consent key
  6. App Diagnostics permission
  7. Connected User Experiences service
  8. CEIP participation
  9. Windows Error Reporting service and registry
- Per-issue severity display (Pass / Warning / Fail)
- Fix All Issues batch action
- Re-Scan to verify fixes

### Added — Dashboard

- Real-time system vitals: CPU%, RAM (used/total GB), disk I/O (bytes/s), GPU usage%, VRAM (used/total MB), network (rx+tx bytes/s)
- Health score (0–100) with color-coded badge
- Quick-action cards: Run Privacy Audit, Apply Recommended Tweaks, Clean Startup, Open Gaming Optimizer
- Recent activity list (last 10 audit log entries)

### Added — Gaming Optimizer

- Active game detection: polls running processes every 5 seconds against 32 known game executables
- Gaming overlay window: transparent 340x150 always-on-top widget with CPU, GPU, VRAM, TEMP, POWER pills
- Overlay drag support via `startDragging()`
- Overlay close event (`overlay-closed`) propagated back to main window
- Auto-optimize toggle: batch-applies GAMING_TWEAK_IDS on game detect; reverts on session stop; persisted in localStorage
- Before/after performance baseline: `captureBaseline()` snapshot of GPU%, temp, power, CPU%; side-by-side comparison panel with improvement/regression delta display
- GpuSnapshot interface in `useGaming` hook

### Added — Latency Optimizer

- Timer resolution display: current, minimum, maximum (via `NtQueryTimerResolution` FFI)
- Standby RAM flush: `NtSetSystemInformation(SystemMemoryListInformation)` with MB freed returned
- Boot settings viewer: reads `bcdedit` output for dynamic tick, platform clock, hypervisor launch type, TSCSYNCPOLICY
- Link to Tweaks page pre-filtered to Gaming category

### Added — GPU Driver Cleaner

- GPU driver detection via WMI `Win32_VideoController` and `pnputil /enum-drivers`
- Vendor tabs: All / NVIDIA / AMD / Intel
- Delete-from-driver-store checkbox
- Uninstall Now: `pnputil /delete-driver <inf> /uninstall /force` + registry sweep
- Schedule Safe Mode Boot: RunOnce registry entry + `bcdedit /set {current} safeboot minimal`
- Real-time removal log panel
- Reboot integration via Rust `reboot_system` command (`shutdown /r /t 5`)

### Added — WSL Manager

- WSL status display (enabled, version, default distro)
- 8-distro card grid: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Debian, Fedora Remix, Kali Linux, openSUSE Leap, Alpine Linux, Arch Linux
- Per-distro actions: Install, Set Default, Launch Terminal, Stop, Remove, Export, Import
- `.wslconfig` graphical editor: memory slider, processor slider, swap slider, networking mode, DNS tunneling, firewall, WSLg toggle, localhostforwarding
- Linux Mode card: launch full graphical desktop (XFCE4, KDE Plasma, GNOME) via WSLg (Windows 11 only)
- WSL Setup Wizard: 7-step full-screen modal (Welcome → Enable → Choose Distro → Configure Resources → Desktop Environment → Set Default → Launch); completion state stored in localStorage
- Danger Zone: clean uninstall with "REMOVE WSL" confirmation
- 3-tab layout: Overview / Distros / Settings
- 16 Rust WSL commands: full distro lifecycle, `check_desktop_envs`, `install_desktop_env`, `launch_linux_mode` (fire-and-forget), `get_wsl_setup_state`, `shutdown_wsl`

### Added — Driver Manager

- Full driver list via WMI `Win32_PnPSignedDriver`
- Columns: name, device class, version, date, provider, signed status, INF filename
- Sortable columns, filter by class or signed status
- Unsigned-only filter toggle with red highlighting
- Export driver list to text/CSV
- Link shortcut to Windows Update driver section

### Added — Process Manager

- Real-time process list (3-second refresh): PID, name, CPU%, memory MB, disk read/write bytes/s, priority class
- Sortable columns, search by process name
- Kill process with TerminateProcess (confirmation for non-owned processes)
- Set priority: Realtime, High, Above Normal, Normal, Below Normal, Idle
- Open file location in Windows Explorer

### Added — Network Analyzer

- Network interfaces list: name, MAC, IPv4, IPv6, rx/tx bytes total and per-second, type badge (Ethernet/Wi-Fi/Loopback/VPN)
- Auto-refresh every 3 seconds
- Ping tool: hostname/IP input, continuous ICMP ping, latency ms, min, max, average, jitter, packet loss%
- Real-time latency line chart
- Quick-select presets: 1.1.1.1, 8.8.8.8, google.com

### Added — Storage Optimizer

- Drive health via PowerShell `Get-PhysicalDisk` + `Get-StorageReliabilityCounter`: wear%, temperature, read errors, write errors, power-on hours, health status
- Drive type badge: SSD / HDD / NVMe
- TRIM optimization: `Optimize-Volume -ReTrim -Verbose` per eligible drive; streamed log output
- Storage usage bar chart per drive (used / free GB)
- Scheduled maintenance tasks list with Run Now, Enable/Disable, View Schedule
- Storage Sense toggle and settings link

### Added — Power Manager

- Power plan list via `powercfg /list`; active plan highlighted; one-click activation
- Battery health from WMI `Win32_Battery`: design capacity, full charge capacity, wear %, charge status, estimated remaining time; health badge
- Per-plan settings (AC + DC): CPU min%, CPU max%, display timeout, sleep timeout — via `powercfg /setacvalueindex` / `powercfg /setdcvalueindex`

### Added — App Store

- Curated local `apps.json` catalog (not live winget search): Browsers, Communication, Development, Media, Utilities, Gaming, Security, Office categories
- winget primary install backend; Chocolatey fallback
- Install status tracking via `winget list` on page load
- Real-time install log during installation
- "Recommended Apps" heading and category filter tabs

### Added — Startup Apps

- Startup entry scan: HKCU Run, HKLM Run, user Startup folder, ProgramData Startup folder, Task Scheduler startup tasks
- Per-entry columns: name, publisher, type, path, enabled status
- Enable/Disable toggle (registry value or `.disabled` file rename)

### Added — Windows Defender

- Defender component status: Real-Time Protection, Cloud-Delivered Protection, Automatic Sample Submission, Tamper Protection, Controlled Folder Access, Network Protection
- Enable/Disable toggles per component
- Warning banner when Real-Time Protection is off

### Added — Profiles

- Named profile save/load/delete
- Profile export to `.winopt` JSON file
- Profile import from `.winopt` file
- Profile metadata: name, creation date, tweak count, description

### Added — History & Audit Log

- AES-256-GCM field encryption on `command_executed`, `stdout`, `stderr`; key = SHA-256(MachineGuid); `enc:` prefix for backward compatibility
- Log viewer: timestamp, tweak name, operation (Apply/Revert), status, user
- Filter by date range, operation type, status; free-text search on tweak name
- Revert from history entry

### Added — Settings

- Theme: dark/light toggle + 5 color scheme options
- Expert Mode toggle (machine-wide, persisted)
- AI Assistant: Ollama endpoint and model configuration; Test Connection button
- Backup & Restore: export/import `.winopt` backup files; backup info panel
- About: version, Tauri/WebView2 runtime versions, GitHub link, license

### Added — System Report

- HTML system report: hardware summary, OS, storage, network adapters, drivers, applied tweaks, privacy audit results, startup items, Windows Update status, Defender status
- Save report to file via dialog

### Tests

- 417 automated tests across 39 test files (Vitest)
- Component tests: ConfirmDeployModal, ProgressModal, TweaksPage, Dashboard, CommandPalette, ExpertModeGate, OnboardingModal, Sidebar, ErrorBoundary, ToastSystem, AIAssistantChat
- Hook tests: useDefender, useProcesses, useStartupItems, useStorage, useNetwork, useTweakExecution, useSystemVitals, useTheme, useApps, useElevation, usePower, useGpuDriver, useWsl
- Page integration tests: TweaksPage, DefenderPage, HistoryPage, SettingsPage, ProfilesPage, StartupPage, StoragePage, NetworkAnalyzerPage, ProcessPage, PowerPage, AppsPage
- Utility tests: filterTweaks data integrity

---

## [0.9.0] - 2026-03-01

### Added

- Gaming Optimizer page with game detection (32 known process names, 5-second polling)
- CPU% pill in Gaming Overlay (in addition to GPU, VRAM, TEMP, POWER)
- Auto-optimize toggle: automatically applies gaming tweaks on game detect; persisted in localStorage
- Before/after performance baseline panel with side-by-side snapshot comparison and delta display
- Latency Optimizer page: timer resolution display, standby RAM flush, boot settings viewer, `latency.rs` Rust module
- `latency.rs`: `get_latency_status` (NtQueryTimerResolution FFI + bcdedit parse + standby RAM WMI), `flush_standby_list`, `get_bcdedit_settings`
- Storage SMART health: `DiskSmartInfo` struct, `get_disk_smart_status` (PowerShell Get-PhysicalDisk + Get-StorageReliabilityCounter), `run_trim_optimization`
- 5 new tweaks:
  - **DisableVBS** (Security) — disables Virtualization-Based Security
  - **DisableMemoryCompression** (Performance) — disables Windows memory compression
  - **DisableDynamicTick** (Gaming) — disables kernel variable timer tick
  - **EnableWriteBackCache** (Performance) — enables disk write-back caching
  - **DisableFTH** (Performance) — disables Fault Tolerant Heap

### Changed

- Tweak category counts updated: Performance 17, Gaming 19, Security 15, total ~162
- Gaming Overlay: added CPU pill for complete at-a-glance monitoring

---

## [0.8.0] - 2026-02-28

### Added

- GPU Driver Cleaner module: `gpu_driver.rs` backend + `GpuDriverPage.tsx` + `useGpuDriver.ts`
  - `get_gpu_drivers` (WMI + pnputil), `uninstall_gpu_drivers` (pnputil + registry sweep), `schedule_safe_mode_removal` (RunOnce), `reboot_system`
  - Warning banner, driver cards with vendor tabs (All/NVIDIA/AMD/Intel), delete-driver-store checkbox, removal log with reboot prompt
- WSL Manager module: `wsl.rs` backend + `WslPage.tsx` + `useWsl.ts` + `WslSetupWizard.tsx`
  - 16 Rust WSL commands covering full distro lifecycle
  - 3-tab WSL Manager (Overview/Distros/Settings)
  - 8-distro install grid with installing state
  - `.wslconfig` graphical editor with toggles and selects
  - Danger zone with clean uninstall confirmation
  - 7-step WSL Setup Wizard full-screen modal

### Tests

- 42 new tests across 5 files covering GPU Driver Cleaner and WSL Manager

---

## [0.7.0] - 2026-02-25

### Added

- Privacy Audit module: `privacy.rs` + `PrivacyAuditPage.tsx` + `usePrivacyAudit.ts` (9 telemetry/registry/service checks)
- Driver Manager module: `drivers.rs` + `DriverManagerPage.tsx` + `useDrivers.ts` (WMI Win32_PnPSignedDriver, unsigned driver detection, export)
- System Report: `report.rs` + `SystemReportPage.tsx` + `useSystemReport.ts` (HTML report generation and save)
- Backup & Restore: `backup.rs` + Settings page section + `useBackup.ts` (.winopt JSON export/import)
- AI Assistant: Ollama-based chat sidebar + endpoint/model config in Settings + `useAIAssistant` hook
- Command Palette: Ctrl+K modal + Web Worker semantic search + `useCommandPalette` hook
- GPU info in SystemVitals: `GpuInfo` struct + Win32_VideoController in `system.rs`
- AES-256-GCM field encryption in `db.rs`: `command_executed`, `stdout`, `stderr` fields encrypted; key = SHA-256(MachineGuid); `enc:` prefix; Cargo.toml: aes-gcm 0.10, sha2 0.10, base64 0.22

### Changed

- Sidebar: added Privacy Audit (ShieldCheck), Driver Manager (Cpu), System Report (FileText) nav items to utilNavItems group

---

## [0.6.0] - 2026-02-20

### Added

- Process Manager: `process.rs` + `ProcessPage.tsx` + `useProcesses.ts` (real-time process list, kill, set priority, open file location)
- Network Analyzer: `network.rs` + `NetworkAnalyzerPage.tsx` + `useNetwork.ts` (interfaces, ping/jitter/packet loss, 3-second auto-refresh)
- Storage Optimizer: `storage.rs` + `StoragePage.tsx` + `useStorage.ts` (usage overview, Storage Sense toggle, scheduled maintenance tasks)
- Power Manager: `power.rs` extended + `PowerPage.tsx` + `usePower.ts` (power plan switching, battery health WMI, per-setting AC/DC timeouts via powercfg)
- `scheduler.rs`: list/create/delete/run_now maintenance tasks via `schtasks.exe`

### Changed

- Sidebar: added Process (Activity), Network (Wifi), Storage (HardDrive), Power (Battery) nav items

---

## [0.5.0] - 2026-02-15

### Added

- Startup Apps manager: `startup.rs` + `StartupPage.tsx` + `useStartupItems.ts` (HKCU/HKLM Run, Startup folders, Task Scheduler; enable/disable per entry)
- App Store: `AppsPage.tsx` + local `apps.json` curated catalog; winget primary + Chocolatey fallback; install status tracking; install log
- Windows Defender support page: `DefenderPage.tsx` + `useDefender.ts` (component status display and toggles)

### Changed

- Sidebar: added Startup, App Store, Defender nav items

---

## [0.4.0] - 2026-02-10

### Added

- Full Rust backend implementation: `system.rs`, `tweaks.rs`, `db.rs`, `startup.rs`, `storage.rs`, `process.rs`, `network.rs`, `security.rs`
- 157 system tweaks across 10 categories in `tweaks.json`
- SQLite database via `db.rs` for tweak state persistence and audit log
- Profiles page: `ProfilesPage.tsx` (save, load, delete named profiles)
- History/Audit Log page: `HistoryPage.tsx` (chronological log, filter, revert from history)
- Tauri commands: `apply_tweak`, `revert_tweak`, `get_tweak_status`, `get_system_vitals`, `get_audit_log`, `save_profile`, `load_profile`

---

## [0.1.0] - 2026-02-01

### Added

- Initial project scaffolding: Tauri 2 + React 19 + Rust
- Vite build system with `@tauri-apps/plugin-*` integrations
- TypeScript configuration (`tsconfig.json`, `tsconfig.node.json`)
- Vitest test harness (`vitest.config.ts`, `src/test/setup.ts`)
- Basic UI shell: App.tsx with view-switching state
- Left sidebar navigation with nav group structure
- Dark/light theme foundation with Tailwind 4
- Color scheme token system in CSS
- CSP set to null in `tauri.conf.json` (development phase)

---

[Unreleased]: https://github.com/[your-org]/winopt-pro/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/[your-org]/winopt-pro/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/[your-org]/winopt-pro/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/[your-org]/winopt-pro/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/[your-org]/winopt-pro/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/[your-org]/winopt-pro/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/[your-org]/winopt-pro/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/[your-org]/winopt-pro/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/[your-org]/winopt-pro/compare/v0.1.0...v0.4.0
[0.1.0]: https://github.com/[your-org]/winopt-pro/releases/tag/v0.1.0
