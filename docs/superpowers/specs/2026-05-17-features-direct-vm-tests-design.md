# Features Direct VM Tests — Design Spec

## Goal

Add a new Playwright E2E spec `e2e/features-direct.spec.ts` that exercises six app features
(Startup Manager, Privacy Audit, Process Manager, Network Analyzer, Latency Optimizer,
Storage Manager) against the live Tauri app running inside the Hyper-V test VM, using
destructive operations and real system-state verification via the VM bridge.

## Architecture

The file is a hybrid of two existing patterns:

- **UI layer** — Playwright navigates the real Tauri app (same as `app.spec.ts`), triggering
  operations through actual buttons and pages.
- **Bridge layer** — After each destructive action, `bridge.runInVM(ps)` runs a PowerShell
  snippet to verify the system state changed (same as `vm-tweak-direct.spec.ts`).

```
Playwright (browser) ──► Tauri app (VM) ──► Rust backend ──► Windows system state
                                                                        ▲
VMBridge (PS Direct) ─────────────────────────────────────────────────-┘  (verify)
```

## Tech Stack

- Playwright + `@playwright/test`
- `e2e/helpers/vm-bridge.ts` (`VMBridge`, `runInVM`)
- `playwright.vm.config.ts` (sequential, 1 worker, 120 s timeout, video+trace on)
- Same `USE_VM_BRIDGE` / `VM_NAME` env-var guards as `vm-tweak-direct.spec.ts`

## File

`e2e/features-direct.spec.ts` — single file, six `test.describe` blocks.

Results written to `test-results/features-direct/features-summary.json` (same schema as
`direct-summary.json` — `{ mode, vm, total, passed, failed, skipped, warned, results[] }`).

## Test Configuration

- Runs on `playwright.vm.config.ts`
- Sequential (system state is shared)
- Skips gracefully (`test.skip`) when `USE_VM_BRIDGE=false`
- Each describe block is self-contained: setup spawns any required state, teardown restores it

## Per-Feature Design

### 1. Startup Manager

**Invoke commands:** `get_startup_items`, `set_startup_item_state`

**Tests:**
1. `get_startup_items` returns a non-empty array with `{ name, command, enabled }` fields
2. Navigate to Startup page → find first enabled item → click Disable →
   bridge verifies the registry key is absent or the WMI startup entry is disabled →
   click Enable → bridge confirms restored

**Bridge validation PS:**
```powershell
(Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -EA SilentlyContinue)
```

**Cleanup:** Re-enable the item via UI in `afterEach`.

---

### 2. Privacy Audit

**Invoke commands:** `scan_privacy_issues`, `fix_privacy_issues`, `check_privacy_issue`

**Tests:**
1. Navigate to Privacy Audit page → click Scan → result shows a numeric score (0–100)
   and at least one issue in the list
2. Click Fix All → bridge verifies at least one known telemetry registry key is set to
   the hardened value (e.g. `HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection`
   `AllowTelemetry = 0`)

**Bridge validation PS:**
```powershell
(Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -EA SilentlyContinue).AllowTelemetry
```

**Cleanup:** None — privacy hardening is the intended outcome; VM resets to `01-TestReady`
on next full suite run.

**Note:** Tests marked `@irreversible` in results JSON.

---

### 3. Process Manager

**Invoke commands:** `get_processes`, `kill_process`, `set_process_priority`

**Tests:**
1. Navigate to Process page → list contains `explorer.exe` or `svchost.exe`
2. Bridge spawns `notepad.exe` via `Start-Process notepad` →
   UI refreshes → find notepad in list → click Kill →
   bridge confirms `Get-Process notepad -EA SilentlyContinue` returns null
3. Pick any non-critical process → set priority to Below Normal via UI →
   bridge confirms via `(Get-Process -Id <pid>).PriorityClass`

**Bridge spawn PS (beforeEach):**
```powershell
Start-Process notepad; Start-Sleep 1
```

**Cleanup:** Process already killed in test 2; priority revert in `afterEach`.

---

### 4. Network Analyzer

**Invoke commands:** `get_network_interfaces`, `ping_host`

**Tests:**
1. Navigate to Network Analyzer → at least one interface card visible with name + status
2. Enter `127.0.0.1` in ping target → click Ping →
   result shows latency value (any number ≥ 0 ms) and success indicator

**Bridge verification:** Not needed — ping result is visible in UI and non-destructive.

**Cleanup:** None.

---

### 5. Latency Optimizer

**Invoke commands:** `get_latency_status`, `flush_standby_list`

**Tests:**
1. Navigate to Latency page → timer resolution value visible (a number, units 100 ns)
2. Click Flush Standby List → UI shows MB freed value (≥ 0)
   bridge confirms the command returns without error:
   ```powershell
   # NtSetSystemInformation flush — verify exit 0 from Tauri invoke
   ```

**Cleanup:** None — standby list repopulates naturally.

---

### 6. Storage Manager

**Invoke commands:** `scan_junk_files`, `get_disk_health`, `execute_cleanup`

**Tests:**
1. Navigate to Storage page → disk health section shows at least one disk entry
2. Click Scan → junk file list renders (may be empty on clean VM — that is a valid result)
3. If scan returns items in the Temp Files category → click Clean →
   bridge verifies `(Get-ChildItem $env:TEMP -EA SilentlyContinue).Count` is lower
   (or 0); if scan returns no Temp Files items, test is marked SKIP

**Bridge validation PS:**
```powershell
(Get-ChildItem $env:TEMP -EA SilentlyContinue).Count
```

**Cleanup:** None (intentional deletion).

---

## Result Schema (features-summary.json)

```json
{
  "mode": "vm-ui",
  "vm": "WinOpt-TestVM",
  "total": 14,
  "passed": 12,
  "failed": 0,
  "skipped": 2,
  "warned": 0,
  "timestamp": "2026-05-17T23:00:00.000Z",
  "results": [
    {
      "feature": "StartupManager",
      "test": "disable and re-enable startup item",
      "status": "PASS",
      "bridgeOutput": "registry value or process list output",
      "durationMs": 4200
    }
  ]
}
```

## Execution

Added to `vm-run-automated-suite.ps1` as step 7/7 after the existing direct verify step:

```powershell
playwright.cmd test features-direct --config=playwright.vm.config.ts
```

## What Is NOT Covered

Group D features (WSL Manager, GPU Driver Cleaner, AI Assistant, Gaming Overlay) are
explicitly out of scope — they require external software, reboots, or a separate VM
snapshot strategy. Group B (Driver Manager, System Report, Backup & Restore) and
Group C (App Store, Bundles) are separate follow-on specs.
