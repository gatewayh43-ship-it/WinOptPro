# Contributing to WinOpt Pro

Thank you for your interest in contributing to WinOpt Pro. This guide covers everything you need to go from a fresh clone to a merged pull request: dev environment setup, project layout, how to add tweaks and pages, Rust command patterns, testing practices, and the PR process.

Please read this document in full before opening an issue or submitting a PR. Following these conventions keeps the codebase consistent and makes reviews faster for everyone.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Dev Setup](#dev-setup)
3. [Project Structure](#project-structure)
4. [Adding a New Tweak](#adding-a-new-tweak)
5. [Adding a New Page](#adding-a-new-page)
6. [Rust Backend — Adding a Tauri Command](#rust-backend--adding-a-tauri-command)
7. [Testing](#testing)
8. [Code Style](#code-style)
9. [PR Process](#pr-process)
10. [Issue Reporting](#issue-reporting)

---

## Prerequisites

Install the following before cloning:

| Tool | Minimum Version | Install |
|---|---|---|
| **Rust** | 1.77 | [rustup.rs](https://rustup.rs) — includes `rustfmt` and `clippy` |
| **Node.js** | 18 LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Bundled with Node.js |
| **Visual Studio Build Tools** | 2019+ | Required by Tauri for MSVC linker on Windows |
| **WebView2 Runtime** | latest | Pre-installed on Windows 11; [download for Windows 10](https://developer.microsoft.com/microsoft-edge/webview2/) |
| **Git** | any recent | [git-scm.com](https://git-scm.com) |

**Recommended editor:** Visual Studio Code with the following extensions:

| Extension | ID | Purpose |
|---|---|---|
| rust-analyzer | `rust-lang.rust-analyzer` | Rust language server, autocomplete, inlay hints |
| Tauri | `tauri-apps.tauri-vscode` | Tauri-specific helpers and config schema |
| ESLint | `dbaeumer.vscode-eslint` | TypeScript linting |
| Prettier | `esbenp.prettier-vscode` | Auto-formatting |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Class autocomplete |
| Error Lens | `usernamehere.errorlens` | Inline error highlighting |

---

## Dev Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/winopt-pro.git
cd winopt-pro

# 2. Install Node dependencies
npm install

# 3a. Frontend-only dev server (fast, no Rust compilation)
#     Uses mock data via isTauri=false guards in hooks
npm run dev

# 3b. Full Tauri desktop app (compiles Rust backend)
#     First run takes ~3-5 minutes; subsequent runs are incremental
npm run tauri dev

# 4. Type-check TypeScript without emitting
npx tsc --noEmit

# 5. Run all tests
npx vitest run

# 6. Production build
npm run tauri build
```

> The frontend dev server runs on `http://localhost:1420`. When running `npm run dev` (without Tauri), all hooks fall back to mock data because `window.__TAURI_INTERNALS__` is not present.

---

## Project Structure

```
WinOptimizerRevamp/
│
├── src/                              # React 19 + TypeScript frontend
│   │
│   ├── pages/                        # One file per full-screen view
│   │   ├── Dashboard.tsx             # System vitals, health score, quick actions
│   │   ├── TweaksPage.tsx            # Main tweak browser (search, filter, apply)
│   │   ├── GamingPage.tsx            # Game detection, auto-optimize, baseline
│   │   ├── GamingOverlayPage.tsx     # Transparent always-on-top overlay window
│   │   ├── GpuDriverPage.tsx         # DDU-style driver cleaner
│   │   ├── WslPage.tsx               # WSL Manager (distros, config, Linux Mode)
│   │   ├── LatencyPage.tsx           # Timer resolution, standby flush, bcdedit
│   │   ├── PrivacyAuditPage.tsx      # 9-check privacy scanner
│   │   ├── DriverManagerPage.tsx     # PnP driver list and unsigned detection
│   │   ├── ProcessPage.tsx           # Real-time process manager
│   │   ├── NetworkAnalyzerPage.tsx   # Interface info, ping, DNS tweaks
│   │   ├── StoragePage.tsx           # SMART health, TRIM, scheduled maintenance
│   │   ├── PowerPage.tsx             # Power plans, battery, per-setting timeouts
│   │   ├── StartupPage.tsx           # Startup item manager
│   │   ├── AppsPage.tsx              # Curated app catalog (winget/choco)
│   │   ├── AppDetailsPage.tsx        # Individual app detail view
│   │   ├── DefenderPage.tsx          # Windows Defender settings
│   │   ├── SystemReportPage.tsx      # HTML report generator
│   │   ├── HistoryPage.tsx           # Encrypted audit log viewer
│   │   ├── ProfilesPage.tsx          # Save/load configuration profiles
│   │   └── SettingsPage.tsx          # App settings, backup/restore, Expert Mode
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx        # Shell: sidebar + main content area
│   │   │   └── Sidebar.tsx           # Navigation with grouped NAV_GROUPS
│   │   ├── ui/                       # shadcn/ui generated components (owned copies)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   ├── AI/                       # AI Assistant chat components
│   │   │   └── AIAssistantChat.tsx
│   │   ├── CommandPalette.tsx        # Ctrl+K semantic search (Web Worker)
│   │   ├── ConfirmDeployModal.tsx    # Confirmation dialog for destructive actions
│   │   ├── ProgressModal.tsx         # Long-running operation progress display
│   │   ├── ErrorBoundary.tsx         # React error boundary wrapper
│   │   ├── ExpertModeGate.tsx        # Blocks red-tier tweaks without Expert Mode
│   │   ├── GlobalLoadingScreen.tsx   # Initial app loading screen
│   │   ├── OnboardingModal.tsx       # First-run onboarding flow
│   │   ├── ToastSystem.tsx           # Toast notification system + useToast hook
│   │   └── WslSetupWizard.tsx        # 7-step WSL setup full-screen wizard
│   │
│   ├── hooks/                        # Custom React hooks (all data-fetching logic)
│   │   ├── useSystemVitals.ts        # CPU, RAM, GPU, disk vitals polling
│   │   ├── useTweakExecution.ts      # Apply/revert tweaks, batch operations
│   │   ├── useGaming.ts              # Game detection, GPU snapshot, auto-optimize
│   │   ├── useGpuDriver.ts           # Driver list, uninstall, safe-mode schedule
│   │   ├── useWsl.ts                 # WSL distro management, .wslconfig, wizard
│   │   ├── useLatency.ts             # Timer resolution, standby flush, bcdedit
│   │   ├── usePrivacyAudit.ts        # Privacy scan and fix
│   │   ├── useDrivers.ts             # PnP driver list and unsigned detection
│   │   ├── useProcesses.ts           # Process list, kill, priority
│   │   ├── useNetwork.ts             # Interface info, ping, DNS
│   │   ├── useStorage.ts             # SMART, TRIM, scheduled maintenance
│   │   ├── usePower.ts               # Power plans, battery health, settings
│   │   ├── useStartupItems.ts        # Startup entries
│   │   ├── useApps.ts                # App catalog and install status
│   │   ├── useDefender.ts            # Defender settings
│   │   ├── useSystemReport.ts        # Report generation
│   │   ├── useBackup.ts              # Backup/restore
│   │   ├── useScheduler.ts           # Task Scheduler integration
│   │   ├── useElevation.ts           # Admin privilege detection
│   │   ├── useTheme.tsx              # Dark/light theme + color scheme
│   │   ├── useGlobalCache.ts         # Zustand global cache store
│   │   └── useSmartStore.ts          # Persisted settings store
│   │
│   ├── data/                         # Static data files
│   │   ├── tweaks.json               # All 165 tweak definitions
│   │   ├── apps.json                 # Curated app catalog
│   │   └── app_metadata.json         # App icons and metadata
│   │
│   ├── __tests__/                    # Vitest test suite (417 tests)
│   │   ├── hooks/                    # 13 hook unit test files
│   │   ├── pages/                    # 15 page integration test files
│   │   ├── components/               # 11 component test files
│   │   └── utils/                    # filterTweaks data integrity tests
│   │
│   ├── test/                         # Test infrastructure
│   │   ├── setup.ts                  # Global mocks, beforeEach cache reset
│   │   └── utils.tsx                 # Re-exports renderHook, render with providers
│   │
│   ├── App.tsx                       # Root component; view-switching state machine
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Tailwind 4 config + CSS variables
│
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── lib.rs                    # generate_handler! registration, app builder
│   │   ├── main.rs                   # Binary entry point
│   │   ├── system.rs                 # SystemVitals, GpuInfo (WMI)
│   │   ├── tweaks.rs                 # Apply/revert registry/service tweaks
│   │   ├── gaming.rs                 # Game detection, GPU metrics, overlay window
│   │   ├── wsl.rs                    # WSL lifecycle (16 commands)
│   │   ├── gpu_driver.rs             # Driver uninstall, safe-mode RunOnce
│   │   ├── latency.rs                # NtQueryTimerResolution FFI, bcdedit
│   │   ├── storage.rs                # SMART (PS), TRIM, Optimize-Volume
│   │   ├── network.rs                # Interface info, ping, DNS
│   │   ├── power.rs                  # Power plans, battery, powercfg
│   │   ├── privacy.rs                # Telemetry/registry/service checks
│   │   ├── drivers.rs                # WMI Win32_PnPSignedDriver
│   │   ├── backup.rs                 # .winopt JSON export/import
│   │   ├── report.rs                 # HTML system report
│   │   ├── scheduler.rs              # schtasks.exe wrapper
│   │   ├── db.rs                     # SQLite + AES-256-GCM audit log
│   │   ├── security.rs               # Defender, firewall
│   │   ├── startup.rs                # Startup item registry management
│   │   ├── process.rs                # Process list (sysinfo), kill, priority
│   │   ├── ai.rs                     # Ollama HTTP client
│   │   └── apps.rs                   # Winget/choco install
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
│
├── public/                           # Static frontend assets
├── index.html                        # HTML entry point
├── vite.config.ts                    # Vite + @tailwindcss/vite plugin
├── vitest.config.ts                  # Vitest configuration
├── tsconfig.json
├── package.json
└── components.json                   # shadcn/ui CLI configuration
```

---

## Adding a New Tweak

Tweaks are data-driven. The entire tweak system is defined in `src/data/tweaks.json`. No new Rust code is needed for standard registry tweaks — the generic `apply_tweak` / `revert_tweak` commands in `tweaks.rs` handle them.

### Step 1: Add the JSON entry to `tweaks.json`

Each tweak object must include all of the following fields:

```json
{
  "id": "DisableSearchHighlights",
  "name": "Disable Search Highlights",
  "description": "Removes dynamic content and news from the Windows Search bar.",
  "category": "Windows UI",
  "risk": "low",
  "tags": ["search", "ui", "privacy"],
  "apply": {
    "type": "registry",
    "path": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds\\DSB",
    "key": "ShowDynamicContent",
    "value": 0,
    "valueType": "DWORD"
  },
  "revert": {
    "type": "registry",
    "path": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds\\DSB",
    "key": "ShowDynamicContent",
    "value": 1,
    "valueType": "DWORD"
  },
  "requiresAdmin": false,
  "requiresRestart": false
}
```

**Field reference:**

| Field | Type | Values | Required |
|---|---|---|---|
| `id` | string | PascalCase, unique | Yes |
| `name` | string | Human-readable | Yes |
| `description` | string | One sentence | Yes |
| `category` | string | Must match existing category | Yes |
| `risk` | string | `"low"` \| `"medium"` \| `"high"` | Yes |
| `tags` | string[] | Lowercase keywords for search | Yes |
| `apply` | object | Action descriptor | Yes |
| `revert` | object | Action descriptor | Yes |
| `requiresAdmin` | boolean | — | Yes |
| `requiresRestart` | boolean | — | Yes |

**Action types:**

- `"registry"` — reads/writes a registry key (`path`, `key`, `value`, `valueType`)
- `"service"` — sets a Windows service startup type (`serviceName`, `startupType`)
- `"command"` — runs an arbitrary command (`cmd`, `args[]`)
- `"powershell"` — runs a PowerShell snippet (`script`)

### Step 2: Verify the category count comment in `src/utils/filterTweaks.ts`

Update the count constant if you are adding to a category that has a hardcoded count assertion in tests.

### Step 3: Write a data integrity test

Add a test case to `src/__tests__/utils/filterTweaks.test.ts` to assert the new tweak appears under its category with the correct risk level:

```typescript
it("DisableSearchHighlights is low risk in Windows UI", () => {
  const tweak = allTweaks.find(t => t.id === "DisableSearchHighlights");
  expect(tweak).toBeDefined();
  expect(tweak!.category).toBe("Windows UI");
  expect(tweak!.risk).toBe("low");
});
```

---

## Adding a New Page

Follow this sequence to wire up a new page from scratch.

### Step 1: Create the hook in `src/hooks/`

```typescript
// src/hooks/useMyFeature.ts
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ToastSystem";

const isTauri = Boolean(window.__TAURI_INTERNALS__);

export interface MyFeatureData {
  value: string;
}

export function useMyFeature() {
  const { addToast } = useToast();
  const [data, setData] = useState<MyFeatureData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (isTauri) {
        const result = await invoke<MyFeatureData>("get_my_feature_data");
        setData(result);
      } else {
        // Mock data for npm run dev
        setData({ value: "mock value" });
      }
    } catch (err) {
      addToast({ type: "error", message: String(err) });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return { data, loading, refresh: () => fetchData(true) };
}
```

### Step 2: Create the page in `src/pages/`

```typescript
// src/pages/MyFeaturePage.tsx
import { useMyFeature } from "@/hooks/useMyFeature";

export function MyFeaturePage() {
  const { data, loading, refresh } = useMyFeature();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Feature</h1>
      {loading && <p>Loading...</p>}
      {data && <p>{data.value}</p>}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Step 3: Register the view in `src/App.tsx`

```typescript
// Add to the view map inside App.tsx
import { MyFeaturePage } from "./pages/MyFeaturePage";

// Inside the JSX view switch:
{currentView === "my_feature" && <MyFeaturePage />}
```

### Step 4: Add navigation in `src/components/layout/Sidebar.tsx`

```typescript
import { Sparkles } from "lucide-react"; // pick an appropriate icon

// Add to the relevant NAV_GROUPS array entry:
{ id: "my_feature", label: "My Feature", icon: Sparkles }
```

Choose the correct group: `tuning`, `apps`, `utilities`, or `system`.

### Step 5: Write tests

Create two test files:

- `src/__tests__/hooks/useMyFeature.test.tsx` — unit test the hook with mocked `invoke`
- `src/__tests__/pages/MyFeaturePage.test.tsx` — integration test the page

See [Testing](#testing) for patterns and required mock setup.

---

## Rust Backend — Adding a Tauri Command

### Step 1: Create the function in the appropriate module

```rust
// src-tauri/src/my_feature.rs

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct MyFeatureData {
    pub value: String,
}

#[tauri::command]
pub async fn get_my_feature_data() -> Result<MyFeatureData, String> {
    // Call Windows APIs, registry, WMI, etc.
    // Return Err(String) to propagate errors to the frontend.
    Ok(MyFeatureData {
        value: "real value from Windows".to_string(),
    })
}
```

### Step 2: Declare the module in `lib.rs`

```rust
// src-tauri/src/lib.rs
mod my_feature;
```

### Step 3: Register the command in `generate_handler!`

```rust
// src-tauri/src/lib.rs — inside the builder chain
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    my_feature::get_my_feature_data,
])
```

### Step 4: Call from the frontend

```typescript
import { invoke } from "@tauri-apps/api/core";

const result = await invoke<MyFeatureData>("get_my_feature_data");
```

### Step 5: Add Cargo dependencies if needed

```toml
# src-tauri/Cargo.toml
[dependencies]
# Add any new crates here
```

Run `cargo check` inside `src-tauri/` to verify before testing.

### Common Rust patterns in this codebase

**WMI query:**

```rust
use std::process::Command;

let output = Command::new("powershell")
    .args(["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | ConvertTo-Json"])
    .output()
    .map_err(|e| e.to_string())?;
let stdout = String::from_utf8_lossy(&output.stdout);
```

**Registry read:**

```rust
use windows::Win32::System::Registry::*;
// Use the windows-rs crate registry APIs
```

**Returning errors:** Always return `Result<T, String>` — Tauri serializes the `Err(String)` to a rejected Promise on the frontend.

---

## Testing

### Running tests

```bash
# Run all 417 tests once
npx vitest run

# Watch mode (re-runs on file save)
npx vitest

# With coverage report
npx vitest run --coverage

# Run a specific test file
npx vitest run src/__tests__/hooks/useMyFeature.test.tsx

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "should fetch data"
```

### Test file conventions

- Hook tests: `src/__tests__/hooks/useXxx.test.tsx`
- Page tests: `src/__tests__/pages/XxxPage.test.tsx`
- Component tests: `src/__tests__/components/Xxx.test.tsx`
- Use `renderHook` and `render` from `@/test/utils` (not directly from `@testing-library/react`) to get providers automatically

### Required mock setup

Every test file that uses a hook with `useToast` must include a stable mock to avoid stale closure issues in `useCallback` deps:

```typescript
vi.mock("@/components/ToastSystem", () => {
  const addToast = vi.fn();
  return { useToast: () => ({ addToast }) };
});
```

Mock `invoke` at the top of each file that calls Tauri:

```typescript
import * as tauriCore from "@tauri-apps/api/core";
vi.mock("@tauri-apps/api/core");

// In individual tests:
vi.mocked(tauriCore.invoke).mockResolvedValue({ value: "mocked" });
```

Mock framer-motion to prevent animation-related test failures:

```typescript
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    motion: { ...actual.motion, div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => true,
  };
});
```

Mock the Web Worker (JSDOM does not support Workers):

```typescript
vi.stubGlobal("Worker", class MockWorker {
  onmessage = null;
  postMessage() {}
  terminate() {}
});
```

Mock `scrollIntoView` for components with auto-scroll refs:

```typescript
Element.prototype.scrollIntoView = vi.fn();
```

### Timer and async patterns

- Do not mix `vi.useFakeTimers()` with `waitFor` — `waitFor` hangs under fake timers.
- Instead, use `act(() => vi.advanceTimersByTime(n))` and assert directly after.
- For hooks with polling intervals (like `useSystemVitals`), use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(interval)`.

### Zustand cache reset

`useGlobalCache` persists state between tests. The global `beforeEach` in `src/test/setup.ts` calls `useGlobalCache.getState().clearCache()` automatically. If you add a new Zustand store, add a similar reset there.

---

## Code Style

### TypeScript

- No `any` types. Use `unknown` and narrow, or define proper interfaces.
- All props must be typed with an explicit `interface` or `type`.
- Use functional components only — no class components.
- Use named exports for components and hooks; default exports only for pages (to match lazy-loading patterns).
- Prefer `const` arrow functions for component definitions: `export const MyComponent = () => { ... }`.

### React

- Custom hooks encapsulate all side effects and data fetching. Pages and components should be presentational where possible.
- All hooks that call `invoke` must include an `isTauri` guard with mock fallback data, so the app runs under `npm run dev` without a Tauri runtime.
- Use `useCallback` for functions passed as props or included in `useEffect` dependency arrays.
- Do not use `useEffect` to derive state — compute it inline or use `useMemo`.

### Rust

Run these before committing:

```bash
# Format (inside src-tauri/)
cargo fmt

# Lint
cargo clippy -- -D warnings
```

- All public functions must have doc comments (`///`).
- Use `thiserror` or `String` for error types in command functions.
- Avoid `unwrap()` in command handlers — propagate errors with `?` or `.map_err(|e| e.to_string())`.
- Keep each module focused: one Windows subsystem or feature area per file.

### Tailwind / CSS

- Use Tailwind utility classes directly in JSX.
- Theme tokens (colors, spacing) are defined in `src/index.css` as CSS variables — do not hard-code hex colors.
- Tailwind 4 uses the `@tailwindcss/vite` plugin. There is no `tailwind.config.js` — add custom utilities in `src/index.css` using `@layer utilities`.

---

## PR Process

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| New feature | `feat/short-description` | `feat/disk-benchmark` |
| Bug fix | `fix/short-description` | `fix/gaming-overlay-crash` |
| Refactor | `refactor/short-description` | `refactor/use-global-cache` |
| Documentation | `docs/short-description` | `docs/contributing-guide` |
| Tests | `test/short-description` | `test/wsl-hook-coverage` |

### Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(gaming): add before/after GPU baseline comparison
fix(wsl): handle missing kernel update error in wizard step 2
test(hooks): add useLatency timer resolution mock
docs(readme): update tweak category counts post-uplift
refactor(db): extract encryption helpers to separate module
```

- Keep the subject line under 72 characters.
- Use the body to explain the *why*, not the *what*.
- Reference issues: `Closes #42` or `Fixes #17`.

### PR checklist

Before opening a PR, confirm:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx vitest run` passes (all 417+ tests green)
- [ ] `cargo fmt` and `cargo clippy` pass inside `src-tauri/`
- [ ] New feature has at least one hook test and one page/component test
- [ ] New tweak has a JSON entry with all required fields and a data integrity test
- [ ] `isTauri` guard is in place for any new `invoke` calls
- [ ] No `console.log` statements left in production code
- [ ] PR description explains what changed and why

### Review process

1. Open a draft PR early if you want feedback on approach.
2. At least one maintainer approval is required before merge.
3. Squash-merge is preferred to keep the main branch history clean.
4. Delete the branch after merge.

---

## Issue Reporting

### Bug report template

When filing a bug, include:

```markdown
**WinOpt Pro version:** 1.0.0
**Windows version:** Windows 11 23H2 (build 22631)
**Description:** [What happened vs. what you expected]

**Steps to reproduce:**
1. Open WinOpt Pro
2. Navigate to [page]
3. Click [action]

**Expected behavior:** [What should happen]
**Actual behavior:** [What actually happens]

**Logs / error messages:**
[Paste any error from the Tauri devtools console or Windows Event Viewer]

**Additional context:**
[Admin rights? Which tweaks applied? Antivirus?]
```

### Feature request template

```markdown
**Feature summary:** [One-line description]
**Problem it solves:** [What user pain point does this address?]
**Proposed solution:** [How you imagine it working]
**Alternatives considered:** [Other approaches you thought about]
**Affected modules:** [Which pages/hooks/Rust modules would be involved?]
**Admin required?** [Yes / No / Depends]
```

### Security issues

Do not open a public issue for security vulnerabilities. Email the maintainers directly at `security@winopt-pro.example.com` with a description and reproduction steps. We follow responsible disclosure and aim to respond within 48 hours.

---

Thank you for contributing to WinOpt Pro.
