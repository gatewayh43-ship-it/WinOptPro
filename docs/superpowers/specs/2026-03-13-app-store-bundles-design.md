# App Store Bundles — Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Feature:** Bundles sub-feature for the App Store

---

## 1. Overview

Add a **Bundles** sub-feature to the WinOpt Pro App Store. Bundles are curated collections of apps grouped by persona, use case, or theme. Users can install an entire bundle in one click via a checklist modal, and can also create, save, and manage their own custom bundles.

The feature lives on a dedicated `BundlesPage` linked from a prominent hero card on the existing `AppsPage`.

---

## 2. Goals

- Let users install multiple relevant apps in one action instead of hunting individually
- Provide opinionated, well-researched starting points for common PC setups
- Allow power users to build and save their own named collections
- Ship 22 curated bundles across 6 themed groups at launch

---

## 3. Non-Goals

- No cloud sync of custom bundles (localStorage only, v1)
- No bundle sharing between users
- No antivirus apps in any persona bundle (Windows Defender is sufficient)
- No YouTuber attribution, branding, avatars, or endorsement language

---

## 4. Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/data/bundles.json` | 22 curated bundle definitions (static, shipped with app) |
| `src/pages/BundlesPage.tsx` | Full bundles UI — grid, groups, create flow; accepts optional `setView` prop |
| `src/hooks/useBundles.ts` | Bundle state, app resolution, localStorage CRUD for custom bundles |
| `src/components/BundleInstallModal.tsx` | Checklist modal with expandable app detail rows |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/AppsPage.tsx` | Add optional `setView?: (view: string) => void` prop; add hero card linking to `bundles` view |
| `src/App.tsx` | Register `bundles: <BundlesPage />` and change `apps: <AppsPage setView={setCurrentView} />` |
| `src/components/layout/Sidebar.tsx` | Add "Bundles" nav item under Apps & Packages |

---

## 5. Data Model

### `bundles.json` Schema

```typescript
interface Bundle {
  id: string;               // kebab-case unique ID (custom bundles: crypto.randomUUID())
  type: "persona" | "curated" | "custom";
  group: string;            // display group name
  name: string;             // display name
  description: string;      // 1–2 sentence description shown on card
  icon: string;             // Lucide icon name
  color: string;            // tailwind color token e.g. "blue", "green", "violet"
  apps: string[];           // app IDs — must match "id" field in app_metadata.json flat dictionary
  createdAt?: string;       // ISO timestamp — custom bundles only, used for sort ordering
}

interface AppMetadata {
  id: string;               // winget package ID — same as the dictionary key
  name: string;
  publisher?: string;
  author?: string;
  description: string;
  version?: string;
  license?: string;
  logo: string;
  website?: string;
  support_url?: string;
  github_link?: string;
  is_verified?: boolean;
  trust_score?: number;
  rating?: number;
  reviews?: Array<{ author: string; rating: number; text: string; date: string }>;
  insights?: { pros: string[]; cons: string[] };
}

