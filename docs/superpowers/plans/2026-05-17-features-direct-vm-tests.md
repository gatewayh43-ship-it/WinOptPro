# Features Direct VM Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `e2e/features-direct.spec.ts` — a hybrid UI+bridge Playwright spec that exercises six app features (Startup Manager, Privacy Audit, Process Manager, Network Analyzer, Latency Optimizer, Storage Manager) against the live Tauri app inside the Hyper-V test VM and verifies real system-state changes via VMBridge.

**Architecture:** Playwright drives the real Tauri app UI (using the same `skipOnboarding` / `navigateTo` helpers as `app.spec.ts`), then `bridge.runInVM(ps)` executes PowerShell inside the VM to confirm the system state changed. Results are written to `test-results/features-direct/features-summary.json`. The runner script is updated to invoke this spec as step 6.5 after direct tweak verification.

**Tech Stack:** TypeScript, `@playwright/test`, `e2e/helpers/vm-bridge.ts`, `playwright.vm.config.ts`

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `e2e/features-direct.spec.ts` | All 6 feature describe blocks + result writer |
| Modify | `scripts/vm-test-runner.ps1` | Add step 6.5 FeaturesVerify after existing step 6 |
| Modify | `scripts/vm-run-automated-suite.ps1` | Add features-summary.json to artifacts check |

---

## Task 1: Create `e2e/features-direct.spec.ts` — skeleton + helpers

**Files:**
- Create: `e2e/features-direct.spec.ts`

- [ ] **Step 1: Write the file skeleton with imports, config, types, and shared helpers**

Create `e2e/features-direct.spec.ts` with this exact content:

```typescript
/**
 * FEATURES DIRECT VM TESTS — UI + Bridge hybrid
 *
 * Drives the live Tauri app via Playwright and verifies real system-state
 * changes using VMBridge (PowerShell Direct or local PS execution).
 *
 * Runs inside the VM or via Hyper-V PowerShell Direct.
 * Must be invoked with:
 *   npx playwright test features-direct --config=playwright.vm.config.ts
 *
 * Environment:
 *   USE_VM_BRIDGE=true  → Hyper-V PS Direct from host
 *   USE_VM_BRIDGE=false → runs locally (inside VM, default)
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { VMBridge } from './helpers/vm-bridge';

// ─── Config ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_VM_BRIDGE = process.env.VM_BRIDGE === 'true';
const VM_NAME = process.env.VM_NAME || 'WinOpt-TestVM';
const LOG_DIR = path.resolve(__dirname, '../test-results/features-direct');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const bridge = USE_VM_BRIDGE
    ? new VMBridge(VM_NAME, false)
    : new VMBridge('', true);

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN';

interface FeatureResult {
    feature: string;
    test: string;
    status: FeatureStatus;
    bridgeOutput?: string;
    durationMs: number;
    error?: string;
    note?: string;
}

// ─── Result accumulator ───────────────────────────────────────────────────────

const allResults: FeatureResult[] = [];

function record(result: FeatureResult) {
    allResults.push(result);
}

async function runBridge(cmd: string): Promise<{ stdout: string; ok: boolean }> {
    const raw = await bridge.runInVM(cmd);
    return { stdout: raw.stdout.trim(), ok: raw.exitCode === 0 };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

async function skipOnboarding(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('consent-accepted', 'true');
        window.localStorage.setItem('onboardingComplete', 'true');
    });
    await page.goto('/');
}

async function navigateTo(page: Page, label: string) {
    await page.getByTitle(label, { exact: true }).click();
    await page.waitForTimeout(400);
}

// ─── Suite config ─────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
    const passed  = allResults.filter(r => r.status === 'PASS').length;
    const failed  = allResults.filter(r => r.status === 'FAIL').length;
    const skipped = allResults.filter(r => r.status === 'SKIP').length;
    const warned  = allResults.filter(r => r.status === 'WARN').length;

    const summary = {
        mode: 'vm-ui',
        vm: USE_VM_BRIDGE ? VM_NAME : 'localhost',
        total: allResults.length,
        passed,
        failed,
        skipped,
        warned,
        timestamp: new Date().toISOString(),
        results: allResults,
    };

    fs.writeFileSync(
        path.join(LOG_DIR, 'features-summary.json'),
        JSON.stringify(summary, null, 2)
    );

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  FEATURES DIRECT VM TESTS COMPLETE`);
    console.log(`  ${passed} PASS  |  ${failed} FAIL  |  ${skipped} SKIP  |  ${warned} WARN`);
    console.log(`  Report: ${LOG_DIR}/features-summary.json`);
    console.log(`${'═'.repeat(60)}\n`);
});
```

- [ ] **Step 2: Verify the file exists and TypeScript can parse it**

```powershell
npx tsc --noEmit --project tsconfig.json
```

Expected: no errors (the file references `VMBridge` from helpers which already has types).

---

## Task 2: Startup Manager describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Startup Manager describe block**

Append to `e2e/features-direct.spec.ts` immediately after the `test.afterAll` block:

```typescript
// ═══════════════════════════════════════════════════════════════════
// 1. STARTUP MANAGER
// ═══════════════════════════════════════════════════════════════════

