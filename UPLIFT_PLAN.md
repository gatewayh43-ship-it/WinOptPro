# Gap Closure + Enhancement Plan — WinOpt Pro (2026-03-01)

## Context
All Phase 3 & 4 features are implemented (per audit). This plan:
1. Closes 3 remaining audit gaps (CPU overlay, auto-optimize, before/after)
2. Implements 10 community-requested enhancements from Reddit/Steam/GitHub research
3. Adds a new Latency Optimizer page and NVMe health section

---

## Group A — 10 New Tweaks in `tweaks.json`

**File**: `src/data/tweaks.json`

Add the following entries using the existing schema (id, name, category, riskLevel, requiresExpertMode, description, educationalContext.{howItWorks,pros,cons,expertDetails,interactions}, execution.{code,revertCode}, validationCmd):

| ID | Name | Category | Risk | Expert |
|---|---|---|---|---|
| `DisableVBS` | Disable Virtualization-Based Security | Security | medium | true |
| `DisableHVCI` | Disable HVCI / Memory Integrity | Security | medium | true |
| `EnableHAGS` | Enable Hardware-Accelerated GPU Scheduling | Gaming | low | false |
| `DisableMemoryCompression` | Disable Memory Compression | Performance | medium | true |
| `DisableDynamicTick` | Disable Dynamic Tick | Gaming | low | true |
| `DisableHPET` | Disable HPET Timer | Gaming | low | true |
| `EnableWriteBackCache` | Enable Disk Write-Back Cache | Performance | medium | true |
| `EnableRSS` | Enable Receive Side Scaling | Network | low | false |
| `DisableFTH` | Disable Fault Tolerant Heap | Performance | low | true |
| `SetPriorityBoost` | Enable CPU Priority Boost | Performance | low | false |

**Execution commands**:
- `DisableVBS` — `bcdedit /set hypervisorlaunchtype off` / revert: `bcdedit /set hypervisorlaunchtype auto` (requires elevation, reboot)
- `DisableHVCI` — Registry `HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity` `Enabled=0` / revert `Enabled=1`
- `EnableHAGS` — Registry `HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers` `HwSchMode=2` / revert `HwSchMode=1`
- `DisableMemoryCompression` — `powershell -c "Disable-MMAgent -MemoryCompression"` / revert `Enable-MMAgent -MemoryCompression`
- `DisableDynamicTick` — `bcdedit /set disabledynamictick yes` / revert `bcdedit /set disabledynamictick no`
- `DisableHPET` — `bcdedit /set useplatformclock false` / revert `bcdedit /set useplatformclock true`
- `EnableWriteBackCache` — Registry `HKLM\SYSTEM\CurrentControlSet\Services\disk` `WriteCacheEnabled=1` / revert `0`
- `EnableRSS` — `netsh int tcp set global rss=enabled` / revert `rss=disabled`
- `DisableFTH` — Registry `HKLM\SOFTWARE\Microsoft\FTH` `Enabled=0` / revert `Enabled=1`
- `SetPriorityBoost` — Registry `HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl` `PrioritySeparation=38` / revert `PrioritySeparation=2`

All `bcdedit` tweaks: `requiresExpertMode: true`, `riskLevel: "medium"`, warn about reboot required.
Use existing `security::elevate_and_execute()` pattern for elevation where needed.

---

## Group B — Gaming Gaps

### B1: CPU% in Gaming Overlay

**`src-tauri/src/gaming.rs`** — add:
```rust
#[command]
pub fn get_cpu_quick() -> Result<f32, String> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_usage();
    Ok(sys.global_cpu_usage())
}
```

**`src/pages/GamingOverlayPage.tsx`**:
- Add `cpuLoad: number | null` state
- Add `invoke<number>("get_cpu_quick")` to the `refresh` callback (alongside existing game/gpu calls)
- Add `<MetricPill label="CPU" value={cpuLoad != null ? \`${cpuLoad.toFixed(0)}%\` : "—"} color="text-sky-400" />` to the metrics row
- In mock path: set `cpuLoad` to a fixed mock value (e.g. `34`)

**`src-tauri/src/lib.rs`**: register `gaming::get_cpu_quick`

### B2: Auto-Optimize on Game Launch

