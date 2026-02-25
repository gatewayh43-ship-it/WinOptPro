# WinOpt Pro — Implementation Plan
> Living document. Last updated: 2026-02-25.
> Stack: Tauri 2 (Rust) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · shadcn/ui

---

## Table of Contents
1. [Vision & Goals](#1-vision--goals)
2. [Personas & User Stories](#2-personas--user-stories)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Acceptance Criteria (Gherkin)](#5-acceptance-criteria-gherkin)
6. [Architecture](#6-architecture)
7. [Data Models](#7-data-models)
8. [IPC Command Interface](#8-ipc-command-interface)
9. [Module Breakdown & Feature Roadmap](#9-module-breakdown--feature-roadmap)
10. [Phased Delivery Plan](#10-phased-delivery-plan)
11. [File-Level Change Map](#11-file-level-change-map)
12. [Risk Register](#12-risk-register)

---

## 1. Vision & Goals

WinOpt Pro is the **all-in-one Windows 10/11 optimization platform** for power users, gamers, and privacy-conscious users. It replaces a fragmented ecosystem of tools (CCleaner, Razer Cortex, MSI Afterburner, Process Hacker) with a single beautiful, safe, and reversible tool.

**Core principles:**
- **Safe first**: every change is reversible; no silent failures
- **Educated decisions**: explain what each change does before it happens
- **Real data only**: no hardcoded metrics; everything from live system queries
- **Privacy-preserving**: no telemetry from WinOpt itself; all data stays local

---

## 2. Personas & User Stories

### Persona A — Power User / Tech Enthusiast
> Deep Windows knowledge; seeks maximum performance control and transparency.

| ID | User Story | Priority |
|----|-----------|----------|
| US-A1 | As a power user, I want to review detailed technical docs (howItWorks, pros/cons, PowerShell code) for each tweak before applying so I can make informed decisions. | P0 |
| US-A2 | As a power user, I want to execute multiple tweaks in a single batch with a progress tracker so I can apply comprehensive optimizations efficiently. | P0 |
| US-A3 | As a power user, I want to revert any applied tweak with one click, including a confirmation showing the exact revert command. | P0 |
| US-A4 | As a power user, I want to see a real-time history timeline of all changes with before/after system vitals so I can measure impact. | P1 |
| US-A5 | As a power user, I want to export my tweak profile as a `.winopt` JSON file so I can apply the same setup on another machine. | P1 |
| US-A6 | As a power user, I want expert mode that unlocks Red-level tweaks with additional warnings so I can push system limits. | P2 |

### Persona B — Gaming Enthusiast
> Focuses on FPS, latency, and exclusive fullscreen. Sessions are time-critical.

| ID | User Story | Priority |
|----|-----------|----------|
| US-B1 | As a gamer, I want to apply all gaming tweaks (core parking, game priority, FSO, DVR) with a single "Gaming Mode" button. | P0 |
| US-B2 | As a gamer, I want real-time FPS and system metrics visible in a transparent in-game overlay so I can monitor performance without alt-tabbing. | P1 |
| US-B3 | As a gamer, I want WinOpt to auto-detect when I launch a game and apply gaming optimizations automatically. | P1 |
| US-B4 | As a gamer, I want GPU overclocking controls (core clock, memory, power limit, fan curve) directly in the app. | P2 |

### Persona C — Privacy-Conscious User
> Concerned about telemetry, Windows tracking, and data exfiltration.

| ID | User Story | Priority |
|----|-----------|----------|
| US-C1 | As a privacy user, I want a one-click Privacy Audit that scans all telemetry settings, tracking services, and firewall rules. | P0 |
| US-C2 | As a privacy user, I want a Privacy Score (0–100) so I can understand my exposure at a glance. | P0 |
| US-C3 | As a privacy user, I want to disable all Microsoft telemetry with a single "Harden Privacy" action with a preview of all changes. | P0 |
| US-C4 | As a privacy user, I want an encrypted local audit log of every system change made by WinOpt. | P1 |

### Persona D — IT Professional / SysAdmin
> Managing multiple machines; needs reproducibility, scripting, and compliance.

| ID | User Story | Priority |
|----|-----------|----------|
| US-D1 | As an IT pro, I want to generate a comprehensive system report (hardware, drivers, services, Windows build) as a PDF/ZIP. | P1 |
| US-D2 | As an IT pro, I want to compare my system against CIS Benchmark or Microsoft Security Baseline and export a compliance report. | P2 |
| US-D3 | As an IT pro, I want to schedule automated maintenance tasks (disk cleanup, temp file removal) to run at off-peak hours. | P2 |
| US-D4 | As an IT pro, I want to backup/restore all WinOpt settings (profiles, preferences, history) as an encrypted file. | P2 |

### Persona E — Casual User
> Wants a speed boost without understanding technicalities.

| ID | User Story | Priority |
|----|-----------|----------|
| US-E1 | As a casual user, I want a "Quick Scan" that automatically selects all safe (Green) tweaks so I can optimize without risk. | P0 |
| US-E2 | As a casual user, I want the app to show me in plain English what changed and whether it improved performance. | P1 |
| US-E3 | As a casual user, I want the onboarding guide to appear only on first launch and explain key features clearly. | P0 |

---

## 3. Functional Requirements

### FR-01: System Information Retrieval *(Critical — currently hardcoded)*
- Real-time: CPU temp, usage %, clock speed; RAM used/total; Drive temp + SMART; Network latency, adapter speed
- Refresh interval: configurable (default 3s)
- Source: WMI queries via Rust Tauri commands
- Graceful fallback: if WMI unavailable, show "Unavailable" not crash

### FR-02: Tweak Execution with Elevation
- Execute any `execution.code` PowerShell command from `tweaks.json`
- Detect if admin rights available before attempting
- Show UAC elevation prompt via Tauri when required
- Return stdout/stderr + exit code to frontend
- Validate success via `validationCmd` after execution

### FR-03: Tweak State Validation on Load
- On page load for each category, run `validationCmd` for all tweaks in that category
- Show toggle as ON (green dot) if validation passes, OFF if not, UNKNOWN if cmd is empty
- Re-validate after each apply/revert

### FR-04: Tweak Revert / Undo
- Every tweak has `revertCode` in `tweaks.json`; expose "Undo" toggle in UI
- Maintain undo stack: last 50 operations
- Support "revert to timestamp": find all tweaks applied after T and revert in reverse order

### FR-05: Tweak History & Audit Log
- Persist all apply/revert operations to local SQLite DB
- Record: tweak ID, name, action, timestamp, command executed, stdout, stderr, status
- Display as timeline in Dashboard

### FR-06: Batch Deploy with Progress & Rollback
- Execute N tweaks sequentially with per-item progress feedback
- On failure: surface error with "Continue" or "Rollback All" options
- On rollback: execute all revertCodes in reverse order

### FR-07: Global State Persistence
- Applied tweaks survive app restart (localStorage or SQLite)
- Selected-but-not-applied tweaks survive page navigation (Zustand store)
- User settings (theme, expertMode, autoRefresh) persist in localStorage

### FR-08: Expert Mode
- Toggle in Settings page; persisted in localStorage
- When disabled: hide tweaks with `requiresExpertMode: true`
- When enabled: show with red border + warning chip

### FR-09: Onboarding (first launch only)
- ✅ Fixed: check `localStorage.getItem("onboardingComplete")`
- ✅ Fixed: set flag on "Get Started" click
- Re-triggerable via "Interactive Guide" button on Dashboard

### FR-10: Command Palette (Ctrl+K)
- ✅ Implemented: semantic synonym search, keyboard navigation, category grouping
- Extend: add "navigate to page" actions (e.g., "go to gaming")
- Extend: add "apply all safe tweaks in category" quick actions

### FR-11: Optimization Profiles
- Create/rename/delete/duplicate named profiles
- Profile stores: list of tweak IDs + their intended toggle state
- Built-in presets: Gaming, Productivity, Privacy, Balanced, Battery Saver
- Export as `.winopt` JSON file; import from file

### FR-12: Quick Scan
- Wire "Quick Scan" button on Dashboard
- Select all Green-level tweaks across all categories
- Show modal preview with full list before applying

### FR-13: Startup Optimizer
- Enumerate: `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`, `HKCU:\...Run`, Startup folder, auto-start Services, Scheduled Tasks
- Toggle to disable (not delete) each item
- Show estimated impact per item

### FR-14: Disk Cleanup & Health
- Scan: %TEMP%, %LocalAppData%\Temp, Recycle Bin, browser caches, Windows Update cache, thumbnail cache
- Preview: file count + size before delete
- Delete via Windows Recycle Bin API (recoverable)
- SMART data: health status, temperature, estimated failure window

### FR-15: Process Manager
- List all processes with CPU%, RAM MB, Disk I/O, Network kB/s
- Right-click: set priority (Realtime/High/Normal/Low), terminate, open location
- Auto-detect running games and offer "Apply Gaming Mode"

### FR-16: Network Analyzer & Optimizer
- Per-adapter: IP, MAC, link speed, latency to 8.8.8.8 and 1.1.1.1
- Per-process network usage (top 10)
- Run diagnostic: ping variance, jitter, packet loss
- Show before/after comparison after applying Network tweaks

### FR-17: Privacy & Security Audit
- Scan: telemetry registry keys, DiagTrack/dmwappushservice services, firewall outbound rules
- Output: Privacy Score 0–100, list of issues with severity (Critical/High/Medium/Low)
- "Harden Privacy" applies all applicable Privacy tweaks
- Export HTML/PDF privacy report

### FR-18: Power Plan Manager
- List power plans: Balanced, High Performance, Power Saver + custom
- Activate plan with one click
- Edit CPU min/max frequency, display timeout, USB suspend
- Auto-switch on AC/battery connection events

### FR-19: Gaming Optimizer (expanded)
- FPS overlay: transparent always-on-top window, toggleable via F12
- Auto Gaming Mode: detect game launch, apply Gaming profile, show toast
- GPU info: current clocks, temp, VRAM usage

### FR-20: System Report Generator
- Collect: `Get-ComputerInfo`, `Get-HotFix`, WMI hardware, installed software, driver list
- Export: professional PDF or ZIP with CSV data files
- Privacy controls: opt-out of IP/username inclusion

### FR-21: Driver Manager
- Scan installed drivers via WMI `Win32_PnPDevice`
- Show installed vs latest version (from manufacturer APIs where available)
- Backup driver before update via `Export-WindowsDriver`
- Rollback to previous version

### FR-22: Scheduled Maintenance
- Create Windows Scheduled Tasks via PowerShell `New-ScheduledTask`
- Configurable: daily/weekly/monthly, time-of-day, which cleanup actions
- Execution history with last-run status

### FR-23: Tweak Backup & Restore
- Export: all profiles + history + settings to `.winopt-backup` (JSON)
- Encryption: AES-256 with user passphrase (optional)
- Import: restore on new machine or after reinstall

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | App startup time | < 2 seconds cold start |
| NFR-02 | Page navigation | < 300ms with animations |
| NFR-03 | Dashboard vitals refresh | ≤ 500ms per update cycle |
| NFR-04 | Tweak execution feedback | < 100ms to show progress indicator |
| NFR-05 | PowerShell timeout | 30s per command; surface error if exceeded |
| NFR-06 | Window minimum size | 960×640px (wider than current 800×600) |
| NFR-07 | Accessibility | WCAG 2.1 AA; ARIA roles on all interactive elements |
| NFR-08 | Security: CSP | Proper Content-Security-Policy (not null) |
| NFR-09 | Security: PowerShell injection | Whitelist allowed cmdlets; reject unknown patterns |
| NFR-10 | Security: elevation | UAC prompt on every admin-level operation; no cached elevation |
| NFR-11 | Privacy | Zero telemetry from WinOpt; all data local-only |
| NFR-12 | Compatibility | Windows 10 21H2+ and Windows 11 all builds |
| NFR-13 | Error resilience | Error boundary on every page; never blank-screen crash |

---

## 5. Acceptance Criteria (Gherkin)

### AC-01: Tweak Execution with Feedback
```gherkin
Feature: Execute a single optimization tweak
  Scenario: Successful deploy
    Given I am on "Performance Tuning"
    And I have toggled ON "Disable SysMain (Superfetch)"
    When I click "Deploy (1)"
    Then a confirmation modal shows the PowerShell command and estimated runtime
    When I click "Confirm & Deploy"
    Then a progress indicator shows "Executing..."
    And the system runs: Stop-Service -Name 'SysMain' -Force
    And the system runs: Set-Service -Name 'SysMain' -StartupType Disabled
    And within 10s a green "✓ Deployed" toast appears for 3s
    And the toggle shows locked-ON state with a timestamp
    And the operation is recorded in tweak history

  Scenario: Deploy requires admin elevation
    Given the app is running without admin rights
    When I click "Confirm & Deploy" on any registry tweak
    Then an "Admin Required" modal appears explaining why
    And offers "Elevate & Continue" or "Cancel"
    When I click "Elevate & Continue"
    Then Windows UAC prompt appears
    When I accept UAC
    Then the tweak executes with admin rights
    And succeeds with green toast
```

### AC-02: Tweak State Validation on Load
```gherkin
Feature: Check current tweak state on page load
  Scenario: Tweak already applied
    Given I navigate to "Performance Tuning"
    When the page renders
    Then for each tweak with a validationCmd, that cmd is executed
    And if SysMain service status is "Stopped", the toggle shows ON
    And if SysMain service status is "Running", the toggle shows OFF
    And if validationCmd is empty, toggle shows UNKNOWN (grey)
    And validation completes within 3 seconds of page load
```

### AC-03: Tweak Revert
```gherkin
Feature: Undo an applied optimization
  Scenario: Single tweak revert
    Given "Disable SysMain" is applied (toggle ON)
    When I click the toggle to turn it OFF
    Then a confirmation dialog shows:
      "Revert: Disable SysMain (Superfetch)?"
      And the exact revertCode PowerShell command
    When I click "Revert"
    Then: Set-Service -Name 'SysMain' -StartupType Automatic executes
    Then: Start-Service -Name 'SysMain' executes
    And the toggle shows OFF with revert timestamp
    And a green "✓ Reverted" toast appears
    And history records action: REVERTED with status: SUCCESS
```

### AC-04: Expert Mode
```gherkin
Feature: Gate high-risk tweaks behind expert mode
  Scenario: Expert mode disabled (default)
    Given I navigate to "Power Tuning"
    Then no tweaks are visible (DisableCoreParking has requiresExpertMode: true)
    And a banner appears: "Enable Expert Mode to unlock 1 advanced tweak"

  Scenario: Enable expert mode
    Given I navigate to Settings
    When I toggle "Expert Mode"
    And I confirm the warning dialog
    Then Settings saves expertMode: true to localStorage
    And I navigate to "Power Tuning"
    Then "Disable CPU Core Parking" is visible with a red ⚠ border and "EXPERT" badge
```

### AC-05: Onboarding (first-run only)
```gherkin
Feature: First-time user experience
  Scenario: Fresh install
    Given localStorage has no "onboardingComplete" key
    When the app loads
    Then OnboardingModal appears automatically
    When I complete step 3 and click "Get Started"
    Then localStorage["onboardingComplete"] = "true"
    And modal closes and never shows again on subsequent loads

  Scenario: Manually trigger guide
    Given onboarding was already completed
    When I click "Interactive Guide" on Dashboard
    Then OnboardingModal opens
    When I complete it
    Then localStorage flag remains "true"
```

### AC-06: Batch Deploy with Rollback
```gherkin
Feature: Apply multiple tweaks in one operation
  Scenario: Successful batch
    Given I select 3 tweaks: SystemResponsiveness, GamePriority, DisableFSO
    When I click "Deploy (3)"
    Then a modal shows all 3 commands, risk summary, and estimated time
    When I confirm
    Then tweaks execute sequentially with per-item progress: ✓ / ... / pending
    And on full success: "3 tweaks deployed" toast appears

  Scenario: Partial failure with rollback
    Given I deploy 3 tweaks and tweak 2 fails
    Then execution pauses showing the error
    And I am offered: "Continue (skip failed)" or "Rollback All"
    When I click "Rollback All"
    Then tweak 1's revertCode executes
    And all toggles return to OFF
    And history records the batch as ROLLED BACK
```

### AC-07: Floating Selection Bar
```gherkin
Feature: Persistent batch selection summary
  Scenario: Tweaks selected then user scrolls down
    Given I select 2 tweaks and scroll to bottom of list
    Then the floating bar is visible with "2 tweaks ready"
    And shows risk breakdown: "2 Green"
    And "Deploy" and "Clear" buttons are visible and functional
    When I click "Clear"
    Then all selections are deselected
    And the floating bar animates out
```

### AC-08: Mobile Inspector Drawer
```gherkin
Feature: Inspector accessible on small screens
  Scenario: Click tweak on mobile (< 1024px wide)
    Given the window width is < 1024px
    When I click a tweak card
    Then the desktop inspector sidebar remains hidden
    And a bottom drawer slides up from the bottom with:
      - Drag handle at top
      - Inspector header with tweak name + risk dot
      - Scrollable content (howItWorks, pros, cons, PowerShell code)
      - X close button
    When I tap the backdrop or X
    Then the drawer slides back down

  Scenario: Click tweak on desktop (≥ 1024px)
    Given the window width is ≥ 1024px
    When I click a tweak card
    Then the right-side inspector sidebar updates with tweak details
    And no bottom drawer appears
```

---

## 6. Architecture

### 6.1 System Layers

```
┌─────────────────────────── REACT FRONTEND ──────────────────────────────┐
│                                                                          │
│  Pages: Dashboard · TweaksPage · ProcessManager · StorageOptimizer      │
│         NetworkAnalyzer · SecurityAudit · GamingOptimizer · Reports     │
│         StartupManager · PowerManager · DriversPage · Settings          │
│                                                                          │
│  Shared Components: Sidebar · CommandPalette · OnboardingModal          │
│                     FloatingBar · MobileDrawer · ToastSystem             │
│                     ErrorBoundary · EmptyState · ProgressModal           │
│                                                                          │
│  Hooks: useSystemVitals · useTheme · useTweakHistory · useAppStore      │
│         useElevation · useMediaQuery                                     │
│                                                                          │
│  State: Zustand store (persist middleware → localStorage/IndexedDB)      │
│    appliedTweaks · tweakHistory · systemVitals · userSettings            │
│    selectedTweaks · isExecuting · error                                  │
│                                                                          │
│  Data: tweaks.json · profiles.json · games.json · security-baselines.json│
│                                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ Tauri IPC invoke()
┌──────────────────────────────▼───────────────────────────────────────────┐
│                        TAURI 2 IPC LAYER                                 │
│                                                                          │
│  Commands: execute_powershell · get_system_vitals · validate_tweak       │
│            get_tweak_history · revert_tweak · is_admin                   │
│            elevate_and_execute · get_process_list · kill_process          │
│            get_startup_items · disable_startup_item                      │
│            scan_disk · get_disk_health · execute_cleanup                 │
│            get_network_stats · get_power_plans · set_power_plan          │
│            get_driver_list · check_driver_updates · install_driver        │
│            generate_system_report · create_backup · restore_backup       │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                         RUST BACKEND                                     │
│                                                                          │
│  Modules:                                                                │
│    system.rs    — WMI queries, CPU/GPU/RAM/disk/network metrics          │
│    tweaks.rs    — PowerShell executor, validation, history               │
│    process.rs   — process enumeration, priority, termination             │
│    startup.rs   — registry Run keys, scheduled tasks, services           │
│    disk.rs      — directory scanner, SMART, cleanup                      │
│    network.rs   — adapter stats, ping, per-process traffic               │
│    power.rs     — power plans, powercfg, battery                         │
│    drivers.rs   — WMI device driver enumeration, pnputil                 │
│    reports.rs   — system info collector, PDF/ZIP generator               │
│    backup.rs    — serialize/encrypt/restore app settings                 │
│    db.rs        — SQLite schema, migrations, CRUD                        │
│    security.rs  — admin check, UAC elevation, CSP enforcement            │
│                                                                          │
│  Dependencies (Cargo.toml):                                              │
│    wmi = "0.13"          # WMI queries                                   │
│    winapi = "0.3"        # Windows API                                   │
│    rusqlite = "0.29"     # SQLite for history/profiles                   │
│    serde_json = "1"      # JSON serialization                            │
│    chrono = "0.4"        # Timestamps                                    │
│    uuid = "1.6"          # UUIDs for history entries                     │
│    aes-gcm = "0.10"      # AES-256 encryption for backup                 │
│    reqwest = "0.11"      # HTTP for driver update checks                  │
│    tokio = { features = ["full"] }  # Async runtime                      │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                      WINDOWS OS                                          │
│                                                                          │
│  PowerShell 5.1/7 · Registry (HKLM/HKCU) · WMI · Services API           │
│  Windows Update API · pnputil · powercfg · netsh · SMART/diskutil        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Frontend State Architecture

```typescript
// store/appStore.ts — Zustand with persist middleware
interface AppState {
  // Persisted
  appliedTweaks: string[];            // tweak IDs currently applied on system
  userSettings: UserSettings;         // theme, expertMode, autoRefresh, etc.
  profiles: Profile[];                // saved tweak profiles

  // Session state (not persisted)
  selectedTweaks: string[];           // tweaks toggled but not yet deployed
  systemVitals: SystemVitals | null;
  tweakValidationState: Record<string, "Applied" | "Reverted" | "Unknown">;
  isExecuting: boolean;
  executingTweakId: string | null;
  error: AppError | null;
}
```

---

## 7. Data Models

### 7.1 Tweak (enhanced tweaks.json schema)

```typescript
interface Tweak {
  id: string;
  name: string;
  category: "Performance" | "Privacy" | "Gaming" | "Network" | "Power" | "Tools" | "Security";
  riskLevel: "Green" | "Yellow" | "Red";
  requiresExpertMode: boolean;
  requiresAdminElevation: boolean;      // NEW
  estimatedExecutionTimeMs: number;     // NEW
  incompatibleWith: string[];           // NEW — tweak IDs that conflict
  description: string;
  educationalContext: {
    howItWorks: string;
    pros: string;
    cons: string;
  };
  execution: {
    code: string;
    revertCode: string;
  };
  validationCmd: string;
  applicableToVersions: string[];       // NEW — ["Windows 10", "Windows 11"]
}
```

### 7.2 SystemVitals

```typescript
interface SystemVitals {
  timestamp: number;
  cpu: { tempC: number; usagePct: number; freqGHz: number; model: string; };
  ram: { usedMb: number; totalMb: number; usagePct: number; };
  drives: Record<string, { tempC: number; freeGb: number; totalGb: number; smartStatus: "OK"|"WARNING"|"FAILED"; }>;
  network: Record<string, { latencyMs: number; speedGbps: number; status: "UP"|"DOWN"; }>;
  system: { uptimeSeconds: number; osVersion: string; isAdmin: boolean; };
}
```

### 7.3 TweakHistoryEntry

```typescript
interface TweakHistoryEntry {
  id: string;                   // UUID
  tweakId: string;
  tweakName: string;
  action: "APPLIED" | "REVERTED" | "FAILED";
  timestamp: number;
  durationMs: number;
  commandExecuted: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  vitalsSnapshot?: { before?: SystemVitals; after?: SystemVitals; };
  canRevert: boolean;
}
```

### 7.4 Profile

```typescript
interface Profile {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  tweakIds: string[];
  createdAt: number;
  lastAppliedAt?: number;
}
```

### 7.5 UserSettings

```typescript
interface UserSettings {
  theme: "dark" | "light";
  colorScheme: "default" | "teal" | "rose" | "amber" | "emerald" | "violet";
  expertModeEnabled: boolean;
  autoRefreshVitals: boolean;
  autoRefreshIntervalMs: number;
  showDeployConfirmation: boolean;
  enableHistoryTracking: boolean;
  maxHistoryEntries: number;          // default: 200
}
```

---

## 8. IPC Command Interface

All commands return `Result<T, String>` in Rust, surfaced as `Promise<T>` in TypeScript via `invoke()`.

```rust
// ── System Information ─────────────────────────────────────────────────
#[tauri::command] get_system_vitals() -> Result<SystemVitals, String>
#[tauri::command] get_system_info() -> Result<SystemInfo, String>

// ── Elevation & Security ───────────────────────────────────────────────
#[tauri::command] is_admin() -> Result<bool, String>
#[tauri::command] elevate_and_execute(code: String) -> Result<String, String>

// ── Tweak Execution ────────────────────────────────────────────────────
#[tauri::command] execute_tweak(id: String, code: String, dry_run: bool) -> Result<TweakResult, String>
#[tauri::command] execute_batch_tweaks(tweaks: Vec<BatchRequest>, rollback_on_fail: bool) -> Result<Vec<TweakResult>, String>
#[tauri::command] validate_tweak(id: String, validation_cmd: String) -> Result<TweakValidationState, String>
#[tauri::command] revert_tweak(id: String, revert_code: String) -> Result<TweakResult, String>
#[tauri::command] revert_to_timestamp(timestamp: u64) -> Result<Vec<TweakResult>, String>

// ── History ────────────────────────────────────────────────────────────
#[tauri::command] get_tweak_history(limit: Option<u32>) -> Result<Vec<TweakHistoryEntry>, String>
#[tauri::command] clear_tweak_history() -> Result<(), String>

// ── Profiles ───────────────────────────────────────────────────────────
#[tauri::command] get_profiles() -> Result<Vec<Profile>, String>
#[tauri::command] save_profile(profile: Profile) -> Result<(), String>
#[tauri::command] delete_profile(id: String) -> Result<(), String>
#[tauri::command] export_profile(id: String) -> Result<String, String>  // returns JSON
#[tauri::command] import_profile(json: String) -> Result<Profile, String>

// ── Process Manager ────────────────────────────────────────────────────
#[tauri::command] get_process_list() -> Result<Vec<ProcessInfo>, String>
#[tauri::command] set_process_priority(pid: u32, priority: String) -> Result<(), String>
#[tauri::command] terminate_process(pid: u32) -> Result<(), String>

// ── Startup Manager ────────────────────────────────────────────────────
#[tauri::command] get_startup_items() -> Result<Vec<StartupItem>, String>
#[tauri::command] disable_startup_item(id: String) -> Result<(), String>
#[tauri::command] enable_startup_item(id: String) -> Result<(), String>

// ── Disk & Storage ─────────────────────────────────────────────────────
#[tauri::command] get_disk_info() -> Result<Vec<DiskInfo>, String>
#[tauri::command] get_disk_health(drive: String) -> Result<SmartData, String>
#[tauri::command] get_cleanup_preview() -> Result<CleanupPreview, String>
#[tauri::command] execute_cleanup(action_ids: Vec<String>, dry_run: bool) -> Result<CleanupResult, String>

// ── Network ────────────────────────────────────────────────────────────
#[tauri::command] get_network_stats() -> Result<NetworkStats, String>
#[tauri::command] run_network_diagnostic() -> Result<NetworkDiagnostic, String>

// ── Power ──────────────────────────────────────────────────────────────
#[tauri::command] get_power_plans() -> Result<Vec<PowerPlan>, String>
#[tauri::command] set_active_power_plan(id: String) -> Result<(), String>
#[tauri::command] get_battery_info() -> Result<BatteryInfo, String>

// ── Drivers ────────────────────────────────────────────────────────────
#[tauri::command] get_driver_list() -> Result<Vec<DriverInfo>, String>
#[tauri::command] check_driver_updates() -> Result<Vec<DriverUpdate>, String>
#[tauri::command] backup_driver(driver_id: String) -> Result<String, String>
#[tauri::command] install_driver_update(driver_id: String) -> Result<(), String>

// ── Reports & Backup ──────────────────────────────────────────────────
#[tauri::command] generate_system_report() -> Result<String, String>  // file path
#[tauri::command] create_backup(encrypt: bool, passphrase: Option<String>) -> Result<String, String>
#[tauri::command] restore_backup(path: String, passphrase: Option<String>) -> Result<(), String>
```

---

## 9. Module Breakdown & Feature Roadmap

### Module 1: Dashboard *(partially built)*

| Feature | Status | Effort |
|---------|--------|--------|
| System Health Score (static 92) | ✅ UI built | Wire to real vitals |
| CPU/RAM/Drive/Network bento cards | ✅ UI built (hardcoded) | Wire to `get_system_vitals` |
| Alert banner → Privacy navigation | ✅ Fixed | — |
| Live sparkline graphs in cards | 🔲 New | M |
| Quick Scan button (apply all Green tweaks) | 🔲 New | S |
| Tweak history timeline widget | 🔲 New | M |

### Module 2: Tweaks (all categories) *(UI built, execution missing)*

| Feature | Status | Effort |
|---------|--------|--------|
| Tweak list + toggle switches | ✅ Built | — |
| Inspector sidebar (desktop) | ✅ Built | — |
| Mobile inspector drawer | ✅ Fixed | — |
| Risk filter chips | ✅ Fixed | — |
| Floating batch selection bar | ✅ Fixed | — |
| Better empty state | ✅ Fixed | — |
| **Tweak execution (wired)** | ❌ Missing | L |
| **Tweak validation on load** | ❌ Missing | M |
| **Tweak revert** | ❌ Missing | M |
| **Confirmation modal before deploy** | ❌ Missing | S |
| **Progress modal during batch deploy** | ❌ Missing | M |
| Expert mode filter | ❌ Missing | S |
| Add 15+ more tweaks to all categories | ❌ Missing | M |

### Module 3: Command Palette *(built)*

| Feature | Status | Effort |
|---------|--------|--------|
| Ctrl+K search with semantic matching | ✅ Built | — |
| Category grouping in results | ✅ Fixed | — |
| "Navigate to page" actions | 🔲 New | S |
| "Apply all safe tweaks" quick action | 🔲 New | S |

### Module 4: Profiles *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Built-in presets (Gaming, Privacy, etc.) | ❌ Missing | M |
| Create/rename/delete custom profiles | ❌ Missing | M |
| Export/import `.winopt` files | ❌ Missing | S |
| Profile card grid UI | ❌ Missing | M |

### Module 5: Process Inspector *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Process list with real-time metrics | ❌ Missing | L |
| Sort by CPU/RAM/Disk/Network | ❌ Missing | S |
| Set process priority | ❌ Missing | M |
| Force terminate | ❌ Missing | S |
| Auto-detect games | ❌ Missing | M |

### Module 6: Startup Manager *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Enumerate startup items | ❌ Missing | L |
| Disable/enable toggle | ❌ Missing | M |
| Impact estimate per item | ❌ Missing | M |

### Module 7: Storage Optimizer *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Disk usage treemap | ❌ Missing | L |
| Junk file scan + preview | ❌ Missing | M |
| Safe cleanup (to Recycle Bin) | ❌ Missing | M |
| SMART health display | ❌ Missing | M |
| Scheduled cleanup | ❌ Missing | L |

### Module 8: Network Analyzer *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Real-time bandwidth per adapter | ❌ Missing | L |
| Per-process network usage | ❌ Missing | L |
| Latency diagnostic (ping/jitter/loss) | ❌ Missing | M |
| Before/after comparison | ❌ Missing | S |

### Module 9: Security & Privacy Audit *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Privacy scan (telemetry keys, services) | ❌ Missing | L |
| Privacy Score gauge (0–100) | ❌ Missing | M |
| One-click "Harden Privacy" | ❌ Missing | S |
| CIS Benchmark compliance checker | ❌ Missing | L |
| Export privacy report | ❌ Missing | M |

### Module 10: Gaming Optimizer *(partially built — tweaks only)*

| Feature | Status | Effort |
|---------|--------|--------|
| Gaming tweaks page | ✅ Built | — |
| Auto Gaming Mode (game detection) | ❌ Missing | L |
| FPS in-game overlay | ❌ Missing | XL |
| GPU info panel (clocks, temp) | ❌ Missing | L |
| GPU overclocking controls | ❌ Missing | XL |

### Module 11: Power Management *(partially built — 1 tweak only)*

| Feature | Status | Effort |
|---------|--------|--------|
| Power tweak (Core Parking) | ✅ Built | — |
| Power plan selector | ❌ Missing | M |
| Per-plan CPU frequency editor | ❌ Missing | M |
| Battery health diagnostics | ❌ Missing | S |
| Auto-switch on AC/battery | ❌ Missing | M |

### Module 12: Driver Manager *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| Installed driver list | ❌ Missing | L |
| Update availability check | ❌ Missing | L |
| One-click install + backup | ❌ Missing | L |
| Rollback to previous | ❌ Missing | M |

### Module 13: System Report & Backup *(new module)*

| Feature | Status | Effort |
|---------|--------|--------|
| System info report (PDF/ZIP) | ❌ Missing | M |
| Tweak history export | ❌ Missing | S |
| Full settings backup (encrypted) | ❌ Missing | M |
| Restore from backup | ❌ Missing | M |

### Module 14: Settings *(empty page)*

| Feature | Status | Effort |
|---------|--------|--------|
| Expert mode toggle | ❌ Missing | S |
| Auto-refresh interval config | ❌ Missing | S |
| Deploy confirmation preference | ❌ Missing | S |
| History retention config | ❌ Missing | S |
| Backup & restore UI | ❌ Missing | M |

---

## 10. Phased Delivery Plan

### Phase 0 — UI Polish *(complete)*
All 10 UI improvements applied. Build passes. No functional changes.

**Completed:**
- ✅ Onboarding first-run only (localStorage check)
- ✅ Alert banner navigates to Privacy page
- ✅ Tweak risk filter chips (All/Green/Yellow/Red)
- ✅ Floating batch selection bar with risk breakdown
- ✅ Mobile inspector bottom drawer
- ✅ Command palette grouped by category
- ✅ Sidebar icon tooltips
- ✅ 5-color scheme picker (violet, teal, rose, amber, emerald)
- ✅ Improved onboarding visual mockups (mini app UI previews)
- ✅ Proper empty state with icon + description

---

### Phase 1 — Core Functionality *(weeks 1–6)*
Goal: Make the app actually work. Every tweak executes, validates, and reverts.

**Sprint 1 (weeks 1–2): Rust Backend Foundation**
```
Files to create:
  src-tauri/src/system.rs     — get_system_vitals (WMI)
  src-tauri/src/tweaks.rs     — execute_powershell, validate_tweak, revert_tweak
  src-tauri/src/security.rs   — is_admin, elevate_and_execute
  src-tauri/src/db.rs         — SQLite schema + migrations

Files to modify:
  src-tauri/src/lib.rs        — register all new commands
  src-tauri/Cargo.toml        — add wmi, winapi, rusqlite, chrono, uuid deps
  src-tauri/tauri.conf.json   — fix CSP (remove null), increase window size to 1200×800
```

User stories addressed: US-A1, US-A2, US-A3, US-E1, US-E3

**Sprint 2 (weeks 3–4): Frontend Wiring**
```
Files to create:
  src/store/appStore.ts                  — Zustand store with persist
  src/hooks/useSystemVitals.ts           — polling hook, calls get_system_vitals
  src/hooks/useElevation.ts             — checks is_admin, wraps elevate calls
  src/hooks/useTweakExecution.ts        — execute/revert/batch with state mgmt
  src/components/ConfirmDeployModal.tsx  — pre-deploy confirmation with command preview
  src/components/ProgressModal.tsx       — live progress for batch deploy
  src/components/ToastSystem.tsx         — success/error/info toasts

Files to modify:
  src/pages/Dashboard.tsx     — wire to useSystemVitals hook
  src/pages/TweaksPage.tsx    — wire Deploy button to useTweakExecution
  src/App.tsx                  — wrap with ErrorBoundary
```

User stories addressed: US-A1, US-A2, US-A3, US-B1, US-C3

**Sprint 3 (weeks 5–6): History, Profiles, Settings**
```
Files to create:
  src/pages/HistoryPage.tsx         — timeline view of all applied tweaks
  src/pages/ProfilesPage.tsx        — create/manage/apply profiles
  src/pages/SettingsPage.tsx        — expert mode, preferences, backup
  src/components/ExpertModeGate.tsx — wrapper that hides content unless expert

Files to modify:
  src/App.tsx                 — add new routes
  src/components/layout/Sidebar.tsx — add History, Profiles, Settings to nav
  src/data/tweaks.json        — add 15+ new tweaks for Tools/Settings/Security categories
```

User stories addressed: US-A4, US-A5, US-A6, US-C4, US-D4, US-E2

---

### Phase 2 — System Optimization Tools *(weeks 7–14)*
Goal: Startup Manager, Storage Optimizer, Process Manager, Network Analyzer.

**Sprint 4 (weeks 7–8): Startup Manager**
```
Files to create:
  src-tauri/src/startup.rs             — get_startup_items, disable/enable
  src/pages/StartupManagerPage.tsx     — categorized list, impact estimates, toggles
```

**Sprint 5 (weeks 9–10): Storage Optimizer**
```
Files to create:
  src-tauri/src/disk.rs                — scan, cleanup_preview, execute_cleanup, SMART
  src/pages/StorageOptimizerPage.tsx   — treemap, cleanup checklist, progress
  src/components/DiskTreemap.tsx       — interactive SVG treemap
```

**Sprint 6 (weeks 11–12): Process Manager**
```
Files to create:
  src-tauri/src/process.rs             — list, set_priority, terminate
  src/pages/ProcessManagerPage.tsx     — sortable table, right-click context menu
```

**Sprint 7 (weeks 13–14): Network Analyzer**
```
Files to create:
  src-tauri/src/network.rs             — get_network_stats, run_diagnostic
  src/pages/NetworkAnalyzerPage.tsx    — bandwidth graphs, latency map, diagnostics
```

User stories addressed: US-A4, US-B1, US-D1, US-D3

---

### Phase 3 — Advanced Features *(weeks 15–22)*
Goal: Privacy Audit, Gaming Mode, Power Manager, Driver Manager.

**Sprint 8 (weeks 15–16): Privacy & Security Audit**
```
Files to create:
  src-tauri/src/security_audit.rs      — privacy_scan, get_privacy_score
  src/pages/SecurityAuditPage.tsx      — score gauge, issue list, harden button
```

**Sprint 9 (weeks 17–18): Auto Gaming Mode + FPS Overlay**
```
Files to create:
  src-tauri/src/gaming.rs              — game_detection, overlay management
  src/pages/GamingOptimizerPage.tsx    — GPU panel, overlay settings, game list
  src/windows/OverlayWindow.tsx        — transparent always-on-top FPS window
```

**Sprint 10 (weeks 19–20): Power Manager**
```
Files to create:
  src-tauri/src/power.rs               — get/set power plans, battery
  src/pages/PowerManagerPage.tsx       — plan cards, CPU sliders, battery gauge
```

**Sprint 11 (weeks 21–22): Driver Manager**
```
Files to create:
  src-tauri/src/drivers.rs             — list, check updates, backup, install
  src/pages/DriversPage.tsx            — driver list table, update progress
```

---

### Phase 4 — Export & Polish *(weeks 23–28)*
Goal: Reports, Backup/Restore, Scheduled Maintenance, Accessibility pass.

**Sprint 12–14:** System report generator, backup/restore, scheduled tasks, WCAG pass, unit test coverage, performance profiling.

---

## 11. File-Level Change Map

### Immediate (Phase 0 — ✅ Done)

| File | Change |
|------|--------|
| `src/App.css` | Added 4 new theme color schemes (rose, amber, emerald, violet) |
| `src/hooks/useTheme.tsx` | Expanded ColorScheme type to 6 values |
| `src/App.tsx` | Fixed onboarding localStorage check; added `handleOnboardingClose`; added `setView` prop to Dashboard; improved empty state |
| `src/pages/Dashboard.tsx` | Added `setView` prop; wired alert banner onClick to navigate Privacy |
| `src/components/CommandPalette.tsx` | Grouped results by category with section headers |
| `src/components/layout/Sidebar.tsx` | Added `title` tooltip attrs; replaced palette toggle with 5-color swatch picker |
| `src/pages/TweaksPage.tsx` | Added risk filter chips; floating summary bar; mobile inspector drawer; improved empty states |
| `src/components/OnboardingModal.tsx` | Replaced crude CSS placeholders with proper mini app UI mockups; clickable step dots |

### Phase 1 (Backend + Wiring)

| File | Change Type |
|------|-------------|
| `src-tauri/Cargo.toml` | Add 8 new dependencies |
| `src-tauri/tauri.conf.json` | Fix CSP; resize to 1200×800 |
| `src-tauri/src/lib.rs` | Register all new Tauri commands |
| `src-tauri/src/system.rs` | **New** — WMI system vitals |
| `src-tauri/src/tweaks.rs` | **New** — PowerShell executor + validation |
| `src-tauri/src/security.rs` | **New** — admin check + elevation |
| `src-tauri/src/db.rs` | **New** — SQLite schema + CRUD |
| `src/store/appStore.ts` | **New** — Zustand global store |
| `src/hooks/useSystemVitals.ts` | **New** — polling hook |
| `src/hooks/useElevation.ts` | **New** — elevation wrapper |
| `src/hooks/useTweakExecution.ts` | **New** — execute/batch/revert |
| `src/components/ConfirmDeployModal.tsx` | **New** |
| `src/components/ProgressModal.tsx` | **New** |
| `src/components/ToastSystem.tsx` | **New** |
| `src/pages/Dashboard.tsx` | Wire `useSystemVitals` for real metrics |
| `src/pages/TweaksPage.tsx` | Wire Deploy to `useTweakExecution` |
| `src/pages/SettingsPage.tsx` | **New** |
| `src/pages/ProfilesPage.tsx` | **New** |
| `src/data/tweaks.json` | Add 15+ new tweaks |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PowerShell execution hangs indefinitely | Medium | High | 30s timeout; spawn async; kill on timeout |
| Registry write fails silently | High | High | Always run `validationCmd` after execute; compare before/after |
| WMI unavailable on some Windows configs | Medium | Medium | Graceful fallback: show "Unavailable" not crash |
| UAC prompt fatigue (users cancel) | Medium | Medium | Batch all admin ops into single elevation session |
| Tweak breaks system functionality | Low | Critical | Mandatory confirmation; revert always shown; audit log |
| Incompatible tweaks applied together | Medium | Medium | `incompatibleWith` field on tweak; warn before batch deploy |
| CSP null (current) enables XSS | Low | Critical | ✅ Fix in Phase 1 Sprint 1 |
| App state lost on crash (no persistence) | Medium | Medium | Zustand persist middleware writes to localStorage after every action |
| Driver update bricks GPU | Low | Critical | Backup driver before install; single-click rollback |
| Game detection false positives | Medium | Low | User can whitelist/blacklist executables |