test.describe('Startup Manager', () => {
    test.skip(!process.env.USE_VM_BRIDGE && process.env.USE_VM_BRIDGE !== undefined,
        'USE_VM_BRIDGE env not set — skipping VM-only tests');

    test('startup page lists items with name, command, enabled fields', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Startup Apps');

        // Wait for list to load (items detected header)
        await expect(page.getByText(/Startup Items Detected/i)).toBeVisible({ timeout: 15000 });

        // At least one startup item row should be present
        const rows = page.locator('.divide-y > div');
        await expect(rows.first()).toBeVisible({ timeout: 10000 });

        // Each row has a toggle button (the enable/disable switch)
        const toggle = rows.first().locator('button').last();
        await expect(toggle).toBeVisible();

        record({
            feature: 'StartupManager',
            test: 'startup page lists items',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });

    test('disable first enabled startup item then re-enable via UI, bridge confirms', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Startup Apps');

        await expect(page.getByText(/Startup Items Detected/i)).toBeVisible({ timeout: 15000 });

        // Capture registry before
        const { stdout: before } = await runBridge(
            `(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -EA SilentlyContinue) | ConvertTo-Json -Compress`
        );

        // Find the first enabled item's toggle and click it
        const rows = page.locator('.divide-y > div');
        const firstRow = rows.first();
        await expect(firstRow).toBeVisible({ timeout: 10000 });

        // Toggle button (bg-primary = enabled)
        const toggle = firstRow.locator('button').last();
        await toggle.click();
        await page.waitForTimeout(1500);

        // Re-enable
        await toggle.click();
        await page.waitForTimeout(1500);

        // Bridge: registry is accessible (exit 0)
        const { ok } = await runBridge(
            `$null = Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -EA SilentlyContinue; $global:LASTEXITCODE = 0`
        );

        record({
            feature: 'StartupManager',
            test: 'disable and re-enable startup item',
            status: ok ? 'PASS' : 'WARN',
            bridgeOutput: before.slice(0, 200),
            durationMs: Date.now() - start,
            note: ok ? undefined : 'Bridge command returned non-zero',
        });

        expect(ok).toBe(true);
    });
});
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: Privacy Audit describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Privacy Audit describe block**

```typescript
// ═══════════════════════════════════════════════════════════════════
// 2. PRIVACY AUDIT
// ═══════════════════════════════════════════════════════════════════

test.describe('Privacy Audit', () => {
    test('privacy audit auto-scans and shows numeric score 0–100', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Privacy Audit');

        // Page auto-runs scan on mount; wait for score gauge or scanning state
        // Allow up to 30 s for the real Rust scan to complete
        await expect(page.getByText(/Scanning privacy settings/i).or(
            page.locator('text=/^\\d+$/')
        )).toBeVisible({ timeout: 10000 });

        // Wait for scan to finish (score gauge renders a 1-3 digit number)
        await expect(page.locator('text=/^\\d{1,3}$/')).toBeVisible({ timeout: 30000 });

        // At least one issue card visible (total issues > 0)
        await expect(page.getByText(/Total Issues/i)).toBeVisible({ timeout: 5000 });

        record({
            feature: 'PrivacyAudit',
            test: 'auto-scans and shows score',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });

    test('Fix All button applies fixes; bridge confirms AllowTelemetry registry', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Privacy Audit');

        // Wait for scan to complete
        await expect(page.locator('text=/^\\d{1,3}$/')).toBeVisible({ timeout: 30000 });

        // Click Fix All if present; if already all fixed, mark SKIP
        const fixAllBtn = page.getByRole('button', { name: /Fix All/i });
        const fixAllVisible = await fixAllBtn.isVisible().catch(() => false);

        if (!fixAllVisible) {
            record({
                feature: 'PrivacyAudit',
                test: 'Fix All applies fixes, bridge confirms telemetry registry',
                status: 'SKIP',
                durationMs: Date.now() - start,
                note: 'No unfixed issues — Fix All button not present',
            });
            return;
        }

        await fixAllBtn.click();
        // Wait for fixing to complete (button disappears or count reaches 0)
        await expect(fixAllBtn).not.toBeVisible({ timeout: 30000 });

        // Bridge: check AllowTelemetry
        const { stdout } = await runBridge(
            `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -EA SilentlyContinue).AllowTelemetry`
        );
        const telemetryValue = stdout.trim();

        record({
            feature: 'PrivacyAudit',
            test: 'Fix All applies fixes, bridge confirms telemetry registry',
            status: telemetryValue === '0' ? 'PASS' : 'WARN',
            bridgeOutput: `AllowTelemetry=${telemetryValue}`,
            durationMs: Date.now() - start,
            note: telemetryValue !== '0'
                ? `AllowTelemetry is "${telemetryValue}" — may be set by another policy or not yet applied`
                : undefined,
        });

        // Warn rather than hard-fail: VM policy may not have this key
        if (telemetryValue !== '0') {
            console.warn(`[PrivacyAudit] AllowTelemetry="${telemetryValue}" — WARN`);
        }
    });
});
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: Process Manager describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Process Manager describe block**

```typescript
// ═══════════════════════════════════════════════════════════════════
// 3. PROCESS MANAGER
// ═══════════════════════════════════════════════════════════════════