**`src/hooks/useGaming.ts`**:
- Add `autoOptimize: boolean` state, initialized from `localStorage.getItem("gaming-auto-optimize") === "true"`
- Add `setAutoOptimize(val: boolean)` — sets state + persists to localStorage
- `GAMING_TWEAK_IDS` constant: `["CoreParking", "NetworkThrottling", "GamePriority", "SystemResponsiveness", "EnableHAGS", "DisableDynamicTick", "SetPriorityBoost"]`
- Add `useEffect` watching `activeGame`: when it changes from `null` → non-null AND `autoOptimize === true`, call invoke for batch tweak apply (verify exact command name in lib.rs first)

**`src/pages/GamingPage.tsx`**:
- Add "Auto-Optimize on Launch" toggle card (Switch component from shadcn)
- Show which tweaks will be applied in a collapsible info section below the toggle

### B3: Before/After Performance Snapshot

**`src/hooks/useGaming.ts`**:
- Add `GpuSnapshot = { gpu: GpuMetrics; cpu: number; timestamp: number }` interface
- Add `baseline: GpuSnapshot | null` state, initialized from `localStorage.getItem("gaming-baseline")` (JSON.parse)
- Add `captureBaseline()` action — snapshots current `gpuMetrics` + `cpuLoad`, stores in state + localStorage

**`src/pages/GamingPage.tsx`**:
- Add "Before/After" panel below the GPU metrics:
  - "Capture Baseline" button: saves snapshot, shows timestamp
  - Comparison table (when baseline exists): rows = GPU%, CPU%, Power; cols = Before / Now / Δ
  - Δ column: green if improved, red if worse

---

## Group C — New Latency Optimizer Page

### C1: `src-tauri/src/latency.rs` (new file)

```rust
use std::collections::HashMap;
use tauri::command;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatencyStatus {
    pub timer_resolution_100ns: u32,
    pub min_resolution_100ns: u32,
    pub max_resolution_100ns: u32,
    pub standby_ram_mb: u64,
    pub dynamic_tick_disabled: bool,
    pub platform_clock_forced: bool,
}

// Commands:
// get_latency_status() -> Result<LatencyStatus, String>
//   - NtQueryTimerResolution via GetProcAddress on ntdll.dll
//   - Standby RAM: PowerShell Get-WmiObject Win32_PerfFormattedData_PerfOS_Memory
//   - DynamicTick + platform clock: parse `bcdedit /enum {current}` output
//
// flush_standby_list() -> Result<u64, String>
//   - NtSetSystemInformation(SystemMemoryListCommand=80, MemoryFlushStandbyList=4)
//   - Returns MB freed
//
// get_bcdedit_settings() -> Result<HashMap<String, String>, String>
//   - Run `bcdedit /enum {current}`, parse "key    value" lines
```

**FFI strategy**: Use `windows-sys` crate (check if already in Cargo.toml via tauri) for `GetModuleHandleA`/`GetProcAddress` to resolve ntdll exports at runtime. If not present, add:
```toml
windows-sys = { version = "0.59", features = ["Win32_System_Threading", "Win32_System_Memory"] }
```

**Register in `lib.rs`**:
```rust
mod latency;
// in generate_handler!: latency::get_latency_status, latency::flush_standby_list, latency::get_bcdedit_settings
```

### C2: `src/hooks/useLatency.ts` (new file)

- States: `status: LatencyStatus | null`, `isLoading: boolean`, `isFlushing: boolean`, `error: string | null`
- Actions: `fetchStatus()`, `flushStandby()` (shows toast with MB freed), `refresh()`
- Polls every 5s via `setInterval`
- Mock data when `!isTauri()`
- Stable `addToast` mock pattern for tests (see MEMORY.md)

### C3: `src/pages/LatencyPage.tsx` (new file)

Three sections in responsive grid:

**Timer Resolution card**:
- Display current resolution (convert 100ns → ms: `val / 10000`)
- Show min/max range; "lower = better precision"
- Note: "Windows 11 24H2+ auto-adjusts; this shows current active value"

**Standby Memory card**:
- Display standby RAM in GB
- "Flush Standby List" button with spinner
- Toast on success: "Freed X MB from standby list"
- Refresh status after flush

**Boot Settings card**:
- Read-only table from `get_bcdedit_settings()`: show `disabledynamictick`, `useplatformclock`, `hypervisorlaunchtype` values
- "Manage via Tweaks page →" link (calls `setView("tweaks")` via prop)

### C4: Sidebar + App.tsx

**`src/components/layout/Sidebar.tsx`**:
- Add `{ id: "latency", label: "Latency Optimizer", lucideIcon: Timer }` to `utilNavItems`
- Add `Timer` to lucide-react imports

