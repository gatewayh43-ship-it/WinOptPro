<div align="center">

<img src="public/logo.png" alt="WinOpt Pro Logo" width="120" height="120" />

# WinOpt Pro

**The ultimate Windows optimizer for gamers, power users, and privacy advocates.**

[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D4?logo=windows&logoColor=white)](https://microsoft.com/windows)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.77%2B-CE422B?logo=rust&logoColor=white)](https://rust-lang.org)
[![Tests](https://img.shields.io/badge/tests-417%20passing-brightgreen?logo=vitest)](https://vitest.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-informational)](https://github.com/your-org/winopt-pro/releases)

</div>

---

## Features

- **165 system tweaks** across 10 categories — from network latency to privacy telemetry, all reversible
- **Gaming Optimizer** — auto-detects running games, applies a curated tweak pack, shows a real-time GPU/CPU/VRAM overlay window, and captures before/after performance baselines
- **GPU Driver Cleaner** — DDU-style driver removal via `pnputil` + registry sweep; optionally schedules clean removal on next Safe Mode boot
- **WSL Manager** — full Linux subsystem lifecycle: enable/disable features, install 8 distros, edit `.wslconfig`, launch WSLg desktop environments (XFCE4, KDE, GNOME), guided 7-step Setup Wizard
- **Privacy Audit** — scans 9 telemetry, registry, and service vectors; one-click remediation
- **Latency Optimizer** — Windows timer resolution tuner, standby RAM flusher, boot config (`bcdedit`) editor
- **AI Assistant** — local Ollama LLM integration; ask questions, get tweak recommendations, analyze audit results — all offline
- **Encrypted Audit Log** — every command executed is stored with AES-256-GCM field encryption, keyed to your machine GUID

---

## Screenshots

> Screenshot: Dashboard — system vitals (CPU, RAM, GPU, disk), quick-action cards, and health score

> Screenshot: Tweaks Page — category filter bar, risk-level badges, search, Expert Mode gate

> Screenshot: Gaming Optimizer — game detection status, auto-optimize toggle, before/after baseline panel, GPU overlay preview

> Screenshot: WSL Manager — distro grid, .wslconfig editor, Linux Mode launch card

> Screenshot: GPU Driver Cleaner — driver cards with vendor tabs, delete-driver-store option, removal log

> Screenshot: Privacy Audit — 9 privacy checks with severity indicators and fix buttons

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Windows | 10 2004+ (20H1) | Windows 11 required for WSLg desktop environments |
| Rust | 1.77+ | Install via [rustup.rs](https://rustup.rs) |
| Node.js | 18+ | LTS recommended |
| pnpm / npm | any | Project uses `npm` by default |
| Visual Studio Build Tools | 2019+ | Required by Tauri for MSVC linker |
| WebView2 Runtime | latest | Bundled with Windows 11; download for Win 10 |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/winopt-pro.git
cd winopt-pro

# 2. Install frontend dependencies
npm install

# 3a. Run frontend only (Vite dev server, no Tauri)
npm run dev

# 3b. Run the full Tauri desktop app (recommended)
npm run tauri dev
```

> **Note:** The first `tauri dev` run will compile the Rust backend — this takes a few minutes. Subsequent runs are incremental and much faster.

### Build for Production

```bash
npm run tauri build
```

The installer (`*.msi` / `*.exe`) is output to `src-tauri/target/release/bundle/`.

---

## Feature Overview

| Feature | Description | Requires Admin |
|---|---|---|
| **System Tweaks** | 165 registry/service/policy tweaks across 10 categories with full undo | Some tweaks |
| **Dashboard** | Real-time CPU, RAM, GPU, disk vitals; health score; quick actions | No |
| **Gaming Optimizer** | Game detection, auto-optimize, real-time overlay, baseline comparison | Yes |
| **GPU Driver Cleaner** | DDU-style driver uninstall via pnputil + registry sweep + safe mode schedule | Yes |
| **WSL Manager** | Full WSL lifecycle, distro management, .wslconfig editor, WSLg launch | Yes |
| **Latency Optimizer** | Timer resolution, standby RAM flush, bcdedit boot settings | Yes |
| **Privacy Audit** | Scans 9 telemetry/registry/service vectors; one-click fix | Some fixes |
| **Driver Manager** | Lists all PnP drivers, highlights unsigned drivers, exports to CSV | No |
| **Process Manager** | Real-time CPU/memory/disk per-process; kill, set priority, open location | Some actions |
| **Network Analyzer** | Interface info, ping with jitter/packet loss, DNS tweak suggestions | Some tweaks |
| **Storage Optimizer** | SMART health (PowerShell), TRIM, scheduled maintenance, Storage Sense | Some actions |
| **Power Manager** | Power plans, battery health, per-setting AC/DC timeouts | Some settings |
| **Startup Apps** | Enable/disable startup entries (registry + Task Scheduler) | No |
| **App Store** | Curated app catalog, install via winget/chocolatey | Yes (install) |
| **System Report** | Generates full HTML system report, save to disk | No |
| **Backup & Restore** | Export/import settings profiles as `.winopt` JSON files | No |
| **Profiles** | Save and load named configuration sets | No |
| **Command Palette** | Ctrl+K semantic search across all tweaks and features | No |
| **AI Assistant** | Local Ollama LLM for offline recommendations and analysis | No |
| **History / Audit Log** | AES-256-GCM encrypted log of every executed command | No |
| **Windows Defender** | View and toggle Defender settings and exclusions | Yes |

---

## Tweak Categories

| Category | Count | Description |
|---|---|---|
| **Performance** | 17 | CPU scheduling, memory compression, write-back cache, FTH, prefetch, visual effects |
| **Gaming** | 19 | GPU priority, dynamic tick, HPET, fullscreen optimizations, game mode, latency tweaks |
| **Privacy** | 48 | Telemetry, diagnostic data, activity history, Cortana, advertising ID, feedback hub |
| **Network** | 20 | TCP auto-tuning, MTU, DNS, Nagle algorithm, network throttling index |
| **Power** | 11 | Power plans, hibernate, USB power management, processor performance |
| **Security** | 15 | Spectre/Meltdown mitigations, VBS, SMBv1, autorun, script execution policy |
| **Debloat** | 13 | Remove pre-installed apps, disable Xbox services, OneDrive, Widgets |
| **Windows UI** | 14 | Taskbar, Start menu, context menus, snap layouts, animations |
| **Windows Update** | 5 | Delivery Optimization, update deferral, update notifications |
| **Tools** | 9 | Built-in Windows tools and utilities: Disk Cleanup, SFC, DISM, etc. |

**Total: ~165 tweaks**

---

## Risk Level System

Each tweak is assigned one of three risk tiers, displayed as a colored badge:

| Level | Badge | Meaning | Examples |
|---|---|---|---|
| **Green** (Safe) | `LOW` | Safe for all users; fully reversible, no system stability risk | Disable Bing in Start search, Hide Task View button |
| **Yellow** (Caution) | `MEDIUM` | May affect some system behavior; reversible but requires attention | Disable Windows Update automatic restart, Disable Nagle algorithm |
| **Red** (Expert) | `HIGH` | Can cause instability or security exposure if misapplied; requires Expert Mode | Disable VBS/HVCI, Disable Spectre mitigations, Modify boot configuration |

---

## Expert Mode

Red-tier tweaks are hidden behind an **Expert Mode** gate to protect casual users from accidental system damage.

To enable Expert Mode:

1. Open **Settings** (gear icon in the sidebar)
2. Toggle **Expert Mode** under the "Advanced" section
3. Confirm the warning dialog

Once enabled, all 165 tweaks become visible and actionable. Expert Mode state persists across sessions via `localStorage`. A persistent banner reminds you that Expert Mode is active.

---

## Architecture

```
WinOpt Pro
├── Frontend (React 19 + TypeScript)
│   ├── State management — Zustand (global cache) + local React state
│   ├── UI — Tailwind CSS 4 + shadcn/ui + framer-motion
│   ├── Routing — custom view-switch in App.tsx (no react-router)
│   ├── IPC — @tauri-apps/api/core invoke() calls to Rust backend
│   └── Worker — Web Worker for Command Palette semantic search
│
├── Backend (Rust + Tauri 2)
│   ├── Tauri commands — #[tauri::command] functions registered in lib.rs
│   ├── Windows APIs — windows-rs crate (WMI, registry, FFI)
│   ├── Database — SQLite via rusqlite with AES-256-GCM field encryption
│   └── System tools — sysinfo, pnputil, bcdedit, powercfg, schtasks
│
└── Tests — Vitest 417 tests across hooks, pages, components, utils
```

### Key Technology Choices

| Concern | Solution | Rationale |
|---|---|---|
| Desktop runtime | Tauri 2 | Small bundle size vs Electron; native OS integration |
| UI framework | React 19 | Concurrent features, hooks ecosystem |
| Styling | Tailwind CSS 4 | Zero-runtime, CSS-native config (no tailwind.config.js) |
| Component library | shadcn/ui | Copy-owned components, no version lock-in |
| Animations | framer-motion | Declarative, accessible animation |
| State | Zustand | Minimal boilerplate, no context wrapping |
| Rust Windows APIs | windows-rs | First-class Microsoft-maintained bindings |
| Encryption | AES-256-GCM (aes-gcm crate) | Authenticated encryption for audit log fields |
| Testing | Vitest + Testing Library | Fast, Vite-native, ESM-compatible |

### IPC Flow

```
React Component
    │
    ├── invoke("command_name", { args }) ──► Tauri IPC Bridge
    │                                              │
    │                                        Rust #[command]
    │                                              │
    │                                        Windows API / Registry / WMI
    │                                              │
    └────────────── Result<T, String> ◄────────────┘
```

### Database Schema

The audit log (`history.db`) stores every executed command with encrypted sensitive fields:

```sql
CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY,
    timestamp   TEXT NOT NULL,
    tweak_id    TEXT NOT NULL,
    action      TEXT NOT NULL,       -- "apply" | "revert"
    command_executed TEXT,           -- AES-256-GCM encrypted
    stdout      TEXT,                -- AES-256-GCM encrypted
    stderr      TEXT,                -- AES-256-GCM encrypted
    success     INTEGER NOT NULL
);
```

Encrypted fields are prefixed with `enc:` for backward compatibility with unencrypted rows.

---

## Development

```bash
# Type-check only (no emit)
npx tsc --noEmit

# Run all tests
npx vitest run

# Run tests with coverage
npx vitest run --coverage

# Run tests in watch mode
npx vitest

# Lint (if configured)
npm run lint
```

### Environment Notes

- **CSP** is set to `null` in `tauri.conf.json` during the development phase — do not ship to production without a proper Content Security Policy.
- The frontend runs on `http://localhost:1420` in dev mode.
- Tauri devtools are available in dev builds via right-click → Inspect.

---

## Project Structure

```
WinOptimizerRevamp/
├── src/                          # React frontend
│   ├── pages/                    # 21 page components
│   ├── components/
│   │   ├── layout/               # MainLayout, Sidebar
│   │   ├── ui/                   # shadcn/ui generated components
│   │   ├── AI/                   # AI Assistant chat UI
│   │   └── ...                   # Shared components
│   ├── hooks/                    # 20+ custom React hooks
│   ├── data/                     # tweaks.json, apps.json, app_metadata.json
│   ├── __tests__/                # 417 Vitest tests
│   │   ├── hooks/                # Hook unit tests
│   │   ├── pages/                # Page integration tests
│   │   ├── components/           # Component tests
│   │   └── utils/                # Utility tests
│   └── test/                     # Test setup, utilities, mocks
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri app setup, command registration
│   │   ├── system.rs             # SystemVitals, GPU info (WMI)
│   │   ├── tweaks.rs             # Apply/revert registry tweaks
│   │   ├── gaming.rs             # Game detection, GPU metrics, overlay
│   │   ├── wsl.rs                # WSL lifecycle management
│   │   ├── gpu_driver.rs         # Driver uninstall, safe-mode schedule
│   │   ├── latency.rs            # Timer resolution, standby flush, bcdedit
│   │   ├── storage.rs            # SMART health, TRIM, scheduled tasks
│   │   ├── network.rs            # Interface info, ping, DNS tweaks
│   │   ├── power.rs              # Power plans, battery health, settings
│   │   ├── privacy.rs            # Telemetry/registry/service audit
│   │   ├── drivers.rs            # PnP driver list, unsigned detection
│   │   ├── backup.rs             # Export/import .winopt backup files
│   │   ├── report.rs             # HTML system report generation
│   │   ├── scheduler.rs          # Windows Task Scheduler integration
│   │   ├── db.rs                 # SQLite audit log + AES-256-GCM encryption
│   │   ├── security.rs           # Defender, firewall, security settings
│   │   ├── startup.rs            # Startup item management
│   │   ├── process.rs            # Process list, kill, priority
│   │   ├── ai.rs                 # Ollama LLM integration
│   │   └── apps.rs               # Winget/choco app management
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── public/                       # Static assets
├── index.html                    # Tauri entry point
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── components.json               # shadcn/ui config
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide, including dev setup, how to add tweaks and pages, Rust command patterns, and PR process.

---

## Acknowledgements

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for a full list of open-source projects and resources that made WinOpt Pro possible.

Key dependencies include:

- [Tauri](https://tauri.app) — Desktop runtime
- [React](https://react.dev) — UI framework
- [shadcn/ui](https://ui.shadcn.com) — Component primitives
- [Tailwind CSS](https://tailwindcss.com) — Utility-first styling
- [framer-motion](https://www.framer.com/motion/) — Animations
- [lucide-react](https://lucide.dev) — Icon set
- [Zustand](https://zustand-demo.pmnd.rs) — State management
- [windows-rs](https://github.com/microsoft/windows-rs) — Windows API bindings
- [sysinfo](https://github.com/GuillaumeGomez/sysinfo) — Cross-platform system info
- [aes-gcm](https://github.com/RustCrypto/AEADs) — Authenticated encryption
- [Vitest](https://vitest.dev) — Test framework
- [Ollama](https://ollama.ai) — Local LLM runtime

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 WinOpt Pro Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<div align="center">

Built with Tauri 2 + React 19 + Rust — Windows 10/11 only

</div>