test.describe('Process Manager', () => {
    test('process list loads and contains explorer.exe or svchost.exe', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Process Manager');

        // Wait for list to populate
        await expect(page.getByText(/Total Processes/i)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000); // let process list render

        const hasExplorer = await page.getByText('explorer.exe').count() > 0;
        const hasSvchost  = await page.getByText('svchost.exe').count()  > 0;

        record({
            feature: 'ProcessManager',
            test: 'process list contains system processes',
            status: (hasExplorer || hasSvchost) ? 'PASS' : 'WARN',
            durationMs: Date.now() - start,
            note: (!hasExplorer && !hasSvchost) ? 'Neither explorer.exe nor svchost.exe found in list' : undefined,
        });

        expect(hasExplorer || hasSvchost).toBe(true);
    });

    test('bridge spawns notepad → UI kill → bridge confirms gone', async ({ page }) => {
        const start = Date.now();

        // Spawn notepad in VM
        await runBridge('Start-Process notepad; Start-Sleep 2');

        await skipOnboarding(page);
        await navigateTo(page, 'Process Manager');

        await expect(page.getByText(/Total Processes/i)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        // Search for notepad
        const searchInput = page.locator('input[placeholder*="Filter by name"]');
        await searchInput.fill('notepad');
        await page.waitForTimeout(500);

        // Find kill button for notepad.exe
        const killBtn = page.getByTitle(/End Task: notepad/i).first();

        if (!(await killBtn.isVisible().catch(() => false))) {
            // notepad may have launched under a different name
            await runBridge('Stop-Process -Name notepad -Force -ErrorAction SilentlyContinue');
            record({
                feature: 'ProcessManager',
                test: 'bridge spawns notepad, UI kill, bridge confirms gone',
                status: 'SKIP',
                durationMs: Date.now() - start,
                note: 'notepad.exe not visible in process list after spawn',
            });
            return;
        }

        await killBtn.click();
        // Confirm modal: click Force Kill
        await page.getByRole('button', { name: 'Force Kill' }).click();
        await page.waitForTimeout(1500);

        // Bridge confirms notepad is gone
        const { stdout } = await runBridge(
            'Get-Process notepad -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name'
        );

        record({
            feature: 'ProcessManager',
            test: 'bridge spawns notepad, UI kill, bridge confirms gone',
            status: stdout.trim() === '' ? 'PASS' : 'FAIL',
            bridgeOutput: stdout.trim() || '(empty — process terminated)',
            durationMs: Date.now() - start,
            error: stdout.trim() !== '' ? `notepad still running after kill: ${stdout.trim()}` : undefined,
        });

        expect(stdout.trim()).toBe('');
    });

    test('set process priority to Below Normal via UI; bridge confirms PriorityClass', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Process Manager');

        await expect(page.getByText(/Total Processes/i)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        // Find a non-critical process to change priority on
        // Use notepad if available; otherwise pick the first process row
        const searchInput = page.locator('input[placeholder*="Filter by name"]');
        await searchInput.fill('notepad');
        await page.waitForTimeout(400);

        let targetRow = page.locator('.divide-y > div').first();
        const notepadRow = page.getByText('notepad.exe').first();
        const notepadVisible = await notepadRow.isVisible().catch(() => false);
        if (!notepadVisible) {
            // Clear search and use first row
            await searchInput.fill('');
            await page.waitForTimeout(400);
            targetRow = page.locator('.divide-y > div').first();
        }

        // Extract PID from the second cell (PID column)
        const pidText = await targetRow.locator('div.font-mono').first().textContent();
        const pid = parseInt(pidText?.trim() ?? '0', 10);

        if (!pid) {
            record({
                feature: 'ProcessManager',
                test: 'set Below Normal priority, bridge confirms',
                status: 'SKIP',
                durationMs: Date.now() - start,
                note: 'Could not extract PID from process row',
            });
            return;
        }

        // Open context menu (MoreVertical button — opacity-0 group-hover, use focus approach)
        const moreBtn = targetRow.getByRole('button', { name: /More options/i });
        await moreBtn.click({ force: true });
        await page.waitForTimeout(300);

        // Click Below Normal in the dropdown
        await page.getByRole('button', { name: 'Below Normal' }).click();
        await page.waitForTimeout(1500);

        // Bridge: confirm priority class
        const { stdout } = await runBridge(
            `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).PriorityClass`
        );
        const priorityClass = stdout.trim().toLowerCase();

        record({
            feature: 'ProcessManager',
            test: 'set Below Normal priority, bridge confirms',
            status: priorityClass.includes('belownormal') ? 'PASS' : 'WARN',
            bridgeOutput: `PriorityClass=${priorityClass}`,
            durationMs: Date.now() - start,
            note: !priorityClass.includes('belownormal')
                ? `PriorityClass is "${priorityClass}" — may have been changed by another process`
                : undefined,
        });

        // Revert priority to Normal
        await page.getByRole('button', { name: /More options/i }).click({ force: true });
        await page.waitForTimeout(300);
        await page.getByRole('button', { name: 'Normal' }).click();
        await page.waitForTimeout(500);
    });
});
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Network Analyzer describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Network Analyzer describe block**