interface ResolvedBundle extends Bundle {
  resolvedApps: Array<{
    appId: string;          // the ID from bundle.apps[]
    metadata: AppMetadata | null;  // null = not found in app_metadata.json catalog
  }>;
}
```

### Custom Bundle Storage

Custom bundles are stored in `localStorage` under key `winopt_custom_bundles` as `Bundle[]` with `type: "custom"`. They use the same schema. The `createdAt` ISO timestamp field is set on save and used for sort ordering.

### App Resolution

`app_metadata.json` exports an object with two structures: a `categories[]` array (used by `AppsPage`) and a flat top-level dictionary where every key is an app ID (e.g. `"Mozilla.Firefox": { id: "Mozilla.Firefox", name: "...", ... }`). `useBundles.ts` uses **only the flat dictionary** for O(1) lookups:

```typescript
import rawMeta from "@/data/app_metadata.json";
const { categories: _ignored, ...appLookup } = rawMeta as any;
// appLookup["Mozilla.Firefox"] → AppMetadata object
```

`resolveBundle` maps each `bundle.apps[]` entry through this lookup. Unresolved IDs are surfaced as "not available" in the install modal — they are shown but disabled and excluded from the install count. The `resolveBundle` function returns a `ResolvedBundle` with `metadata: null` for any ID not in the dictionary.

---

## 6. The 22 Curated Bundles

### Group: Starters

| ID | Name | Apps |
|----|------|------|
| `beginner-essentials` | Beginner Essentials | Firefox, 7-Zip, VLC, Notepad++, Everything, PowerToys, Bitwarden |
| `office-wfh` | Office & WFH | LibreOffice, Zoom, Slack, Teams, 7-Zip, VLC, PowerToys, Bitwarden |
| `student-setup` | Student Setup | LibreOffice, Firefox, Bitwarden, Zotero, Discord, 7-Zip, VLC, Obsidian |

### Group: Gaming

| ID | Name | Apps |
|----|------|------|
| `gamers-setup` | The Gamer's Setup | Steam, Epic Games, GOG Galaxy, Discord, Playnite, MSI Afterburner, OBS Studio |
| `competitive-edge` | Competitive Edge | Steam, Discord, HWiNFO64, MSI Afterburner, CPU-Z, GPU-Z, Process Lasso |
| `game-dev-starter` | Game Dev Starter | Unity Hub, VS Code, Git, Blender, 7-Zip, Discord |

### Group: Power Users

| ID | Name | Apps |
|----|------|------|
| `developer-workstation` | Developer Workstation | VS Code, Git, Windows Terminal, Node.js, Python, Docker, Postman, WinSCP |
| `overclocker-suite` | Overclocker & Stress Tester | CPU-Z, GPU-Z, HWiNFO64, OCCT, FurMark, CrystalDiskMark, CineBench R23, MSI Afterburner |
| `windows-power-user` | Windows Power User | Process Explorer, Windows Terminal, VS Code, WinSCP, PuTTY, 7-Zip |
| `sysadmin-toolkit` | Sysadmin Toolkit | Wireshark, PuTTY, WinSCP, Advanced IP Scanner, Nmap, Windows Terminal |

### Group: Creative

| ID | Name | Apps |
|----|------|------|
| `content-creator` | Content Creator | OBS Studio, DaVinci Resolve, Audacity, GIMP, Discord, Handbrake |
| `video-editor` | Video Editor | DaVinci Resolve, Handbrake, VLC, Audacity, GIMP, Inkscape |
| `music-producer` | Music Producer | Audacity, REAPER, foobar2000, VLC |

### Group: Community Picks

| ID | Name | Apps |
|----|------|------|
| `pc-diagnostics` | PC Diagnostics Toolkit | HWiNFO64, CPU-Z, GPU-Z, MSI Afterburner, CrystalDiskInfo, CrystalDiskMark |
| `forum-all-stars` | Forum All-Stars | 7-Zip, VLC, Firefox, MSI Afterburner, HWiNFO64, LibreOffice, Everything, Notepad++, Discord |
| `privacy-first` | Privacy First | Firefox, Brave, Bitwarden, ProtonVPN, Signal, KeePassXC |
| `the-minimalist` | The Minimalist | Firefox, 7-Zip, VLC, Notepad++, Everything |

### Group: Curated Collections

| ID | Name | Apps |
|----|------|------|
| `pc-builders-kit` | PC Builder's Kit | GPU-Z, CPU-Z, HWiNFO64, MSI Afterburner, OBS Studio |
| `benchmark-suite` | Benchmark & Stress Test Suite | HWiNFO64, CPU-Z, GPU-Z, MSI Afterburner, OCCT, FurMark, CrystalDiskMark, CineBench R23 |
| `fresh-start-pack` | Fresh Start Pack | Firefox, Brave, VLC, 7-Zip, PowerToys, Everything, Notepad++, VS Code, Steam |
| `the-all-rounder` | The All-Rounder | 7-Zip, VLC, Firefox, MSI Afterburner, HWiNFO64, LibreOffice, Everything, Notepad++, Discord |
| `windows-internals` | Windows Internals Kit | Process Explorer, Windows Terminal, VS Code, WinSCP, PuTTY, Wireshark |

---

## 7. UI/UX Design

### 7.1 Hero Card on App Store (`AppsPage.tsx`)

A full-width gradient card inserted in `AppsPage.tsx` **after the closing `}` of the view-toggle conditional block (line ~146) and before the opening `<div className="flex-1 w-full max-w-[1300px]...">` (line ~149)**. The hero card is placed at the same JSX nesting level as the view-toggle block and the main content `<div>` — it must NOT be placed inside the categories ternary. It renders unconditionally regardless of search state. Clicking anywhere on the card calls `setView?.("bundles")` (the new optional prop added to `AppsPage`). `setView` is optional with a default no-op so existing `render(<AppsPage />)` calls in tests pass without changes. Contains:
- `Boxes` icon (matches the Bundles sidebar icon)
- Title: "App Bundles"
- Subtitle: "Install curated app collections in one click."
- Badge: "22 bundles"
- Arrow CTA: "Browse →"

### 7.2 Bundles Page Layout (`BundlesPage.tsx`)

Top bar:
- Search input (filters bundle names and descriptions client-side)
- "+ Create Bundle" button (right-aligned)

Body:
- Groups rendered as labelled sections, each containing a responsive card grid
- Group order: Starters → Gaming → Power Users → Creative → Community Picks → Curated Collections
- User-created bundles appear in a "My Bundles" section at the top when present

### 7.3 Bundle Card

Each card displays:
- Colour-coded icon (Lucide)
- Bundle name (bold)
- Group badge (small pill)
- App count (e.g. "7 apps")
- First 3 app names as small pills with overflow count ("+4 more")
- "Install Bundle" primary button
- Edit (pencil) + Delete (trash) icons on custom bundles only

### 7.4 Install Modal (`BundleInstallModal.tsx`)

Opens as a modal overlay. Contains:
- Header: "Install: [Bundle Name]"
- Scrollable checklist of all bundle apps
- Each row: checkbox + app logo + app name + expand chevron
- Expanded row: app description, license, source link (from `app_metadata.json`)
- Already-installed apps: ticked, greyed label, "Installed ✓" badge — counted but won't re-install
- Unavailable apps (not in catalog): ⚠ badge, disabled checkbox, excluded from count
- Footer: selected count summary + "Cancel" + "Install N apps →" button
- Install button label updates live as user ticks/unticks

**Component props:** See `BundleInstallModalProps` definition in Section 5. `BundleInstallModal` receives `installApp` and `installedApps` as props from `BundlesPage`, which owns the `useApps()` instance.

**Installed-state prefetch timing:** Triggered on "Install Bundle" card click, before the modal renders. `BundlesPage` calls `checkInstalled(app.appId, app.appId)` for each resolved app (hook signature: `(wingetId: string, appId: string)` — pass app ID as both args). While checks are in-flight, modal renders with skeleton shimmer on installed-badge slots and the "Install N apps →" footer button is disabled. Installed check in modal: `installedApps[app.appId] === true`.

**Per-app result tracking:** `BundleInstallModal` maintains its own local `installResultsMap: Record<string, AppInstallResult>` state. After each `await installApp(...)` call, store the result in `installResultsMap[app.appId]` to drive per-app green/red/retry display. This state is not passed as a prop — the modal owns it.

**Install call convention:** Each selected, non-installed app calls `installApp(app.appId, "", app.appId)`. Installs are executed **sequentially** (for-loop with await) because `useApps.installingId` is a single slot. `installApp` handles the Tauri environment guard internally; the modal does not need its own isTauri check.

### 7.5 Create Bundle Panel

Triggered by "+ Create Bundle". Renders as an inline panel below the top bar (not a modal). Contains:
- Text input: Bundle Name (required)
- Icon picker: grid of ~12 Lucide icons
- Group selector: dropdown (Starters / Gaming / Power Users / Creative / Other)
- App search: searches `app_metadata.json`, results shown as selectable rows
- Selected apps list: shows chosen apps with remove buttons, drag-to-reorder handle (HTML5 native `draggable` + `onDragStart`/`onDrop` — no external library)
- Footer: "Cancel" + "Save Bundle" (disabled until name + ≥1 app)

Saved bundles are persisted to `localStorage` under `winopt_custom_bundles` and rendered in the **"My Bundles"** section at the top of the page. Bundles saved with the "Other" group appear only in "My Bundles" — they are not assigned to any curated group section. Collision handling: if the bundle name already exists, append ` (2)`, ` (3)`, etc.

### 7.6 Sidebar Entry

New nav item under **Apps & Packages**:
- Label: "Bundles"
- Icon: `Boxes` (`Layers` is already used by the Profiles nav item)
- ID: `bundles`
- Position: second item, after "App Store"
- **Import note:** Add `Boxes` to the Lucide import statement in `Sidebar.tsx` (it is not currently imported)

---

## 8. `useBundles.ts` Hook API

```typescript
interface UseBundlesReturn {
  // Curated bundles (from bundles.json)
  curatedBundles: Bundle[];

