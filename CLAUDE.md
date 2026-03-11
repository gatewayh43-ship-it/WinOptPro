# WinOpt Pro — Claude Quick Reference

Tauri 2 + React 19 desktop app for Windows optimization. Fully implemented — Rust backend has 20+ modules with real Tauri commands.

**Working directory:** `F:/WinOpt/WinOptimizerRevamp/`

## Commands
```
npm run dev              # frontend only (Vite, no Rust, mock data via isTauri guard)
npm run tauri dev        # full desktop app (compiles Rust)
npm run tauri build      # production build → src-tauri/target/release/bundle/
npx tsc --noEmit         # type-check only
npx vitest run           # run all 643 tests
npx shadcn add <c>       # add shadcn component → src/components/ui/
```

## Non-obvious constraints

- **Tailwind 4** — config is in CSS (`src/index.css`), no `tailwind.config.js`. Uses `@tailwindcss/vite` plugin.
- **No react-router** — views switch via `currentView` state in `App.tsx`. Register new views in the `views` object and add a nav item in `Sidebar.tsx`.
- **isTauri guard** — hooks use `const isTauri = '__TAURI_INTERNALS__' in window` at module level (not function level). When `false`, hooks return mock data so `npm run dev` works without Tauri.
- **shadcn** — uses `@radix-ui/react-*` individual packages (NOT the old `radix-ui` monorepo).
- **Zustand cache** — `useGlobalCache` persists between tests. `src/test/setup.ts` calls `clearCache()` in `beforeEach`.

## Rust backend modules (src-tauri/src/)

| Module | Key commands |
|--------|-------------|
| `system.rs` | `get_system_vitals` (CPU/RAM/GPU/disk/network), GpuInfo (WMI) |
| `tweaks.rs` | `apply_tweak`, `revert_tweak`, `get_tweak_status` |
| `gaming.rs` | `detect_active_game` (190+ exes), `get_gpu_metrics`, `show/hide_gaming_overlay` |
| `wsl.rs` | 16 commands — full WSL lifecycle, distro mgmt, WSLg launch |
| `gpu_driver.rs` | `get_gpu_drivers`, `uninstall_gpu_drivers`, `schedule_safe_mode_removal` |
| `latency.rs` | `get_latency_status` (NtQueryTimerResolution FFI), `flush_standby_list` |
| `storage.rs` | `get_disk_smart_status`, `run_trim_optimization` |
| `network.rs` | `get_network_interfaces`, `ping_host` |
| `power.rs` | `get_power_plans`, `get_battery_health`, `set_power_setting` |
| `privacy.rs` | `scan_privacy_issues`, `fix_privacy_issues` |
| `drivers.rs` | `list_drivers`, `get_unsigned_drivers` |
| `backup.rs` | `export_backup`, `import_backup` |
| `report.rs` | `generate_system_report` |
| `scheduler.rs` | `list/create/delete/run_now` maintenance tasks (schtasks.exe) |
| `db.rs` | SQLite audit log + AES-256-GCM field encryption |
| `security.rs` | Defender / firewall settings |
| `startup.rs` | Startup item scan + enable/disable |
| `process.rs` | Process list, kill, set priority |
| `ai.rs` | Ollama LLM integration |
| `apps.rs` | Winget/choco app management |

## Frontend structure

```
src/
├── pages/           # 22 page components (one per sidebar nav item)
├── hooks/           # 25+ custom hooks (one per backend module)
├── components/
│   ├── layout/      # MainLayout, Sidebar
│   ├── ui/          # shadcn/ui generated components
│   └── ...          # shared: Toasts, ErrorBoundary, CommandPalette, AIAssistant
├── data/
│   ├── tweaks.json  # 162 tweaks (Performance:17, Gaming:19, Privacy:48, ...)
│   ├── apps.json    # curated app list for AppStore
│   └── app_metadata.json  # 391 apps with full metadata, logos, links
├── store/
│   └── appStore.ts  # Zustand — appliedTweaks[], filters, expertMode, theme
└── __tests__/       # 643 tests / 58 files
```

## Key patterns

**Add a new page:**
1. Create `src/pages/MyPage.tsx`
2. Add `my_page: <MyPage />` to `views` object in `App.tsx`
3. Add nav item to `NAV_GROUPS` in `Sidebar.tsx`
4. Create `src/hooks/useMyModule.ts` with `isTauri` guard + mock data

**Add a new Rust command:**
1. Add function with `#[tauri::command]` in appropriate `src-tauri/src/*.rs` module
2. Register in `invoke_handler(...)` in `src-tauri/src/lib.rs`
3. Call from frontend: `invoke("command_name", { args })`

**Add a tweak:** Add entry to `src/data/tweaks.json` — required fields: `id`, `name`, `category`, `risk` (LOW/MEDIUM/HIGH), `description`, `applyCmd`, `revertCmd`, `validationCmd`.

## Test patterns

- `renderHook` from `@/test/utils` (re-exports @testing-library/react)
- Mock Tauri: `vi.mocked(tauriCore.invoke).mockImplementation(...)`
- framer-motion: mock `motion.div`, `AnimatePresence`, `useReducedMotion` per file
- Web Workers: `vi.stubGlobal("Worker", class MockWorker { ... })`
- Hooks with module-level `isTauri`: use `vi.resetModules()` + dynamic `import()` after setting `window.__TAURI_INTERNALS__`
- `scrollIntoView`: `Element.prototype.scrollIntoView = vi.fn()`
- Fake timers + `waitFor` hang — use `act(() => vi.advanceTimersByTime(n))` instead