**`src/App.tsx`**:
- Add `import { LatencyPage } from "@/pages/LatencyPage"`
- Add `latency: <LatencyPage />` to views map

---

## Group D — NVMe / SSD Health in StoragePage

### D1: Extend `src-tauri/src/storage.rs`

```rust
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSmartInfo {
    pub friendly_name: String,
    pub media_type: String,      // "SSD" | "HDD" | "Unspecified"
    pub health_status: String,   // "Healthy" | "Warning" | "Unhealthy"
    pub wear_pct: Option<u32>,   // 0-100; None if HDD or unavailable
    pub temperature_c: Option<u32>,
    pub read_errors: Option<u64>,
    pub write_errors: Option<u64>,
    pub size_gb: u64,
}

// get_disk_smart_status() -> Result<Vec<DiskSmartInfo>, String>
//   PowerShell: Get-PhysicalDisk | ForEach-Object {
//     $counter = Get-StorageReliabilityCounter -PhysicalDisk $_
//     [PSCustomObject]@{ FriendlyName=$_.FriendlyName; MediaType=$_.MediaType;
//       HealthStatus=$_.HealthStatus; Size=$_.Size;
//       Wear=$counter.Wear; Temp=$counter.Temperature;
//       ReadErrors=$counter.ReadErrorsTotal; WriteErrors=$counter.WriteErrorsTotal }
//   } | ConvertTo-Json

// run_trim_optimization() -> Result<bool, String>
//   PowerShell: Optimize-Volume -DriveLetter C -ReTrim -Verbose
//   Requires elevation — use CREATE_NO_WINDOW + check exit code
```

Register in `lib.rs`: `storage::get_disk_smart_status`, `storage::run_trim_optimization`

### D2: Extend `src/pages/StoragePage.tsx`

Add "Drive Health" section (above Scheduled Maintenance):
- Invoke `get_disk_smart_status` on mount
- Card per disk: name, type badge (SSD=blue, HDD=gray), health badge (green/amber/red)
- Wear % progress bar (SSD only; "N/A" for HDD)
- Temperature chip (°C), read/write error counts (red if > 0)
- "Run TRIM" button (SSDs only) — shows admin warning, calls `run_trim_optimization`, toast on complete

---

## Implementation Sequence

```
ROUND 1 (parallel):
  A — tweaks.json entries (pure JSON, no Rust/TS changes)
  B — gaming.rs + useGaming.ts + GamingPage.tsx + GamingOverlayPage.tsx
  D — storage.rs extension + StoragePage.tsx Drive Health section

ROUND 2:
  C — latency.rs + useLatency.ts + LatencyPage.tsx + Sidebar + App.tsx

ROUND 3:
  lib.rs — register all new commands
  MEMORY.md — update implementation status
```

---

## Critical File Paths

| File | Change |
|---|---|
| `src/data/tweaks.json` | +10 tweak entries |
| `src-tauri/src/gaming.rs` | +`get_cpu_quick` command |
| `src/hooks/useGaming.ts` | +cpuLoad, autoOptimize, baseline, captureBaseline |
| `src/pages/GamingPage.tsx` | +auto-optimize toggle, before/after panel |
| `src/pages/GamingOverlayPage.tsx` | +CPU pill to metrics row |
| `src-tauri/src/latency.rs` | new file — 3 commands |
| `src/hooks/useLatency.ts` | new file |
| `src/pages/LatencyPage.tsx` | new file |
| `src-tauri/src/storage.rs` | +DiskSmartInfo, get_disk_smart_status, run_trim_optimization |
| `src/pages/StoragePage.tsx` | +Drive Health section |
| `src-tauri/src/lib.rs` | +mod latency; +5 new commands in generate_handler! |
| `src/components/layout/Sidebar.tsx` | +latency nav item (Timer icon) |
| `src/App.tsx` | +LatencyPage import + view |

---

## Verification

```bash
npx tsc --noEmit        # no TypeScript errors
npx vitest run          # all existing 375 tests pass
npm run tauri build     # clean Rust compile
```

Manual checks:
- Tweaks page: 10 new tweaks visible in correct categories with correct badges
- Gaming overlay (Tauri): CPU% pill appears alongside GPU/TEMP/POWER/VRAM
- Gaming page: Auto-optimize toggle persists; enable, trigger game detect → tweaks batch applied
- Gaming page: Capture Baseline → apply tweaks → Before/After table shows Δ
- Latency page: timer resolution, standby RAM shown; Flush button shows toast with MB freed
- Storage page: Drive Health section shows disk cards with wear bars for SSDs