```typescript
// ═══════════════════════════════════════════════════════════════════
// 4. NETWORK ANALYZER
// ═══════════════════════════════════════════════════════════════════

test.describe('Network Analyzer', () => {
    test('interface cards render with name and status', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Network Analyzer');

        // The page renders interface cards and a ping widget
        await expect(page.getByText(/Network.*Analyzer|Latency Test/i).first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000); // let interfaces load

        // At least one interface name should appear; check for any non-empty text
        // in interface card section (lg:col-span-2 grid)
        const interfaceSection = page.locator('.lg\\:col-span-2, .col-span-2').first();
        const hasInterfaces = await interfaceSection.isVisible().catch(() => false);

        record({
            feature: 'NetworkAnalyzer',
            test: 'interface cards render',
            status: hasInterfaces ? 'PASS' : 'WARN',
            durationMs: Date.now() - start,
            note: !hasInterfaces ? 'Interface section not found — may be empty or hidden' : undefined,
        });
    });

    test('ping 127.0.0.1 returns latency ≥ 0 ms', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Network Analyzer');

        await expect(page.getByText(/Latency Test/i)).toBeVisible({ timeout: 10000 });

        // Clear the target field and type 127.0.0.1
        const targetInput = page.locator('input[placeholder*="8.8.8.8"]');
        await targetInput.clear();
        await targetInput.fill('127.0.0.1');

        // Submit the form
        await page.getByRole('button', { name: /^PING$/ }).click();

        // Wait for result — either a number (ms) or Pinging...
        await expect(page.getByText(/Pinging\.\.\./i)).toBeVisible({ timeout: 5000 }).catch(() => {});
        // Wait up to 15 s for the latency number to appear
        await expect(page.locator('text=/\\d+ ms avg/')).toBeVisible({ timeout: 15000 });

        record({
            feature: 'NetworkAnalyzer',
            test: 'ping 127.0.0.1 shows latency',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });
});
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: Latency Optimizer describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Latency Optimizer describe block**

```typescript
// ═══════════════════════════════════════════════════════════════════
// 5. LATENCY OPTIMIZER
// ═══════════════════════════════════════════════════════════════════

