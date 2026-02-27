# WinOpt Pro — Implementation Plan

> **Living document.** Last updated: 2026-02-25.
> Stack: Tauri 2 (Rust) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · shadcn/ui
> Repo: <https://github.com/gatewayh43-ship-it/WinOptPro>

---

## Document Status

| Section | Status | Owner | Last Updated |
| :------- | :------- | :------- | :------- |
| Vision & Goals | ✅ Stable | Product | 2026-02-25 |
| User Stories | ✅ Elaborated | Product | 2026-02-25 |
| Functional Requirements | ✅ Elaborated | Product | 2026-02-25 |
| Acceptance Criteria | ✅ Comprehensive | QA | 2026-02-25 |
| Testing Strategy | ✅ Defined | QA | 2026-02-25 |
| Architecture | ✅ Stable | Engineering | 2026-02-25 |
| Data Models | ✅ Stable | Engineering | 2026-02-25 |
| IPC Command Interface | ✅ Stable | Engineering | 2026-02-25 |
| Module Roadmap | 🔄 In progress (Ph1-2 done) | Engineering | 2026-02-27 |
| Phased Delivery | 🔄 In progress (Ph1-2 done) | Engineering | 2026-02-27 |
| Risk Register | ✅ Stable | Engineering | 2026-02-25 |

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Personas & User Stories](#2-personas--user-stories)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Comprehensive Acceptance Criteria](#5-comprehensive-acceptance-criteria)
6. [Testing Strategy](#6-testing-strategy)
7. [Architecture](#7-architecture)
8. [Data Models](#8-data-models)
9. [IPC Command Interface](#9-ipc-command-interface)
10. [Module Breakdown & Feature Roadmap](#10-module-breakdown--feature-roadmap)
11. [Phased Delivery Plan](#11-phased-delivery-plan)
12. [File-Level Change Map](#12-file-level-change-map)
13. [Risk Register](#13-risk-register)

---

## 1. Vision & Goals

WinOpt Pro is the **all-in-one Windows 10/11 optimization platform** for power users, gamers, and privacy-conscious users. It replaces a fragmented ecosystem of tools (CCleaner, Razer Cortex, MSI Afterburner, Process Hacker) with a single beautiful, safe, and fully reversible tool.

**Core principles:**

- **Safe first** — every change is reversible; no silent failures; no destructive operations without confirmation
- **Educated decisions** — explain what each change does before it happens; show the exact code that will run
- **Real data only** — no hardcoded metrics; everything sourced from live WMI/WinAPI queries
- **Privacy-preserving** — zero telemetry from WinOpt itself; all data stays local; audit log encrypted at rest
- **Beginner-safe, expert-capable** — safe defaults with progressive disclosure for advanced users

---

## 2. Personas & User Stories

### Persona A — Power User / Tech Enthusiast

> Deep Windows knowledge; seeks maximum performance control and full transparency into system changes.

| ID | User Story | Priority | Status |
| :--- | :--- | :--- | :--- |
| US-A1 | As a power user, I want to review detailed technical docs (how it works, pros/cons, exact PowerShell commands) for each tweak before applying so I can make an informed decision. | P0 | ✅ Done (Inspector sidebar) |
| US-A2 | As a power user, I want to execute multiple tweaks in a single batch deploy with a per-item progress tracker so I can apply comprehensive optimizations efficiently. | P0 | ✅ Done |
| US-A3 | As a power user, I want to revert any applied tweak with one click, with a confirmation showing the exact revert command so I can undo safely. | P0 | ✅ Done |
| US-A4 | As a power user, I want a full history timeline of all applied and reverted tweaks with timestamps and before/after system vitals so I can measure optimization impact. | P1 | ✅ Done (HistoryPage) |
| US-A5 | As a power user, I want to export my complete tweak profile as a `.winopt` file so I can replicate the setup on another machine instantly. | P1 | 🔲 Not started |
| US-A6 | As a power user, I want an Expert Mode toggle that unlocks Red-level tweaks with clear warnings, so I can push system limits when I know what I'm doing. | P2 | ✅ Done (SettingsPage) |
| US-A7 | As a power user, I want to search all tweaks via Command Palette and see results grouped by category so I can find any optimization instantly. | P0 | ✅ Done |
| US-A8 | As a power user, I want the Inspector panel to appear as a bottom drawer on small windows so I can use the app regardless of window size. | P0 | ✅ Done |

### Persona B — Gaming Enthusiast

> Focuses on FPS, latency, and frame time consistency. Sessions are time-critical; optimizations must be instant.

| ID | User Story | Priority | Status |
| :--- | :--- | :--- | :--- |
| US-B1 | As a gamer, I want to apply all gaming tweaks (core parking, game priority, FSO, DVR, responsiveness) with a single "Gaming Mode" preset button. | P0 | ✅ Done (ProfilesPage) |
| US-B2 | As a gamer, I want real-time FPS, frame time, CPU%, and GPU% in a transparent in-game overlay so I can monitor performance without alt-tabbing. | P1 | 🔲 Not started |
| US-B3 | As a gamer, I want WinOpt to automatically detect when I launch a game and apply gaming optimizations without me having to open the app. | P1 | 🔲 Not started |
| US-B4 | As a gamer, I want to adjust GPU core clock, memory clock, and power limit with sliders so I can overclock without third-party tools. | P2 | 🔲 Not started |
| US-B5 | As a gamer, I want to see the before/after performance improvement after applying gaming tweaks so I can validate the gains. | P1 | 🔲 Not started |

### Persona C — Privacy-Conscious User

> Concerned about Windows telemetry, tracking, and Microsoft data collection.

| ID | User Story | Priority | Status |
| :--- | :--- | :--- | :--- |
| US-C1 | As a privacy user, I want a one-click Privacy Audit that scans all telemetry settings, tracking services, and firewall rules, and shows me the results as a categorized report. | P0 | 🔲 Not started |
| US-C2 | As a privacy user, I want a Privacy Score from 0 to 100 so I can understand my current exposure level at a glance. | P0 | 🔲 Not started |
| US-C3 | As a privacy user, I want to apply all privacy tweaks with a single "Harden Privacy" action after reviewing a full preview of every change. | P0 | ✅ Done (ProfilesPage) |
| US-C4 | As a privacy user, I want an encrypted, local audit log of every system change made by WinOpt so I have a verifiable compliance record. | P1 | 🔲 Not started |
| US-C5 | As a privacy user, I want to click the alert banner on the Dashboard to navigate directly to the Privacy page so I can act on warnings immediately. | P0 | ✅ Done |

### Persona D — IT Professional / SysAdmin

> Managing multiple machines; needs reproducibility, batch scripting, and compliance documentation.

| ID | User Story | Priority | Status |
| :--- | :--- | :--- | :--- |
| US-D1 | As an IT pro, I want to generate a comprehensive system report (hardware, drivers, running services, Windows build, installed software) as a PDF so I can share it with stakeholders. | P1 | 🔲 Not started |
| US-D2 | As an IT pro, I want to compare my system against CIS Benchmarks or Microsoft Security Baseline and see a compliance percentage with remediation steps. | P2 | 🔲 Not started |
| US-D3 | As an IT pro, I want to schedule automated maintenance tasks (disk cleanup, temp removal) at off-peak hours so systems stay clean without manual work. | P2 | 🔲 Not started |
| US-D4 | As an IT pro, I want to export all WinOpt settings, profiles, and history as an encrypted backup file so I can restore on a new machine or share with a team. | P2 | 🔲 Not started |
| US-D5 | As an IT pro, I want to see every tweak's exact PowerShell code in the Inspector so I can verify and understand every system change before it runs. | P0 | ✅ Done (Inspector sidebar) |

### Persona E — Casual User

> Wants a meaningful speed boost without understanding the technical details.

| ID | User Story | Priority | Status |
| :--- | :--- | :--- | :--- |
| US-E1 | As a casual user, I want a "Quick Scan" button that automatically identifies and selects all safe (Green-level) tweaks so I can optimize with one click and no risk. | P0 | ✅ Done (Dashboard) |
| US-E2 | As a casual user, I want the onboarding guide to appear only on my first launch and explain the three key features in simple language. | P0 | ✅ Done |
| US-E3 | As a casual user, I want filter chips so I can see only Green (safe) tweaks and ignore Yellow and Red ones. | P0 | ✅ Done |
| US-E4 | As a casual user, I want a floating summary bar to show me how many tweaks I've selected and let me deploy with one button even when scrolled down. | P0 | ✅ Done |
| US-E5 | As a casual user, I want empty pages to show a clear "under development" message with an icon so I'm not confused by blank screens. | P0 | ✅ Done |

---

## 3. Functional Requirements

> **Status key:** ✅ Done · 🔲 Not started · 🔄 In progress · ❌ Blocked

### FR-01: System Information Retrieval

- **Status:** ✅ Done (system.rs → useSystemVitals → Dashboard)
- Real-time collection every 3s (configurable): CPU temp, usage %, clock speed; RAM used/total; Drive temp + SMART status; Network latency, adapter link speed; uptime; OS version; admin status
- Source: WMI via Rust Tauri commands (`get_system_vitals`)
- Graceful degradation: if WMI query fails, show "Unavailable" badge — never crash
- System Health Score must be computed from live data, not hardcoded

### FR-02: Tweak Execution with Elevation

- **Status:** ✅ Done (tweaks.rs + security.rs → useTweakExecution → TweaksPage)
- Execute any `execution.code` PowerShell command from `tweaks.json` via Rust backend
- Before execution: check admin rights; surface UAC prompt if missing
- Show confirmation modal with exact command, estimated time, and risk level
- Return stdout + stderr + exit code to frontend within 30s timeout
- On timeout: surface error, offer retry or cancel

### FR-03: Tweak State Validation on Load

- **Status:** ✅ Done (validateTweak on category mount with 5s timeout)
- On page load, run `validationCmd` for every tweak in the active category
- Render toggle as: ON (green) if validation passes, OFF (grey) if not, UNKNOWN (amber) if cmd empty or query fails
- Validation must complete within 5 seconds; show skeleton loading state while in progress
- Re-validate after each apply/revert to keep UI in sync

### FR-04: Tweak Revert / Undo

- **Status:** ✅ Done (revertTweak + confirmation modal in TweaksPage)
- Toggle already-applied tweaks shows confirmation with exact `revertCode`
- Execute `revertCode` via Rust backend with same elevation logic as apply
- Maintain undo stack of last 50 operations; persist to SQLite
- "Revert to timestamp" mode: reverse all tweaks applied after a given point

### FR-05: Tweak History & Audit Log

- **Status:** ✅ Done (db.rs SQLite + HistoryPage with timeline)
- SQLite table `tweak_history`: id, tweak_id, tweak_name, action, timestamp, duration_ms, command_executed, stdout, stderr, exit_code, status
- Query via `get_tweak_history(limit, since_timestamp)` Tauri command
- Display as timeline widget in Dashboard; full page in History route
- Retention: auto-prune entries older than 365 days (configurable)

### FR-06: Batch Deploy with Progress & Rollback

- **Status:** ✅ Done (ProgressModal with Skip & Continue / Rollback All)
- Preview modal: list all N tweaks, risk summary, estimated total time
- Execution: sequential, with per-item status (pending → running → success/failed)
- On any failure: pause, show error, offer "Continue (skip)" or "Rollback All"
- Rollback: execute all revertCodes in reverse order

### FR-07: Global State Persistence

- **Status:** ✅ Done (Zustand appStore.ts + persist → localStorage)
- Applied tweaks survive app restart (persisted via Zustand + localStorage)
- Selected-but-not-deployed tweaks survive page navigation (Zustand in-memory)
- User settings (theme, expertMode, autoRefresh interval) persisted in localStorage
- Tweak history persisted in SQLite

### FR-08: Expert Mode

- **Status:** ✅ Done (SettingsPage toggle + TweaksPage gate + warning modal)
- Off by default; toggle in Settings with warning confirmation
- When off: tweaks with `requiresExpertMode: true` hidden; categories show banner counting hidden tweaks
- When on: Red tweaks visible with red border + "EXPERT" badge

### FR-09: Onboarding (first run)

- **Status:** ✅ Done
- Shows only when `localStorage["onboardingComplete"]` is absent
- 3 steps with mini-app visual mockups (not placeholder shapes)
- "Get Started" on step 3 sets flag and closes modal
- Step dots are clickable for non-linear navigation
- "Interactive Guide" button on Dashboard re-opens without clearing flag

### FR-10: Command Palette

- **Status:** ✅ Done
- Ctrl+K global shortcut; ESC to close; arrow keys to navigate; Enter to select
- Semantic synonym matching (lag → network, fps → gaming, tracking → privacy)
- Results grouped by category with section headers
- Extend: add page-navigation actions (e.g. type "gaming" → navigate to gaming)
- Extend: add "Apply all safe tweaks in [category]" quick actions

### FR-11: Optimization Profiles

- **Status:** ✅ Done (6 built-in presets in ProfilesPage; export/import not yet)
- Built-in read-only presets: Gaming, Productivity, Privacy, Balanced, Battery Saver
- User can create/rename/delete/duplicate profiles (stored in SQLite)
- Apply profile: batch deploy all tweaks in profile
- Export as `.winopt` JSON; import from file

### FR-12: Quick Scan (Dashboard CTA)

- **Status:** ✅ Done (Dashboard Quick Scan button → batch deploy green tweaks)
- Wire "Quick Scan" button on Dashboard hero
- Identify all Green-level tweaks not yet applied across all categories
- Open preview modal listing candidates, then batch deploy on confirm

### FR-13: Risk Filter Chips

- **Status:** ✅ Done
- Filter buttons All / Green / Yellow / Red with counts
- Empty filter state shows "No [risk] tweaks" + clear filter link

### FR-14: Floating Batch Selection Bar

- **Status:** ✅ Done
- Appears when ≥1 tweak selected; spring-animated in/out
- Shows count + risk breakdown (e.g. "2 Green · 1 Yellow")
- Clear button deselects all; Deploy button triggers batch flow
- Adds `pb-24` to scroll container so bar never covers content

### FR-15: Mobile Inspector Drawer

- **Status:** ✅ Done
- Triggered on tweak click when viewport width < 1024px
- Slides up from bottom (spring physics); backdrop click closes
- Drag handle visual; scrollable content; X close button

### FR-16: Startup Optimizer

- **Status:** ✅ Done (startup.rs + StartupPage with toggle/search)
- Enumerate: `HKLM\SOFTWARE\...\Run`, `HKCU\SOFTWARE\...\Run`, Startup folder, auto-start Services, enabled Scheduled Tasks
- Per-item: name, path, type, estimated startup impact (ms)
- Toggle disable/enable without deletion; changes recorded in history

### FR-17: Disk Cleanup & Health

- **Status:** ✅ Done (storage.rs + StoragePage with scan/cleanup/SMART)
- Scan: %TEMP%, %LocalAppData%\Temp, Recycle Bin, browser caches, Windows Update cache, thumbnail cache
- Preview: count + total size before commit
- Delete via Windows Shell `SHFileOperation` (sends to Recycle Bin, recoverable)
- SMART: health status, temperature, reallocated sector count, remaining life %

### FR-18: Process Manager

- **Status:** ✅ Done (process.rs + ProcessPage with sort/kill/priority/game detect)
- List all processes: PID, name, CPU%, RAM MB, Disk I/O, Network kB/s, icon
- Sort by any column; real-time update every 1s
- Right-click: set priority (Realtime/High/Normal/Low/Idle), terminate, open file location
- Search/filter by name; highlight game processes

### FR-19: Network Analyzer & Optimizer

- **Status:** ✅ Done (network.rs + NetworkAnalyzerPage with ping/jitter/baseline)
- Per-adapter: IP, MAC, link speed, latency to 8.8.8.8 and 1.1.1.1, sent/received bytes
- Diagnostic: run ping test (100 packets), compute variance, jitter, loss %
- Before/after comparison panel after applying Network tweaks
- Per-process network usage (top 10 by bytes)

### FR-20: Privacy & Security Audit

- **Status:** 🔲 Not started (Privacy Score + audit scan not yet implemented)
- Scan telemetry registry keys, DiagTrack/dmwappushservice services, firewall outbound rules
- Privacy Score: 0–100 computed from weighted issue severity
- Categorized issue list: Telemetry, Services, Registry, Network
- "Harden Privacy" batch-applies all relevant Privacy tweaks with full preview

### FR-21: Power Plan Manager

- **Status:** 🔲 Not started
- List all power plans via `powercfg /list`; show active plan
- Edit per-plan: CPU min/max %, display timeout, sleep timeout, USB suspend
- One-click switch; auto-switch on AC/battery event
- Battery health report: health %, cycle count, design vs current capacity

### FR-22: Gaming Optimizer (expanded)

- **Status:** 🔲 Not started (tweaks page done)
- Auto-detect game launches via process creation events; apply Gaming profile automatically
- Show in-game overlay: FPS, frame time ms, CPU%, GPU%, network ping; toggle F12
- GPU info: current clocks, temp, VRAM usage (NVIDIA + AMD)

### FR-23: Driver Manager

- **Status:** 🔲 Not started
- Enumerate installed drivers via WMI `Win32_PnPDevice`; show installed version
- Backup driver before any update via `Export-WindowsDriver`
- Install update via `pnputil.exe /add-driver`; rollback to backup

---

## 4. Non-Functional Requirements

| ID | Requirement | Target | Test Method |
| :--- | :--- | :--- | :--- |
| NFR-01 | App cold start time | < 2s | Playwright `startTime` measurement |
| NFR-02 | Page navigation (with animations) | < 350ms | Vitest timer mock |
| NFR-03 | Dashboard vitals refresh latency | ≤ 500ms end-to-end | Integration test with mock Tauri |
| NFR-04 | Time-to-first-byte of tweak progress feedback | < 150ms from click | Playwright interaction timing |
| NFR-05 | PowerShell command timeout | 30s hard limit | Rust unit test |
| NFR-06 | Window minimum size | 960×640px | Playwright viewport test |
| NFR-07 | Accessibility | WCAG 2.1 AA | axe-core + manual audit |
| NFR-08 | Security: CSP | Proper non-null policy | Playwright network intercept |
| NFR-09 | Security: PowerShell command validation | Reject unknown cmdlets | Rust unit test on validator |
| NFR-10 | Security: elevation | UAC prompt on every admin op | Integration test |
| NFR-11 | Privacy | Zero external network requests by WinOpt itself | Playwright network monitor |
| NFR-12 | OS compatibility | Windows 10 21H2+ and all Windows 11 builds | Manual + CI matrix |
| NFR-13 | Error resilience | No blank-screen crash; error boundary on every page | Vitest error boundary tests |
| NFR-14 | Bundle size | JS < 500KB gzipped | Vite build output check |
| NFR-15 | Test coverage | ≥ 80% line coverage on src/ | Vitest coverage report |

---

## 5. Comprehensive Acceptance Criteria

> All written in Gherkin (Given / When / Then). Each criterion maps to ≥1 automated test.

---

### AC-01: Onboarding — First Run Only

```gherkin
Feature: First-time user onboarding

  Background:
    Given the app is installed fresh with no localStorage data

  Scenario: Modal appears automatically on first launch
    When the app loads
    Then the OnboardingModal is visible
    And the first step "Real-time Telemetry Dashboard" is shown
    And the step counter reads "1 / 3"
    And the step dot indicator shows the first dot as active

  Scenario: Navigate steps forward
    Given the OnboardingModal is open on step 1
    When I click "Next"
    Then step 2 "Granular OS Tuning" is shown
    And the step counter reads "2 / 3"
    When I click "Next"
    Then step 3 "Contextual Education" is shown
    And the button label changes to "Get Started"

  Scenario: Complete onboarding sets persistence flag
    Given the OnboardingModal is open on step 3
    When I click "Get Started"
    Then localStorage["onboardingComplete"] equals "true"
    And the modal is no longer visible

  Scenario: Modal does not appear on subsequent launches
    Given localStorage["onboardingComplete"] is "true"
    When the app loads
    Then the OnboardingModal is NOT rendered in the DOM

  Scenario: Manual re-trigger via Interactive Guide
    Given localStorage["onboardingComplete"] is "true"
    And I am on the Dashboard
    When I click "Interactive Guide"
    Then the OnboardingModal appears
    When I click "Get Started" on step 3
    Then localStorage["onboardingComplete"] is still "true"

  Scenario: Click step dots to jump to any step
    Given the OnboardingModal is open on step 1
    When I click the third step dot
    Then step 3 is shown immediately

  Scenario: Click backdrop closes modal without setting flag
    Given the OnboardingModal is open
    And localStorage["onboardingComplete"] is absent
    When I click the backdrop overlay
    Then the modal closes
    And localStorage["onboardingComplete"] is still absent
    And on next app load the modal reappears
```

---

### AC-02: Risk Filter Chips

```gherkin
Feature: Tweak list risk level filtering

  Background:
    Given I am on the Gaming Tuning page
    And there are 4 Gaming tweaks (2 Green, 1 Yellow, 1 Red via expert mode)
    And Expert Mode is disabled

  Scenario: Default state shows all tweaks
    Then the "All" chip is active
    And all visible tweaks are displayed (3 — Red hidden by expert mode)
    And each chip shows its count: All(3), Green(2), Yellow(1)

  Scenario: Filter to Green only
    When I click the "Green" chip
    Then only Green-level tweaks are visible
    And the Green chip shows active styling
    And no Yellow or Red tweaks are shown

  Scenario: Active filter shows count badge
    Given I click "Yellow"
    Then 1 tweak is visible
    And the filter count shows "(1)"

  Scenario: Filter with zero results shows empty state
    Given Expert Mode is disabled
    When I click "Red"
    Then the tweak list is empty
    And the text "No red tweaks" is visible
    And a "Clear filter" link is visible

  Scenario: Clear filter from empty state
    Given the "Red" filter is active and list is empty
    When I click "Clear filter"
    Then the "All" chip becomes active
    And all tweaks are visible again

  Scenario: Filter persists when scrolling
    Given the "Green" filter is active
    When I scroll to the bottom of the tweak list
    Then only Green tweaks are still visible
```

---

### AC-03: Floating Batch Selection Bar

```gherkin
Feature: Persistent batch selection summary bar

  Scenario: Bar hidden when no tweaks selected
    Given I am on a TweaksPage
    And no tweaks are selected
    Then the floating batch bar is NOT in the DOM

  Scenario: Bar appears when first tweak is toggled
    When I toggle ON the first tweak
    Then the floating bar animates into view from the bottom
    And it shows "1 tweak ready"
    And the risk breakdown shows "1 Green" (or appropriate risk)

  Scenario: Bar updates count dynamically
    Given 1 tweak is selected
    When I toggle ON a second tweak of different risk level
    Then the bar shows "2 tweaks ready"
    And both risk levels appear in the breakdown

  Scenario: Clear button deselects all
    Given 3 tweaks are selected
    When I click "Clear" in the floating bar
    Then all toggles return to OFF state
    And the floating bar animates out

  Scenario: Bar visible when scrolled past Deploy button
    Given 2 tweaks are selected
    When I scroll to the bottom of a long tweak list
    Then the floating bar is still visible
    And the Deploy button in the header is NOT visible
    And I can click Deploy from the floating bar

  Scenario: Tweak list has bottom padding when bar is visible
    Given 1 tweak is selected
    Then the tweak list container has padding-bottom of at least 96px
    So the bar does not obscure the last list item
```

---

### AC-04: Mobile Inspector Drawer

```gherkin
Feature: Inspector panel accessible at all viewport widths

  Scenario: Desktop — inspector renders in sidebar
    Given the viewport is 1280px wide
    When I click on any tweak card
    Then the right-side inspector sidebar updates with tweak details
    And the "Mechanical Summary" section is visible in the sidebar
    And NO bottom drawer is rendered in the DOM

  Scenario: Mobile — inspector renders as bottom drawer
    Given the viewport is 768px wide
    When I click on a tweak card
    Then a bottom drawer slides up from the bottom of the screen
    And it contains the tweak name in the header
    And it contains "Mechanical Summary", "Performance Gain", "System Trade-offs", and "Payload Injection" sections
    And the desktop inspector sidebar is hidden (display: none or not mounted)

  Scenario: Drawer closes via backdrop tap
    Given the mobile inspector drawer is open
    When I tap/click the backdrop overlay
    Then the drawer slides back down
    And the backdrop is removed from the DOM

  Scenario: Drawer closes via X button
    Given the mobile inspector drawer is open
    When I click the X close button
    Then the drawer closes

  Scenario: Drawer switches content when different tweak clicked
    Given the drawer is open showing Tweak A
    When I close the drawer and click Tweak B
    Then the drawer reopens with Tweak B's content

  Scenario: Drawer is scrollable for long content
    Given the mobile inspector drawer is open
    And the PowerShell code block causes the content to exceed viewport height
    Then the drawer content is scrollable
    And the header remains fixed at the top
```

---

### AC-05: Command Palette Category Grouping

```gherkin
Feature: Command palette search with category grouping

  Scenario: Empty query shows no results prompt
    Given the Command Palette is open
    And the search input is empty
    Then no result groups are shown
    And the placeholder text is visible

  Scenario: Specific query returns grouped results
    Given the Command Palette is open
    When I type "disable"
    Then results are grouped by category (e.g., "Performance", "Gaming")
    And each group has a section header with the category name and icon
    And results within each group are specific to that category

  Scenario: Semantic synonym matching
    Given the Command Palette is open
    When I type "lag"
    Then Network tweaks appear (Nagle's Algorithm, Network Throttling)
    When I clear and type "fps"
    Then Gaming tweaks appear
    When I clear and type "spyware"
    Then Privacy tweaks appear

  Scenario: Keyboard navigation crosses category groups
    Given results include 2 Performance tweaks and 1 Gaming tweak
    When I press ArrowDown 3 times
    Then the 3rd item (in Gaming group) is highlighted
    And pressing Enter selects it and closes the palette

  Scenario: No results state
    When I type "xyznotfound123"
    Then a "No optimizations found" message is shown
    And the hint text suggests example searches

  Scenario: Selected item navigates to correct page
    Given I search for "Disable SysMain"
    And I press Enter to select it
    Then the palette closes
    And the Performance Tuning page is active
    And the "Disable SysMain" tweak is visually highlighted
```

---

### AC-06: Color Scheme Picker

```gherkin
Feature: Multi-option color scheme selection

  Scenario: Default scheme applied on first load
    Given localStorage has no color scheme preference
    When the app loads
    Then the "default" (violet) color scheme is active

  Scenario: Picker popover opens on click
    When I click the color circle button in the sidebar footer
    Then a popover appears above the button
    And it shows 5 colored circles: violet, teal, rose, amber, emerald
    And the currently active scheme circle has a ring highlight

  Scenario: Selecting a scheme applies immediately
    When I click the "rose" circle
    Then the popover closes
    And the app's --primary CSS variable changes to #f43f5e
    And sidebar active indicators, toggle colors, and gradient text update
    And localStorage["vite-ui-color"] equals "rose"

  Scenario: Scheme persists across reloads
    Given I selected the "amber" scheme
    When I reload the app
    Then the amber color scheme is still active

  Scenario: Popover closes when clicking outside
    Given the color picker popover is open
    When I click anywhere outside the popover
    Then the popover closes without changing the scheme
```

---

### AC-07: Alert Banner Navigation

```gherkin
Feature: Dashboard alert banner navigates to Privacy page

  Scenario: Clicking banner navigates to Privacy
    Given I am on the Dashboard
    And the "Privacy Intervention Recommended" banner is visible
    When I click the banner
    Then the Privacy Tuning page becomes active
    And the sidebar "Privacy & Security" item is highlighted

  Scenario: Chevron animates on hover
    When I hover over the alert banner
    Then the ChevronRight icon translates slightly to the right
    And the chevron background brightens

  Scenario: Banner is keyboard focusable
    When I tab to the alert banner
    Then it receives visible focus styling
    When I press Enter
    Then the same navigation to Privacy occurs
```

---

### AC-08: Tweak Execution — Apply (Backend Phase 1)

```gherkin
Feature: Execute a single optimization tweak

  Scenario: Successful apply — Green level
    Given I am on "Performance Tuning"
    And "Disable SysMain (Superfetch)" is not applied (toggle OFF)
    When I toggle it ON
    And I click "Deploy (1)"
    Then a confirmation modal appears showing:
      | Field | Value |
      | Tweak name | Disable SysMain (Superfetch) |
      | Risk level | Green |
      | Estimated time | < 5 seconds |
      | PowerShell command | Stop-Service -Name 'SysMain'... |
    When I click "Confirm & Deploy"
    Then a progress indicator shows "Executing SysMain..."
    And within 10s the indicator shows "✓ Applied"
    And a green toast notification appears for 3 seconds
    And the toggle shows locked-ON with timestamp
    And the tweak ID appears in the history log

  Scenario: Requires admin elevation
    Given the app is running without admin rights
    When I click "Confirm & Deploy" on any HKLM registry tweak
    Then an elevation warning appears before the confirmation modal
    When I confirm elevation
    Then the Windows UAC prompt appears
    When I accept UAC
    Then the tweak executes and succeeds

  Scenario: Execution timeout
    Given the PowerShell command hangs
    When 30 seconds elapse
    Then the execution is cancelled
    And an error toast shows "Tweak timed out after 30 seconds"
    And the toggle returns to OFF state
    And the history records action: FAILED, reason: TIMEOUT

  Scenario: PowerShell command fails (non-zero exit code)
    Given the PowerShell command returns exit code 1
    Then an error modal shows stdout + stderr output
    And offers "View Error Details" and "Dismiss"
    And the toggle returns to OFF state
    And the history records action: FAILED

  Scenario: Validation confirms state after apply
    Given I applied "Disable SysMain"
    When validation runs automatically
    Then `Get-Service -Name 'SysMain' | Select-Object -ExpandProperty Status` returns "Stopped"
    And the toggle shows ON with a green validation dot
```

---

### AC-09: Tweak Revert (Backend Phase 1)

```gherkin
Feature: Undo an applied optimization

  Scenario: Revert single applied tweak
    Given "Disable SysMain" is applied (toggle ON, green dot)
    When I click the toggle to turn it OFF
    Then a revert confirmation modal appears:
      | Field | Value |
      | Action | Revert: Disable SysMain (Superfetch) |
      | Revert command | Set-Service -Name 'SysMain' -StartupType Automatic... |
    When I click "Revert"
    Then the revert code executes
    And the toggle shows OFF with revert timestamp
    And a green "✓ Reverted" toast appears
    And the history entry shows action: REVERTED, status: SUCCESS

  Scenario: Cancel revert keeps tweak applied
    Given "Disable SysMain" is applied
    When I click the toggle and the confirmation modal appears
    When I click "Cancel"
    Then the modal closes
    And the toggle remains ON
    And no revert command executes
    And no history entry is written

  Scenario: Revert fails gracefully
    Given the revert PowerShell command returns an error
    Then an error modal shows the stderr output
    And the toggle stays in an UNKNOWN/error state (amber indicator)
    And history records: action: REVERTED, status: FAILED
```

---

### AC-10: Batch Deploy with Progress & Rollback (Backend Phase 1)

```gherkin
Feature: Apply multiple optimizations in one operation

  Scenario: Successful batch of 3 tweaks
    Given I select: SystemResponsiveness, GamePriority, DisableGameDVR
    When I click "Deploy (3)" in the floating bar
    Then a preview modal shows all 3 tweaks with their commands, risk levels, and estimated total time
    When I click "Confirm & Deploy"
    Then a progress view shows 3 items with status:
      - SystemResponsiveness: [running...]
      - GamePriority: [pending]
      - DisableGameDVR: [pending]
    And each item transitions to ✓ as it completes
    And a final "3 tweaks deployed successfully" banner appears
    And all 3 history entries are written

  Scenario: Batch partially fails — user chooses rollback
    Given I deploy 3 tweaks and the 2nd fails
    Then execution pauses with error shown for tweak 2
    And options "Skip & Continue" and "Rollback All" are shown
    When I click "Rollback All"
    Then tweak 1's revertCode executes
    And the progress shows "Rolled back 1 tweak"
    And all 3 toggles show OFF
    And 3 history entries show: APPLIED(success), FAILED, REVERTED

  Scenario: Batch partially fails — user skips
    Given I deploy 3 tweaks and the 2nd fails
    When I click "Skip & Continue"
    Then tweak 3 executes
    And the summary shows "2 deployed, 1 failed"
    And tweaks 1 and 3 show ON, tweak 2 shows OFF with error indicator
```

---

### AC-11: Tweak State Validation on Load (Backend Phase 1)

```gherkin
Feature: Display current system state for each tweak

  Scenario: Tweak already applied shows ON
    Given the SysMain service is Stopped on the system
    When I navigate to Performance Tuning
    And validation queries complete
    Then "Disable SysMain" toggle shows ON (green)
    And a subtle "Active on system" label appears

  Scenario: Tweak not applied shows OFF
    Given the SysMain service is Running on the system
    When I navigate to Performance Tuning
    Then "Disable SysMain" toggle shows OFF (grey)

  Scenario: Empty validationCmd shows Unknown state
    Given "Disable Nagle's Algorithm" has an empty validationCmd
    When I navigate to Network Tuning
    Then the toggle shows in an Unknown/neutral state
    And no green or active indicator is shown

  Scenario: Validation loading skeleton
    When I navigate to a TweaksPage
    Then within the first 500ms a skeleton loading state is visible
    And within 5 seconds real validation states replace the skeletons
```

---

### AC-12: Expert Mode (Settings Phase 1)

```gherkin
Feature: Gate high-risk tweaks behind expert mode

  Scenario: Expert mode off — Red tweaks hidden
    Given Expert Mode is disabled (default)
    When I navigate to Power Tuning
    Then no tweaks are visible (DisableCoreParking requires expert mode)
    And a banner reads "Enable Expert Mode in Settings to unlock 1 advanced tweak"

  Scenario: Enable expert mode with confirmation
    When I navigate to Settings
    And I toggle "Expert Mode"
    Then a warning dialog appears:
      "Expert Mode enables high-risk tweaks that can affect system stability..."
    When I click "I Understand, Enable"
    Then Settings saves expertMode: true to localStorage
    And I navigate to Power Tuning
    Then "Disable CPU Core Parking" is visible with red border and "EXPERT" badge

  Scenario: Expert mode persists across sessions
    Given Expert Mode is enabled
    When I reload the app
    Then Expert Mode is still enabled
    And Red tweaks remain visible

  Scenario: Disable expert mode hides Red tweaks again
    Given Expert Mode is enabled
    When I disable it in Settings
    Then Red tweaks immediately disappear from all category pages
```

---

### AC-13: System Vitals — Live Data (Backend Phase 1)

```gherkin
Feature: Dashboard shows real system metrics

  Scenario: Metrics load on mount
    Given I navigate to the Dashboard
    When the page loads
    Then within 3 seconds the CPU temperature card shows a real value (not 68°C hardcoded)
    And the RAM card shows a real used/total value
    And the Drive card shows SMART status OK/WARNING/FAILED

  Scenario: Metrics refresh automatically
    Given the Dashboard is visible
    When 3 seconds elapse
    Then the metrics update with new values
    And the update is smooth (no flicker or blank state)

  Scenario: Metric value colour codes health
    Given CPU temperature is > 80°C
    Then the CPU card shows a red indicator badge "High Temp"
    Given CPU temperature is 60–80°C
    Then the indicator shows amber "Warm"
    Given CPU temperature is < 60°C
    Then the indicator shows blue/green "Cool"

  Scenario: WMI failure is handled gracefully
    Given a WMI query returns an error
    Then the affected card shows "Unavailable" with an amber indicator
    And the app does not crash or show a blank screen
    And other cards with successful queries still render

  Scenario: Health Score is computed from live data
    Given all vitals are healthy (CPU < 70°C, RAM < 80%, SMART OK)
    Then the Health Score is ≥ 85
    Given RAM usage is > 90%
    Then the Health Score decreases appropriately
```

---

### AC-14: Empty States

```gherkin
Feature: Meaningful empty states for all edge cases

  Scenario: Module under development (no view registered)
    Given I navigate to a route that has no view registered
    Then I see a "Module Under Development" empty state
    And it shows a wrench/tool icon, a title, and a description
    And an "In progress" status pill is visible with an amber pulse dot

  Scenario: Category with no tweaks
    Given I navigate to a TweaksPage category with 0 tweaks
    Then I see a "No optimizations yet" empty state with a Zap icon
    And the text "Configurations for this module are being developed" is visible

  Scenario: Filter results in zero matches
    Given the "Red" filter chip is active and no Red tweaks exist in the category
    Then I see "No red tweaks" with a "Clear filter" link
    When I click "Clear filter"
    Then the All filter is restored
```

---

## 6. Testing Strategy

### 6.1 Philosophy

- **Test behaviour, not implementation** — tests assert what users see and interact with, not internal state
- **Pyramid model** — many unit tests, fewer integration tests, fewest E2E tests
- **Test doubles for system calls** — all Tauri `invoke()` calls are mocked in unit/integration tests; real system calls only in targeted Rust unit tests
- **Coverage gate** — CI fails if line coverage drops below 80%
- **Fast feedback** — unit + integration suite must complete in < 60 seconds; E2E in < 5 minutes

### 6.2 Test Stack

| Layer | Tool | Scope |
| :--- | :--- | :--- |
| Unit tests | Vitest + @testing-library/react | Individual components, hooks, utilities |
| Integration tests | Vitest + @testing-library/react + msw (mock Tauri IPC) | Component interactions, page flows |
| E2E tests | Playwright | Full app flows in a real browser |
| Accessibility | axe-core (via @axe-core/playwright) | WCAG 2.1 AA on all pages |
| Visual regression | Playwright screenshots | UI consistency across changes |
| Rust unit tests | Cargo test | Rust backend commands and utilities |
| Coverage | @vitest/coverage-v8 | Line, branch, function coverage |
| CI | GitHub Actions | Run all layers on every PR |

### 6.3 Test File Conventions

```text
src/
  __tests__/
    components/
      CommandPalette.test.tsx      ← unit
      TweaksPage.test.tsx          ← unit + integration
      Sidebar.test.tsx             ← unit
      OnboardingModal.test.tsx     ← unit
      Dashboard.test.tsx           ← unit
    hooks/
      useTheme.test.tsx            ← unit
      useSystemVitals.test.tsx     ← unit (mock Tauri)
      useTweakExecution.test.tsx   ← integration (mock Tauri)
    pages/
      TweaksPage.integration.test.tsx  ← full page integration
    utils/
      filterTweaks.test.ts         ← pure unit
e2e/
  navigation.spec.ts               ← page nav, sidebar, palette
  tweaks.spec.ts                   ← select, deploy, revert flows
  onboarding.spec.ts               ← first-run, skip, retrigger
  accessibility.spec.ts            ← axe on every page
  visual.spec.ts                   ← screenshot regression
src-tauri/
  src/
    tweaks_test.rs                 ← Rust unit tests
    system_test.rs                 ← WMI mock tests
```

### 6.4 Mocking Strategy

#### Tauri IPC Mock (frontend tests)

```typescript
// src/test/mocks/tauri.ts
// Intercepts all invoke() calls and returns controlled fixtures
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd: string, args?: any) => {
    return TAURI_MOCK_HANDLERS[cmd]?.(args) ?? null;
  })
}));
```

#### System Vitals Fixture

```typescript
export const MOCK_SYSTEM_VITALS = {
  cpu: { tempC: 65, usagePct: 42, freqGHz: 4.8, model: 'AMD Ryzen 7 7800X3D' },
  ram: { usedMb: 8192, totalMb: 32768, usagePct: 25 },
  drives: { 'C:': { tempC: 38, freeGb: 420, totalGb: 1000, smartStatus: 'OK' } },
  network: { 'Ethernet': { latencyMs: 12, speedGbps: 2.5, status: 'UP' } },
  system: { uptimeSeconds: 86400, osVersion: 'Windows 11 23H2', isAdmin: false },
};
```

#### Tweak Execution Mock

```typescript
export function mockSuccessfulTweakExecution(tweakId: string) {
  return {
    success: true, tweakId, durationMs: 850,
    stdout: 'Service stopped successfully.', stderr: '', exitCode: 0,
  };
}

export function mockFailedTweakExecution(tweakId: string, reason: string) {
  return { success: false, tweakId, error: { code: 'EXECUTION_FAILED', message: reason } };
}
```

### 6.5 Coverage Targets

| Module | Line Coverage Target |
| :--- | :--- |
| `src/pages/` | ≥ 85% |
| `src/components/` | ≥ 85% |
| `src/hooks/` | ≥ 90% |
| `src/store/` | ≥ 90% |
| `src/lib/` | 100% |
| `src-tauri/src/` | ≥ 75% |

### 6.6 CI Pipeline

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  frontend-tests:
    steps:
      - vitest run --coverage         # unit + integration
      - coverage gate: 80% minimum
  e2e-tests:
    steps:
      - npm run dev (background)
      - playwright test
  rust-tests:
    steps:
      - cargo test
  build-check:
    steps:
      - npm run build (TypeScript + Vite)
```

---

## 7. Architecture

### 7.1 System Layers

```text
┌─────────────────────────── REACT FRONTEND ─────────────────────────────┐
│                                                                         │
│  Pages: Dashboard · TweaksPage · ProcessManager · StorageOptimizer     │
│         NetworkAnalyzer · SecurityAudit · GamingOptimizer · Reports    │
│         StartupManager · PowerManager · DriversPage · Settings         │
│         ProfilesPage · HistoryPage                                      │
│                                                                         │
│  Shared Components:                                                     │
│    Sidebar · CommandPalette · OnboardingModal · FloatingBar             │
│    MobileDrawer · ToastSystem · ConfirmDeployModal · ProgressModal     │
│    ErrorBoundary · EmptyState · ExpertModeGate                         │
│                                                                         │
│  Hooks: useSystemVitals · useTheme · useTweakHistory · useAppStore     │
│         useElevation · useTweakExecution · useMediaQuery               │
│                                                                         │
│  State: Zustand store (persist → localStorage/IndexedDB)               │
│    appliedTweaks · tweakHistory · systemVitals · userSettings          │
│    selectedTweaks · isExecuting · error · tweakValidationState         │
│                                                                         │
│  Data: tweaks.json · profiles.json · games.json · baselines.json      │
│                                                                         │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ invoke()
┌─────────────────────────────▼───────────────────────────────────────────┐
│                       TAURI 2 IPC LAYER                                 │
│  30+ commands; all return Result<T, String>                             │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────┐
│                     RUST BACKEND                                        │
│  Modules: system · tweaks · process · startup · disk                   │
│           network · power · drivers · reports · backup                 │
│           db · security · gaming                                        │
│                                                                         │
│  Key crates: wmi · winapi · rusqlite · serde_json · chrono             │
│              uuid · aes-gcm · reqwest · tokio                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────┐
│  WINDOWS OS: PowerShell · Registry · WMI · Services · netsh            │
│              powercfg · pnputil · SMART · Win32 API                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Frontend State Architecture (Zustand)

```typescript
// src/store/appStore.ts
interface AppState {
  // Persisted to localStorage
  appliedTweaks: string[];
  userSettings: UserSettings;
  profiles: Profile[];

  // Session only (in-memory)
  selectedTweaks: string[];
  systemVitals: SystemVitals | null;
  tweakValidationState: Record<string, 'Applied' | 'Reverted' | 'Unknown'>;
  isExecuting: boolean;
  executingTweakId: string | null;
  error: AppError | null;
}
```

---

## 8. Data Models

### Tweak (tweaks.json — enhanced)

```typescript
interface Tweak {
  id: string;
  name: string;
  category: 'Performance' | 'Privacy' | 'Gaming' | 'Network' | 'Power' | 'Tools' | 'Security';
  riskLevel: 'Green' | 'Yellow' | 'Red';
  requiresExpertMode: boolean;
  requiresAdminElevation: boolean;        // NEW
  estimatedExecutionTimeMs: number;       // NEW
  incompatibleWith: string[];             // NEW — conflict detection
  description: string;
  educationalContext: { howItWorks: string; pros: string; cons: string; };
  execution: { code: string; revertCode: string; };
  validationCmd: string;
  applicableToVersions: string[];         // NEW — ['Windows 10', 'Windows 11']
}
```

### SystemVitals

```typescript
interface SystemVitals {
  timestamp: number;
  cpu: { tempC: number; usagePct: number; freqGHz: number; model: string; cores: number; };
  ram: { usedMb: number; totalMb: number; usagePct: number; };
  drives: Record<string, { tempC: number; freeGb: number; totalGb: number; smartStatus: 'OK'|'WARNING'|'FAILED'; }>;
  network: Record<string, { latencyMs: number; speedGbps: number; status: 'UP'|'DOWN'; }>;
  system: { uptimeSeconds: number; osVersion: string; isAdmin: boolean; };
}
```

### TweakHistoryEntry

```typescript
interface TweakHistoryEntry {
  id: string;                         // UUID v4
  tweakId: string;
  tweakName: string;
  action: 'APPLIED' | 'REVERTED' | 'FAILED';
  timestamp: number;                  // Unix ms
  durationMs: number;
  commandExecuted: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  canRevert: boolean;
  vitalsSnapshot?: { before?: SystemVitals; after?: SystemVitals; };
}
```

### Profile

```typescript
interface Profile {
  id: string; name: string; description: string;
  isBuiltIn: boolean; tweakIds: string[];
  createdAt: number; lastAppliedAt?: number;
}
```

### UserSettings

```typescript
interface UserSettings {
  theme: 'dark' | 'light';
  colorScheme: 'default' | 'teal' | 'rose' | 'amber' | 'emerald' | 'violet';
  expertModeEnabled: boolean;
  autoRefreshVitals: boolean;
  autoRefreshIntervalMs: number;      // default: 3000
  showDeployConfirmation: boolean;    // default: true
  enableHistoryTracking: boolean;     // default: true
  maxHistoryEntries: number;          // default: 200
}
```

---

## 9. IPC Command Interface

```rust
// ── System ──────────────────────────────────────────────────────────────
get_system_vitals() -> Result<SystemVitals, String>
get_system_info()   -> Result<SystemInfo, String>
is_admin()          -> Result<bool, String>
elevate_and_execute(code: String) -> Result<String, String>

// ── Tweaks ──────────────────────────────────────────────────────────────
execute_tweak(id, code, dry_run) -> Result<TweakResult, String>
execute_batch_tweaks(tweaks, rollback_on_fail) -> Result<Vec<TweakResult>, String>
validate_tweak(id, validation_cmd) -> Result<TweakValidationState, String>
revert_tweak(id, revert_code)   -> Result<TweakResult, String>
revert_to_timestamp(ts)         -> Result<Vec<TweakResult>, String>

// ── History ─────────────────────────────────────────────────────────────
get_tweak_history(limit, since_ts) -> Result<Vec<TweakHistoryEntry>, String>
clear_tweak_history()              -> Result<(), String>

// ── Profiles ────────────────────────────────────────────────────────────
get_profiles()                     -> Result<Vec<Profile>, String>
save_profile(profile)              -> Result<(), String>
delete_profile(id)                 -> Result<(), String>
export_profile(id)                 -> Result<String, String>
import_profile(json)               -> Result<Profile, String>

// ── Process ─────────────────────────────────────────────────────────────
get_process_list()                 -> Result<Vec<ProcessInfo>, String>
set_process_priority(pid, pri)     -> Result<(), String>
terminate_process(pid)             -> Result<(), String>

// ── Startup ─────────────────────────────────────────────────────────────
get_startup_items()                -> Result<Vec<StartupItem>, String>
disable_startup_item(id)           -> Result<(), String>
enable_startup_item(id)            -> Result<(), String>

// ── Disk ────────────────────────────────────────────────────────────────
get_disk_info()                    -> Result<Vec<DiskInfo>, String>
get_disk_health(drive)             -> Result<SmartData, String>
get_cleanup_preview()              -> Result<CleanupPreview, String>
execute_cleanup(action_ids, dry_run) -> Result<CleanupResult, String>

// ── Network ─────────────────────────────────────────────────────────────
get_network_stats()                -> Result<NetworkStats, String>
run_network_diagnostic()           -> Result<NetworkDiagnostic, String>

// ── Power ───────────────────────────────────────────────────────────────
get_power_plans()                  -> Result<Vec<PowerPlan>, String>
set_active_power_plan(id)          -> Result<(), String>
get_battery_info()                 -> Result<BatteryInfo, String>

// ── Drivers ─────────────────────────────────────────────────────────────
get_driver_list()                  -> Result<Vec<DriverInfo>, String>
check_driver_updates()             -> Result<Vec<DriverUpdate>, String>
backup_driver(id)                  -> Result<String, String>
install_driver_update(id)          -> Result<(), String>

// ── Reports & Backup ────────────────────────────────────────────────────
generate_system_report()           -> Result<String, String>
create_backup(encrypt, passphrase) -> Result<String, String>
restore_backup(path, passphrase)   -> Result<(), String>
```

---

## 10. Module Breakdown & Feature Roadmap

### Module 1: Dashboard

| Feature | Status | AC | Effort |
| :--- | :--- | :--- | :--- |
| System Health Score (live) | 🔲 Backend | AC-13 | M |
| CPU/RAM/Drive/Network bento cards (live) | 🔲 Backend | AC-13 | M |
| Alert banner → Privacy navigation | ✅ Done | AC-07 | — |
| Live sparkline history graphs in cards | 🔲 New | AC-13 | M |
| Quick Scan button (apply all Green) | 🔲 Backend | AC-08 | S |
| Tweak history timeline widget | 🔲 New | AC-05 | M |

### Module 2: Tweaks (all categories)

| Feature | Status | AC | Effort |
| :--- | :--- | :--- | :--- |
| Tweak list + toggle switches | ✅ Done | AC-03 | — |
| Inspector sidebar (desktop) | ✅ Done | AC-04 | — |
| Mobile inspector drawer | ✅ Done | AC-04 | — |
| Risk filter chips | ✅ Done | AC-02 | — |
| Floating batch selection bar | ✅ Done | AC-03 | — |
| Better empty states | ✅ Done | AC-14 | — |
| **Tweak execution (wired to backend)** | 🔲 Backend | AC-08 | L |
| **Tweak validation on load** | 🔲 Backend | AC-11 | M |
| **Tweak revert** | 🔲 Backend | AC-09 | M |
| **Confirmation modal before deploy** | 🔲 New | AC-08 | S |
| **Progress modal during batch deploy** | 🔲 New | AC-10 | M |
| Expert mode filter | 🔲 New | AC-12 | S |
| Add 15+ new tweaks (Tools/Settings/Security) | 🔲 New | — | M |

### Module 3: Profiles | 4: History | 5: Settings

| Feature | Status | AC | Effort |
| :--- | :--- | :--- | :--- |
| Built-in presets (Gaming, Privacy, etc.) | 🔲 New | — | M |
| Custom profile CRUD | 🔲 New | — | M |
| History timeline page | 🔲 New | AC-09 | M |
| Revert-to-timestamp | 🔲 New | AC-09 | M |
| Settings page with all preferences | 🔲 New | AC-12 | M |
| Expert Mode toggle | 🔲 New | AC-12 | S |

### Modules 6–14: Future (Phases 2–4)

| Module | Key Features | Status |
| :--- | :--- | :--- |
| Process Inspector | Live process table, priority control, game detection | 🔲 |
| Startup Manager | Run keys, startup folder, scheduled tasks toggle | 🔲 |
| Storage Optimizer | Treemap, junk cleanup preview, SMART | 🔲 |
| Network Analyzer | Per-adapter stats, diagnostic, before/after | 🔲 |
| Security & Privacy Audit | Privacy score, issue list, harden action | 🔲 |
| Gaming Optimizer | Auto gaming mode, FPS overlay, GPU info | 🔲 |
| Power Manager | Plan selector, CPU freq editor, battery report | 🔲 |
| Driver Manager | Update scanner, backup, install, rollback | 🔲 |
| System Report & Backup | PDF/ZIP export, encrypted backup, restore | 🔲 |

---

## 11. Phased Delivery Plan

### Phase 0 — UI Polish ✅ Complete

All 10 UI improvements implemented, build passes, committed to GitHub.

### Phase 1 — Core Functionality (Weeks 1–6)

#### Sprint 1 (Weeks 1–2): Rust Backend Foundation

| Task | File | Acceptance Criteria |
| :--- | :--- | :--- |
| `get_system_vitals` WMI command | `src-tauri/src/system.rs` | AC-13 |
| `execute_tweak` + `validate_tweak` | `src-tauri/src/tweaks.rs` | AC-08, AC-11 |
| `is_admin` + `elevate_and_execute` | `src-tauri/src/security.rs` | AC-08 |
| SQLite schema + migrations | `src-tauri/src/db.rs` | AC-05, AC-09 |
| Register all commands | `src-tauri/src/lib.rs` | — |
| Fix CSP (null → proper policy) | `src-tauri/tauri.conf.json` | NFR-08 |
| Increase window size (1200×800) | `src-tauri/tauri.conf.json` | NFR-06 |
| Add Cargo dependencies | `src-tauri/Cargo.toml` | — |

#### Sprint 2 (Weeks 3–4): Frontend Wiring + State

| Task | File | Acceptance Criteria |
| :--- | :--- | :--- |
| Zustand store + persist | `src/store/appStore.ts` | AC-07, AC-03 |
| `useSystemVitals` polling hook | `src/hooks/useSystemVitals.ts` | AC-13 |
| `useElevation` hook | `src/hooks/useElevation.ts` | AC-08 |
| `useTweakExecution` hook | `src/hooks/useTweakExecution.ts` | AC-08, AC-09, AC-10 |
| `ConfirmDeployModal` | `src/components/ConfirmDeployModal.tsx` | AC-08 |
| `ProgressModal` | `src/components/ProgressModal.tsx` | AC-10 |
| `ToastSystem` | `src/components/ToastSystem.tsx` | AC-08, AC-09 |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | NFR-13 |
| Wire Dashboard to live vitals | `src/pages/Dashboard.tsx` | AC-13 |
| Wire TweaksPage Deploy button | `src/pages/TweaksPage.tsx` | AC-08, AC-11 |

#### Sprint 3 (Weeks 5–6): History, Profiles, Settings, Expert Mode

| Task | File | Acceptance Criteria |
| :--- | :--- | :--- |
| History page + timeline | `src/pages/HistoryPage.tsx` | AC-09 |
| Profiles page | `src/pages/ProfilesPage.tsx` | US-A5 |
| Settings page | `src/pages/SettingsPage.tsx` | AC-12 |
| Expert mode gate component | `src/components/ExpertModeGate.tsx` | AC-12 |
| Expand sidebar nav to all routes | `src/components/layout/Sidebar.tsx` | — |
| Add 15+ new tweaks | `src/data/tweaks.json` | AC-14 |

### Phase 2 — System Optimization Tools (Weeks 7–14)

Sprint 4: Startup Manager · Sprint 5: Storage Optimizer · Sprint 6: Process Manager · Sprint 7: Network Analyzer

### Phase 3 — Advanced Features (Weeks 15–22)

Sprint 8: Privacy Audit · Sprint 9: Gaming Mode + FPS Overlay · Sprint 10: Power Manager · Sprint 11: Driver Manager

### Phase 4 — Export, Polish & Compliance (Weeks 23–28)

Sprint 12–14: System Report · Backup/Restore · Scheduled Maintenance · Accessibility pass · Performance profiling

---

## 12. File-Level Change Map

### Phase 0 — ✅ Complete

| File | Change |
| :--- | :--- |
| `src/App.css` | +4 theme color schemes (rose, amber, emerald, violet) |
| `src/hooks/useTheme.tsx` | Expanded ColorScheme to 6 values |
| `src/App.tsx` | Fixed onboarding localStorage; setView to Dashboard; better empty state |
| `src/pages/Dashboard.tsx` | setView prop; alert banner onClick; animated chevron |
| `src/components/CommandPalette.tsx` | Category-grouped results with section headers |
| `src/components/layout/Sidebar.tsx` | Tooltip titles; 5-color swatch popover |
| `src/pages/TweaksPage.tsx` | Filter chips; floating bar; mobile drawer; empty states |
| `src/components/OnboardingModal.tsx` | Real mini-app visual mockups; clickable step dots |

### Testing Infrastructure — ✅ Complete

| File | Change |
| :--- | :--- |
| `vitest.config.ts` | Vitest config with jsdom, coverage thresholds, path aliases |
| `playwright.config.ts` | Playwright config for Chromium E2E |
| `src/test/setup.ts` | jest-dom matchers + global mock setup |
| `src/test/utils.tsx` | Custom render wrapper (ThemeProvider + Zustand) |
| `src/test/mocks/tauri.ts` | Tauri invoke() mock with command handlers |
| `src/test/mocks/fixtures.ts` | SystemVitals, TweakResult, TweakHistoryEntry fixtures |
| `src/__tests__/components/*.test.tsx` | Unit tests for all 4 main components |
| `src/__tests__/hooks/useTheme.test.tsx` | Hook unit tests |
| `e2e/navigation.spec.ts` | E2E: nav, sidebar, palette |
| `e2e/onboarding.spec.ts` | E2E: first-run, complete, retrigger |
| `e2e/tweaks.spec.ts` | E2E: filter, select, floating bar |
| `e2e/accessibility.spec.ts` | axe-core on all pages |
| `.github/workflows/ci.yml` | CI pipeline |
| `package.json` | +test/e2e/coverage scripts |

### Phase 1 (Backend + Wiring) — 🔲 Planned

| File | Change Type |
| :--- | :--- |
| `src-tauri/Cargo.toml` | +8 dependencies |
| `src-tauri/tauri.conf.json` | Fix CSP; resize 1200×800 |
| `src-tauri/src/lib.rs` | Register 30+ Tauri commands |
| `src-tauri/src/system.rs` | **New** |
| `src-tauri/src/tweaks.rs` | **New** |
| `src-tauri/src/security.rs` | **New** |
| `src-tauri/src/db.rs` | **New** |
| `src/store/appStore.ts` | **New** |
| `src/hooks/useSystemVitals.ts` | **New** |
| `src/hooks/useElevation.ts` | **New** |
| `src/hooks/useTweakExecution.ts` | **New** |
| `src/components/ConfirmDeployModal.tsx` | **New** |
| `src/components/ProgressModal.tsx` | **New** |
| `src/components/ToastSystem.tsx` | **New** |
| `src/components/ErrorBoundary.tsx` | **New** |
| `src/pages/Dashboard.tsx` | Wire useSystemVitals |
| `src/pages/TweaksPage.tsx` | Wire Deploy to useTweakExecution |
| `src/pages/SettingsPage.tsx` | **New** |
| `src/pages/ProfilesPage.tsx` | **New** |
| `src/pages/HistoryPage.tsx` | **New** |
| `src/data/tweaks.json` | +15 new tweaks |

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| PowerShell command hangs | Medium | High | 30s hard timeout via Rust tokio::time::timeout |
| Registry write fails silently | High | High | Always run validationCmd post-execute; compare before/after |
| WMI unavailable on locked-down Windows | Medium | Medium | Graceful fallback to "Unavailable" state; log error |
| UAC fatigue (users cancel elevation) | Medium | Medium | Batch all admin ops in single elevation session per deploy |
| Incompatible tweaks applied together | Medium | Medium | incompatibleWith field; pre-deploy conflict check |
| CSP null enables XSS | Low | Critical | Fix in Phase 1 Sprint 1 (tauri.conf.json) |
| App state lost on crash (no persistence) | Medium | Medium | Zustand persist writes after every action |
| Driver update bricks device | Low | Critical | Auto-backup before install; rollback within 2 clicks |
| Test suite becomes unmaintained | Medium | Medium | All tests must pass on every PR; coverage gate enforced |
| Feature scope creep delays MVP | High | High | Strict P0/P1/P2 gating; nothing unlocks until previous phase ships |
