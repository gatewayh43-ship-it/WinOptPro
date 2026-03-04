# Acknowledgements

WinOpt Pro is built on the shoulders of a remarkable ecosystem of open-source projects, communities, and individuals. This document lists the key projects, resources, and inspirations that made WinOpt Pro possible.

---

## Core Technologies

### Desktop Runtime
- **[Tauri](https://tauri.app)** (Apache 2.0 / MIT) — The Rust-powered framework that makes WinOpt Pro a native Windows app with a small binary footprint. Without Tauri, this project would either be an Electron app (100MB+) or require writing a full native UI stack from scratch.

### Frontend
- **[React](https://react.dev)** (MIT) — UI framework. We use React 19's concurrent features and hooks extensively throughout the application.
- **[TypeScript](https://www.typescriptlang.org)** (Apache 2.0) — Type safety across the entire frontend codebase.
- **[Vite](https://vitejs.dev)** (MIT) — Frontend build tooling. The Tauri + Vite integration gives hot-module reload in milliseconds.
- **[Tailwind CSS 4](https://tailwindcss.com)** (MIT) — Utility-first CSS. We use the new `@tailwindcss/vite` plugin with CSS-native config (no `tailwind.config.js`).
- **[shadcn/ui](https://ui.shadcn.com)** (MIT) — Copy-owned UI component primitives built on Radix UI. The approach of owning your components (rather than a dependency) is exactly right for a long-lived desktop app.
- **[Radix UI](https://www.radix-ui.com)** (MIT) — Accessible, unstyled component primitives underlying shadcn/ui.
- **[framer-motion](https://www.framer.com/motion/)** (MIT) — Declarative, accessible animation library. Used throughout the UI for page transitions, collapsible sections, and micro-interactions.
- **[lucide-react](https://lucide.dev)** (ISC) — The icon set used throughout WinOpt Pro. Clean, consistent, and tree-shakable.
- **[Zustand](https://zustand-demo.pmnd.rs)** (MIT) — Minimal state management. Used for the global cache (`useGlobalCache`), app store, and cross-component state without the boilerplate of Redux or Context.

### Rust Backend
- **[Rust](https://www.rust-lang.org)** (MIT / Apache 2.0) — The backend language. Rust's memory safety guarantees and Windows API access made it the right choice for a system-level tool.
- **[windows-rs](https://github.com/microsoft/windows-rs)** (MIT / Apache 2.0) — Microsoft's first-party Rust bindings for the Windows API. Used for WMI queries, registry access, NT system calls (NtQueryTimerResolution, NtSetSystemInformation), and more.
- **[sysinfo](https://github.com/GuillaumeGomez/sysinfo)** (MIT) — Cross-platform system information library. Used for real-time CPU, memory, disk, and process data.
- **[rusqlite](https://github.com/rusqlite/rusqlite)** (MIT) — SQLite bindings for Rust. Powers the encrypted audit log.
- **[aes-gcm](https://github.com/RustCrypto/AEADs)** (MIT / Apache 2.0) — RustCrypto's AES-256-GCM authenticated encryption implementation. Used for field-level encryption of sensitive audit log entries.
- **[sha2](https://github.com/RustCrypto/hashes)** (MIT / Apache 2.0) — SHA-256 implementation from RustCrypto. Used to derive the encryption key from the machine GUID.
- **[base64](https://github.com/marshallpierce/rust-base64)** (MIT / Apache 2.0) — Used for encoding/decoding encrypted field values in the audit database.
- **[serde](https://serde.rs)** (MIT / Apache 2.0) — Rust's serialization/deserialization framework. Used everywhere JSON is exchanged between Rust and the frontend.
- **[tokio](https://tokio.rs)** (MIT) — Async runtime for Rust. Used by Tauri internally and for async command handling.
- **[tauri-plugin-shell](https://github.com/tauri-apps/plugins-workspace)** (MIT / Apache 2.0) — Tauri plugin for running shell commands from the Rust backend.

### Testing
- **[Vitest](https://vitest.dev)** (MIT) — Vite-native test framework. Fast, ESM-compatible, and deeply integrated with our build setup.
- **[Testing Library](https://testing-library.com)** (MIT) — `@testing-library/react` and `@testing-library/user-event` for accessible, user-centric component testing.
- **[jsdom](https://github.com/jsdom/jsdom)** (MIT) — Browser environment simulation for Vitest.

---

## Inspiration

WinOpt Pro draws conceptual inspiration from a number of excellent tools in the Windows optimization space. We haven't copied their code, but their work informed our understanding of what Windows power users actually need:

- **[Chris Titus Tech Windows Toolbox (winutil)](https://github.com/ChrisTitusTech/winutil)** — The gold standard of community-driven Windows optimization scripts. CTT's approach to curating tweaks and making them accessible inspired our tweak JSON schema design.
- **[Sophia Script](https://github.com/farag2/Sophia-Script-for-Windows)** — An exceptional, well-documented PowerShell optimization script. Sophia's extensive comments and explanations of *why* each tweak exists directly influenced our educational context system (the `howItWorks`, `pros`, `cons`, `expertDetails` fields in tweaks.json).
- **[Privacy.sexy](https://privacy.sexy)** — An open-source tool for privacy-focused Windows tweaks. Demonstrated the value of transparency: showing users the exact commands being run before applying them.
- **[DisplayDriverUninstaller (DDU)](https://www.wagnardsoft.com/content/display-driver-uninstaller-ddu)** — The original GPU driver cleaner. Our GPU Driver Cleaner module is inspired by DDU's approach (pnputil + safe mode), reimplemented as an integrated Tauri command rather than a standalone executable.
- **[Process Lasso](https://bitsum.com/processlasso/)** — Inspired the standby RAM flush feature in the Latency Optimizer.

---

## Knowledge Resources

The following documentation, books, and blogs were invaluable for understanding the Windows internals necessary to build a system optimizer:

- **[Microsoft Windows Documentation](https://learn.microsoft.com/en-us/windows/)** — The authoritative reference for every Windows API, registry key, and PowerShell cmdlet used in this project.
- **[The Old New Thing](https://devblogs.microsoft.com/oldnewthing/)** by Raymond Chen — Decades of deep Windows internals knowledge. Essential reading for understanding *why* Windows behaves the way it does.
- **Windows Internals, 7th Edition** by Pavel Yosifovich, Mark Russinovich, et al. — The definitive book on Windows kernel architecture. Referenced heavily for the memory, scheduling, and security sections.
- **[Windows Sysinternals](https://learn.microsoft.com/en-us/sysinternals/)** — Mark Russinovich's suite of tools and documentation gave us insight into process priorities, standby memory management, and driver internals.
- **[WinAero Blog](https://winaero.com)** — Practical registry tweak documentation with real-world testing results.
- **[Battle(non)sense](https://www.youtube.com/c/BattleNonSense)** — Chris Rossett's in-depth network latency and gaming optimization research informed the network tweak selection.

---

## Tools Used in Development

- **[Visual Studio Code](https://code.visualstudio.com)** (MIT) — Primary editor.
- **[rust-analyzer](https://rust-analyzer.github.io)** (MIT / Apache 2.0) — Rust language server for VS Code.
- **[Tauri VS Code Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)** — Tauri-specific tooling.
- **[Git](https://git-scm.com)** (GPL v2) — Version control.
- **[Node.js](https://nodejs.org)** (MIT) — JavaScript runtime for the build toolchain.

---

## Community

Thank you to the communities whose collective knowledge makes projects like this possible:

- The **Windows power user community** on Reddit (r/Windows10, r/Windows11, r/pcgaming) for documenting real-world effects of system tweaks.
- The **Rust community** (r/rust, the Rust Discord, users.rust-lang.org) for approachable help with Windows-specific Rust challenges.
- The **Tauri Discord** for responsive support on Tauri 2 migration and Windows-specific issues.
- The **React community** for the ecosystem of hooks, patterns, and testing utilities that made the frontend possible.

---

## License Notes

WinOpt Pro is licensed under the **MIT License**.

All direct dependencies listed above are licensed under permissive open-source licenses (MIT, Apache 2.0, ISC). No GPL-licensed code is included in the distributed binary.

| Component | License |
|---|---|
| Tauri | MIT / Apache 2.0 |
| React | MIT |
| TypeScript | Apache 2.0 |
| Vite | MIT |
| Tailwind CSS | MIT |
| shadcn/ui | MIT |
| framer-motion | MIT |
| lucide-react | ISC |
| Zustand | MIT |
| Rust standard library | MIT / Apache 2.0 |
| windows-rs | MIT / Apache 2.0 |
| sysinfo | MIT |
| rusqlite | MIT |
| aes-gcm | MIT / Apache 2.0 |
| sha2 | MIT / Apache 2.0 |
| serde | MIT / Apache 2.0 |
| Vitest | MIT |
| Testing Library | MIT |

---

*If we've used your work and haven't listed it here, that's an oversight — please open an issue and we'll add it.*