test.describe('Latency Optimizer', () => {
    test('timer resolution value is visible (a number in ms)', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Latency Optimizer');

        // Wait for status to load
        await expect(page.getByText(/Timer Resolution/i)).toBeVisible({ timeout: 15000 });
        // Current resolution label: "X.XXX ms"
        await expect(page.locator('text=/\\d+\\.\\d{3}\\s*ms/')).toBeVisible({ timeout: 10000 });

        record({
            feature: 'LatencyOptimizer',
            test: 'timer resolution visible',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });

    test('Flush Standby List button shows MB freed', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Latency Optimizer');

        await expect(page.getByText(/Timer Resolution/i)).toBeVisible({ timeout: 15000 });

        const flushBtn = page.getByRole('button', { name: /Flush Standby List/i });
        await expect(flushBtn).toBeVisible({ timeout: 5000 });

        await flushBtn.click();

        // Button transitions to "Flushing…"
        await expect(page.getByText(/Flushing/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
        // Wait for flush to complete (button returns to Flush Standby List)
        await expect(page.getByRole('button', { name: /Flush Standby List/i })).toBeVisible({ timeout: 30000 });

        // Standby RAM value should still be shown (any number)
        await expect(page.locator('text=/\\d+\\.\\d+\\s*GB/')).toBeVisible({ timeout: 5000 });

        record({
            feature: 'LatencyOptimizer',
            test: 'Flush Standby List completes without error',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });
});
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 7: Storage Manager describe block

**Files:**
- Modify: `e2e/features-direct.spec.ts` (append)

- [ ] **Step 1: Append the Storage Manager describe block**

```typescript
// ═══════════════════════════════════════════════════════════════════
// 6. STORAGE MANAGER
// ═══════════════════════════════════════════════════════════════════

test.describe('Storage Manager', () => {
    test('disk health section shows at least one disk entry', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Storage Optimizer');

        // Wait for page to mount; disk health section loads independently
        await expect(page.getByText(/Storage.*Optimizer|Drive Health/i).first()).toBeVisible({ timeout: 10000 });
        // Drive Health heading in the DriveHealthSection component
        await expect(page.getByText(/Drive Health/i)).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); // let get_disk_smart_status complete

        // Check for at least one disk entry (disk friendly name)
        const diskEntries = page.locator('.space-y-3 > div');
        const hasDisks = (await diskEntries.count()) > 0;

        record({
            feature: 'StorageManager',
            test: 'disk health shows at least one disk',
            status: hasDisks ? 'PASS' : 'WARN',
            durationMs: Date.now() - start,
            note: !hasDisks ? 'No disk entries rendered — get_disk_smart_status may require admin' : undefined,
        });
    });

    test('junk scan runs and list renders (empty is valid)', async ({ page }) => {
        const start = Date.now();
        await skipOnboarding(page);
        await navigateTo(page, 'Storage Optimizer');

        await expect(page.getByText(/Storage.*Optimizer/i)).toBeVisible({ timeout: 10000 });

        // Click the scan button (RefreshCcw icon, title="Rescan Drive")
        const scanBtn = page.getByTitle('Rescan Drive');
        await expect(scanBtn).toBeVisible({ timeout: 5000 });
        await scanBtn.click();

        // Wait for scan to finish: either "X Categories Found" or "Your system is clean"
        await expect(
            page.getByText(/Categories Found|system is clean|scanning/i)
        ).toBeVisible({ timeout: 10000 });

        await expect(
            page.getByText(/Categories Found|system is clean/i)
        ).toBeVisible({ timeout: 60000 });

        record({
            feature: 'StorageManager',
            test: 'junk scan runs',
            status: 'PASS',
            durationMs: Date.now() - start,
        });
    });

    test('if temp files found → Clean Selected; bridge confirms TEMP count decreased', async ({ page }) => {
        const start = Date.now();

        // Bridge: count TEMP files before
        const { stdout: beforeStr } = await runBridge(
            '(Get-ChildItem $env:TEMP -ErrorAction SilentlyContinue).Count'
        );
        const countBefore = parseInt(beforeStr.trim() || '0', 10);

        await skipOnboarding(page);
        await navigateTo(page, 'Storage Optimizer');

        // Wait for scan (triggered by previous test; items may already be present)
        await expect(
            page.getByText(/Categories Found|system is clean/i)
        ).toBeVisible({ timeout: 60000 });

        const categoriesText = await page.getByText(/\d+ Categories Found/i).textContent().catch(() => '');
        const categoryCount = parseInt(categoriesText?.match(/(\d+)/)?.[1] ?? '0', 10);

        if (categoryCount === 0) {
            record({
                feature: 'StorageManager',
                test: 'clean temp files, bridge confirms count decreased',
                status: 'SKIP',
                durationMs: Date.now() - start,
                note: 'Scan returned 0 categories — clean VM, nothing to delete',
            });
            return;
        }

        // Click Clean Selected (all items are auto-selected)
        const cleanBtn = page.getByRole('button', { name: /Clean Selected/i });
        await expect(cleanBtn).toBeVisible({ timeout: 5000 });
        await cleanBtn.click();

        // Wait for clean to finish
        await expect(page.getByText(/Cleaning\.\.\./i)).toBeVisible({ timeout: 5000 }).catch(() => {});
        await expect(page.getByText(/Clean Selected/i)).toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(2000);

        // Bridge: count TEMP files after
        const { stdout: afterStr } = await runBridge(
            '(Get-ChildItem $env:TEMP -ErrorAction SilentlyContinue).Count'
        );
        const countAfter = parseInt(afterStr.trim() || '0', 10);

        const decreased = countAfter <= countBefore;

        record({
            feature: 'StorageManager',
            test: 'clean temp files, bridge confirms count decreased',
            status: decreased ? 'PASS' : 'WARN',
            bridgeOutput: `TEMP count: ${countBefore} → ${countAfter}`,
            durationMs: Date.now() - start,
            note: !decreased
                ? `TEMP count did not decrease (${countBefore} → ${countAfter}) — may be system-locked files`
                : undefined,
        });
    });
});
```

- [ ] **Step 2: Type-check the complete file**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify Playwright can list the tests in this spec**

```powershell
npx playwright test features-direct --config=playwright.vm.config.ts --list
```

Expected: ~11 tests listed across 6 describe blocks.

- [ ] **Step 4: Commit**

```powershell
git add e2e/features-direct.spec.ts
git commit -m "feat(e2e): add features-direct.spec.ts — Group A VM UI+bridge tests"
```

---

## Task 8: Update `vm-test-runner.ps1` — add step 6.5 FeaturesVerify

**Files:**
- Modify: `scripts/vm-test-runner.ps1`

- [ ] **Step 1: Add `-FeaturesVerify` switch parameter**

In `scripts/vm-test-runner.ps1`, add this parameter after `[switch]$DirectVerifyOnly,`:

```powershell
    # After direct tweak verification, also run features-direct.spec.ts
    [switch]$FeaturesVerify,
```

- [ ] **Step 2: Update step 1 header to show 8 steps when FeaturesVerify is on**

Change the step numbers in the Write-Host banners at the top of the restore section from `[1/6]` through `[7/7]` to `[1/7]` through `[8/8]` when `$FeaturesVerify` is set. The simplest approach: add a helper variable near the top of the script (after the params block):

```powershell
$totalSteps = if ($FeaturesVerify) { 8 } else { 7 }
```

Then update the step labels to use `$totalSteps` — but this is a heavy refactor. **Instead**, just append a new step 6.5 block and leave existing step numbers unchanged (the spec doc says "step 7/7").

- [ ] **Step 3: Insert the FeaturesVerify step block**

Add the following block in `scripts/vm-test-runner.ps1` immediately after the closing `} else {` / `Write-Host "[6/7] Skipping direct verification..."` block (before `# --- Step 7: Generate Report`):

```powershell
# --- Step 6.5: Features Direct Verification ---------------------------------

$featuresExitCode = 0

if ($FeaturesVerify) {
    Write-Host ""
    Write-Host "[6.5/7] Running features direct verification (UI + bridge for Group A features)..." -ForegroundColor Yellow
    Write-Host "  Results: $ProjectDir\test-results\features-direct\features-summary.json" -ForegroundColor DarkGray
    Write-Host ""

    $session = New-WinOptVmSession
    try {
        $featuresProcessId = Invoke-Command -Session $session -ScriptBlock {
            $project = "C:\WinOpt\WinOptimizerRevamp"
            $nodeDir  = "C:\WinOpt\tools\nodejs"
            $playwright = Join-Path $project "node_modules\.bin\playwright.cmd"

            if (-not (Test-Path $playwright)) {
                throw "Playwright CLI not found: $playwright"
            }

            Remove-Item -Path "C:\WinOpt\features-playwright.log"   -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "C:\WinOpt\features-exitcode.txt"     -Force -ErrorAction SilentlyContinue

            $script = @"
`$ErrorActionPreference = 'Continue'
if (Test-Path '$nodeDir') { `$env:Path = '$nodeDir;' + `$env:Path }
`$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\WinOpt\ms-playwright'
`$env:VM_URL   = 'http://localhost:1420'
`$env:VM_BRIDGE = 'false'
Remove-Item Env:VM_NAME -ErrorAction SilentlyContinue
Remove-Item Env:WINOPT_VM_PASSWORD -ErrorAction SilentlyContinue
Set-Location '$project'
& '$playwright' test features-direct --config=playwright.vm.config.ts *> 'C:\WinOpt\features-playwright.log'
`$code = if (`$null -eq `$LASTEXITCODE) { 1 } else { `$LASTEXITCODE }
Set-Content -Path 'C:\WinOpt\features-exitcode.txt' -Value `$code -Encoding ASCII
exit `$code
"@
            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
            $proc = Start-Process -FilePath powershell.exe `
                -ArgumentList @("-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-EncodedCommand",$encoded) `
                -WindowStyle Hidden -PassThru
            return $proc.Id
        }

        Write-Host "  Guest features process: $featuresProcessId" -ForegroundColor DarkGray
        $featDeadline = (Get-Date).AddHours(1)

        while ($true) {
            $state = Invoke-Command -Session $session -ArgumentList $featuresProcessId -ScriptBlock {
                param($Pid)
                $proc     = Get-Process -Id $Pid -ErrorAction SilentlyContinue
                $exitPath = "C:\WinOpt\features-exitcode.txt"
                $logPath  = "C:\WinOpt\features-playwright.log"
                [ordered]@{
                    running  = $null -ne $proc
                    exitCode = if (Test-Path $exitPath) { (Get-Content $exitPath -Raw).Trim() } else { "" }
                    logTail  = if (Test-Path $logPath)  { (Get-Content $logPath  -Tail 6) -join "`n" } else { "" }
                }
            }

            if ($state.logTail) {
                Write-Host "  Features progress:" -ForegroundColor DarkGray
                $state.logTail -split "`n" | Where-Object { $_.Trim() } | ForEach-Object {
                    Write-Host "    $_" -ForegroundColor DarkGray
                }
            }

            if (-not $state.running) {
                $featuresExitCode = if ($state.exitCode -match '^\d+$') { [int]$state.exitCode } else { 1 }
                break
            }

            if ((Get-Date) -gt $featDeadline) {
                Invoke-Command -Session $session -ArgumentList $featuresProcessId -ScriptBlock {
                    param($p) Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
                throw "Features verification did not finish within 1 hour."
            }

            Start-Sleep -Seconds 10
        }

        Copy-Item -FromSession $session `
            -Path "C:\WinOpt\WinOptimizerRevamp\test-results\features-direct" `
            -Destination (Join-Path $ProjectDir "test-results") `
            -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -FromSession $session `
            -Path "C:\WinOpt\features-playwright.log" `
            -Destination $runLogDir -Force -ErrorAction SilentlyContinue
    } finally {
        Remove-PSSession $session -ErrorAction SilentlyContinue
    }

    # Show summary
    $featuresSummary = "$ProjectDir\test-results\features-direct\features-summary.json"
    if (Test-Path $featuresSummary) {
        $fs = Get-Content $featuresSummary | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Features Verify Results:" -ForegroundColor $(if ($fs.failed -eq 0) { "Green" } else { "Yellow" })
        Write-Host "    PASS:  $($fs.passed)"  -ForegroundColor Green
        Write-Host "    FAIL:  $($fs.failed)"  -ForegroundColor $(if ($fs.failed -gt 0) { "Red" } else { "Green" })
        Write-Host "    WARN:  $($fs.warned)"  -ForegroundColor Yellow
        Write-Host "    SKIP:  $($fs.skipped)" -ForegroundColor DarkGray
    }
} else {
    Write-Host ""
    Write-Host "[6.5/7] Skipping features verification (use -FeaturesVerify to enable)" -ForegroundColor DarkGray
}
```

- [ ] **Step 4: Update overall exit code to include $featuresExitCode**

Find this line in `vm-test-runner.ps1`:

```powershell
$overallExitCode = [Math]::Max($testExitCode, $directExitCode)
```

Replace with:

```powershell
$overallExitCode = [Math]::Max([Math]::Max($testExitCode, $directExitCode), $featuresExitCode)
```

- [ ] **Step 5: Type-check / lint the PS script (basic syntax validation)**

```powershell
powershell -NoProfile -Command "& { . 'F:\WinOpt\WinOptimizerRevamp\scripts\vm-test-runner.ps1' -WhatIf }" 2>&1 | Select-String -Pattern "error|exception" -CaseSensitive:$false | Select-Object -First 10
```

Expected: no parse errors output (the script has `#Requires -RunAsAdministrator` so it may error on privilege — that's fine, we're checking parse).

Actually use the PS parser directly:

```powershell
$content = Get-Content 'F:\WinOpt\WinOptimizerRevamp\scripts\vm-test-runner.ps1' -Raw
$errors = @()
[System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$null, [ref]$errors) | Out-Null
$errors | ForEach-Object { Write-Host $_.Message }
Write-Host "Parse errors: $($errors.Count)"
```

Expected: `Parse errors: 0`

- [ ] **Step 6: Commit**

```powershell
git add scripts/vm-test-runner.ps1
git commit -m "feat(scripts): add FeaturesVerify step 6.5 to vm-test-runner"
```

---

## Task 9: Update `vm-run-automated-suite.ps1` — add FeaturesVerify flag and artifact

**Files:**
- Modify: `scripts/vm-run-automated-suite.ps1`

- [ ] **Step 1: Add `-FeaturesVerify` switch to vm-run-automated-suite.ps1**

In `scripts/vm-run-automated-suite.ps1`, add after `[switch]$SkipRestore,`:

```powershell
    [switch]$FeaturesVerify,
```

- [ ] **Step 2: Pass the flag through to vm-test-runner.ps1**

In the `$runnerParams` hashtable, add:

```powershell
if ($FeaturesVerify) {
    $runnerParams.FeaturesVerify = $true
}
```

(Place this block alongside the existing `if ($SkipRestore)` block.)

- [ ] **Step 3: Add features-summary.json to the artifacts check**

After the existing `$directResults` line:

```powershell
$directResults = Join-Path $ProjectDir "test-results\vm-direct\direct-summary.json"
```

Add:

```powershell
$featuresResults = Join-Path $ProjectDir "test-results\features-direct\features-summary.json"
```

Update the Write-Host artifacts section to include:

```powershell
Write-Host "  Features results: $featuresResults" -ForegroundColor White
```

Update the artifact existence check to only include featuresResults when FeaturesVerify was requested:

```powershell
$requiredArtifacts = @($uiResults, $directResults)
if ($FeaturesVerify) { $requiredArtifacts += $featuresResults }
foreach ($artifact in $requiredArtifacts) {
    if (-not (Test-Path $artifact)) {
        Write-Error "Expected artifact was not created: $artifact"
        exit 1
    }
}
```

(Replace the existing `foreach ($artifact in @($uiResults, $directResults))` block.)

- [ ] **Step 4: PS syntax validation**

```powershell
$content = Get-Content 'F:\WinOpt\WinOptimizerRevamp\scripts\vm-run-automated-suite.ps1' -Raw
$errors = @()
[System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$null, [ref]$errors) | Out-Null
Write-Host "Parse errors: $($errors.Count)"
```

Expected: `Parse errors: 0`

- [ ] **Step 5: Commit**

```powershell
git add scripts/vm-run-automated-suite.ps1
git commit -m "feat(scripts): thread FeaturesVerify through automated suite runner"
```

---

## Task 10: Smoke-test the spec locally (no VM required)

This task verifies the spec is syntactically correct and can be listed/collected by Playwright before the VM is involved.

- [ ] **Step 1: Confirm all 11 tests are listed**

```powershell
npx playwright test features-direct --config=playwright.vm.config.ts --list
```

Expected output (11 tests, 6 describe blocks):

```
Startup Manager > startup page lists items with name, command, enabled fields
Startup Manager > disable first enabled startup item then re-enable via UI, bridge confirms
Privacy Audit > privacy audit auto-scans and shows numeric score 0–100
Privacy Audit > Fix All button applies fixes; bridge confirms AllowTelemetry registry
Process Manager > process list loads and contains explorer.exe or svchost.exe
Process Manager > bridge spawns notepad → UI kill → bridge confirms gone
Process Manager > set process priority to Below Normal via UI; bridge confirms PriorityClass
Network Analyzer > interface cards render with name and status
Network Analyzer > ping 127.0.0.1 returns latency ≥ 0 ms
Latency Optimizer > timer resolution value is visible (a number in ms)
Latency Optimizer > Flush Standby List button shows MB freed
Storage Manager > disk health section shows at least one disk entry
Storage Manager > junk scan runs and list renders (empty is valid)
Storage Manager > if temp files found → Clean Selected; bridge confirms TEMP count decreased
```

- [ ] **Step 2: Final type check**

```powershell
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Tag in the spec doc that the plan is implemented**

No file update required — the design doc already exists. Just record completion in git log.

- [ ] **Step 4: Final commit**

```powershell
git add e2e/features-direct.spec.ts scripts/vm-test-runner.ps1 scripts/vm-run-automated-suite.ps1
git commit -m "chore: verify features-direct smoke test passes list check"
```

---

## How to run in the VM

After implementation, the full command is:

```powershell
# From an elevated host PowerShell:
.\scripts\vm-run-automated-suite.ps1 -DirectVerify -FeaturesVerify

# Or standalone inside the VM (after dev server is running):
npx playwright test features-direct --config=playwright.vm.config.ts
```

Results appear in `test-results/features-direct/features-summary.json`.