  // User bundles (from localStorage)
  customBundles: Bundle[];
  // id: auto-generated via crypto.randomUUID()
  // type: always "custom"
  // createdAt: always stamped as new Date().toISOString() — excluded from signature to prevent override
  saveCustomBundle: (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => void;
  updateCustomBundle: (id: string, updates: Partial<Bundle>) => void;
  deleteCustomBundle: (id: string) => void;

  // App resolution
  resolveBundle: (bundle: Bundle) => ResolvedBundle;
  // ResolvedBundle defined in Section 5: Bundle + resolvedApps array

  // Search — filteredBundles = curated + custom filtered by searchQuery
  // Ordering: when searchQuery is empty, curated bundles preserve group order (Starters→…→Curated Collections),
  //           custom bundles (My Bundles) appear first. When searchQuery is non-empty, all bundles
  //           are shown as a flat list sorted by match relevance (name match before description match),
  //           with no group sectioning — a single "Search Results" heading replaces the group layout.
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBundles: Bundle[];
}
```

---

## 9. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Bundle app not in `app_metadata.json` | ⚠ "Not available" row in modal, disabled, excluded from install count |
| All apps already installed | "All Installed ✓" button, disabled |
| Install fails mid-bundle | Failed apps shown in red with per-app retry; successful ones stay green |
| Custom bundle has 0 apps | Save button disabled; inline "Add at least one app" message |
| Custom bundle name collision | Append ` (2)`, ` (3)` automatically |
| `localStorage` unavailable | Custom bundle section hidden; curated bundles unaffected |
| App metadata not yet loaded | Skeleton shimmer on modal rows while resolving |
| Empty search results | "No bundles match '[query]'" empty state with clear button |

---

## 10. Testing Plan

| File | Coverage |
|------|----------|
| `src/__tests__/pages/BundlesPage.test.tsx` | Group sections render, cards show correct app count, search filters, hero card navigation, create bundle form validation, custom bundle save/delete/render |
| `src/__tests__/hooks/useBundles.test.ts` | CRUD on custom bundles, localStorage persistence + hydration, `resolveBundle` against mock catalog, search filtering |
| `src/__tests__/components/BundleInstallModal.test.tsx` | Checklist tick/untick, expand/collapse rows, install count updates live, already-installed detection, unavailable app handling, install button calls `installApp` for each selected non-installed app |
| `src/__tests__/pages/AppsPage.test.tsx` (update) | Hero card renders, clicking navigates to `bundles` view |

Mocking patterns follow existing conventions:
- `vi.mocked(tauriCore.invoke)` for install calls
- `useApps` mocked via `vi.mock` in modal tests
- `localStorage`: `src/test/setup.ts` already replaces localStorage with a custom in-memory stub via `vi.stubGlobal("localStorage", localStorageMock)` that auto-clears in `beforeEach`. Tests should use `localStorage.setItem(...)` directly for setup and `vi.spyOn(localStorage, "setItem")` for assertions. Do **not** re-stub localStorage in individual test files — it is already globally mocked.

---

## 11. Implementation Sequence

1. **Audit & extend `src/data/app_metadata.json`** — the following apps are confirmed present in the **flat dictionary** (O(1) lookup by key): `Mozilla.Firefox`, `Brave.Brave`, `7zip.7zip`, `CPUID.CPU-Z`, `TechPowerUp.GPU-Z`, `REALiX.HWiNFO` (HWiNFO64), `Guru3D.Afterburner` (MSI Afterburner), `Playnite.Playnite`, `Obsidian.Obsidian`, `DigitalScholar.Zotero`, `Postman.Postman`, `Insecure.Nmap`, `Famatech.AdvancedIPScanner`, `HandBrake.HandBrake`, `Inkscape.Inkscape`, `Maxon.CinebenchR23` (CineBench R23), `voidtools.Everything`, `Microsoft.PowerToys`, `Unity.UnityHub`, `GOG.Galaxy`.

   **ID pitfalls** — multiple IDs exist for some apps; use the exact flat-dict key:
   - `PeterPawlowski.foobar2000` ← use this (both `PeterPawlowski.foobar2000` and `PeterPavlishak.foobar2000` exist in the file but point to different entries; the former is the correct one)
   - `GIMP.GIMP.3` ← use this; `GIMP.GIMP` exists in categories only, not flat dict
   - `Python.Python.3.14` ← use this; no version-agnostic key exists

   The following apps are **confirmed absent** and must be added to `app_metadata.json` (with logo, description, license, winget ID) before `bundles.json` is finalized:

   | App | winget ID | Used in |
   |-----|-----------|---------|
   | Notepad++ | `Notepad.Notepad-plus-plus` | beginner-essentials, forum-all-stars, the-minimalist, fresh-start-pack, the-all-rounder |
   | DaVinci Resolve (flat dict) | `BlackmagicDesign.DaVinciResolve` — exists in `categories[]` only; add matching entry to flat dict | content-creator, video-editor |
   | Process Lasso | `BitSum.ProcessLasso` | competitive-edge |
   | OCCT | `OCBase.OCCT` | overclocker-suite, benchmark-suite |
   | FurMark | `Geeks3D.FurMark` | overclocker-suite, benchmark-suite |
   | CrystalDiskInfo | `CrystalDewWorld.CrystalDiskInfo` | pc-diagnostics |
   | CrystalDiskMark | `CrystalDewWorld.CrystalDiskMark` | pc-diagnostics, benchmark-suite |
   | REAPER | `Cockos.REAPER` | music-producer |
   | ProtonVPN | `ProtonTechnologies.ProtonVPN` | privacy-first |
   | ~~Signal~~ | `OpenWhisperSystems.Signal` already present in flat dict — no action needed | privacy-first |
   | KeePassXC | `KeePassXCTeam.KeePassXC` | privacy-first |
   | ~~Prime95~~ | No standard winget ID — already replaced with `CrystalDewWorld.CrystalDiskMark` in Section 6 overclocker-suite | — |
   | ~~Sysinternals Suite~~ | No single-package winget ID — already replaced with `Microsoft.Sysinternals.ProcessExplorer` (`Microsoft.Sysinternals.ProcessExplorer`) in Section 6 windows-power-user and windows-internals | — |

2. Create `src/data/bundles.json` with all 22 bundle definitions (using only IDs confirmed present or added in step 1)
3. Implement `src/hooks/useBundles.ts`
4. Implement `src/components/BundleInstallModal.tsx`
5. Implement `src/pages/BundlesPage.tsx`
6. Add hero card to `src/pages/AppsPage.tsx`
7. Register view in `src/App.tsx`
8. Add sidebar nav item in `src/components/layout/Sidebar.tsx` (use `Boxes` icon)
9. Write tests (4 files)

---

*Spec approved: 2026-03-13*
