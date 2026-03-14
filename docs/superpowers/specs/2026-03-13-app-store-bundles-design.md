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
| `src/pages/BundlesPage.tsx` | Full bundles UI — grid, groups, create flow |
| `src/hooks/useBundles.ts` | Bundle state, app resolution, localStorage CRUD for custom bundles |
| `src/components/BundleInstallModal.tsx` | Checklist modal with expandable app detail rows |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/AppsPage.tsx` | Add prominent hero card linking to `bundles` view |
| `src/App.tsx` | Register `bundles` view → `<BundlesPage />` |
| `src/components/layout/Sidebar.tsx` | Add "Bundles" nav item under Apps & Packages |

---

## 5. Data Model

### `bundles.json` Schema

```typescript
interface BundleCreator {
  // reserved for future use — not used in v1
}

interface Bundle {
  id: string;               // kebab-case unique ID
  type: "persona" | "curated" | "custom";
  group: string;            // display group name
  name: string;             // display name
  description: string;      // 1–2 sentence description shown on card
  icon: string;             // Lucide icon name
  color: string;            // tailwind color token e.g. "blue", "green", "violet"
  apps: string[];           // winget package IDs — cross-referenced against app_metadata.json
}
```

### Custom Bundle Storage

Custom bundles are stored in `localStorage` under key `winopt_custom_bundles` as `Bundle[]` with `type: "custom"`. They use the same schema. A `createdAt` ISO timestamp field is added for sort ordering.

### App Resolution

At runtime, `useBundles.ts` cross-references each bundle's `apps[]` array (winget IDs) against `app_metadata.json` to resolve full app objects (name, logo, description, license). Unresolved IDs are surfaced as "not available" in the install modal — they are shown but disabled and excluded from the install count.

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
| `overclocker-suite` | Overclocker & Stress Tester | CPU-Z, GPU-Z, HWiNFO64, OCCT, Prime95, FurMark, CineBench, MSI Afterburner |
| `windows-power-user` | Windows Power User | Sysinternals Suite, Windows Terminal, VS Code, WinSCP, PuTTY, 7-Zip |
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
| `benchmark-suite` | Benchmark & Stress Test Suite | HWiNFO64, CPU-Z, GPU-Z, MSI Afterburner, OCCT, FurMark, CrystalDiskMark, CineBench |
| `fresh-start-pack` | Fresh Start Pack | Firefox, Brave, VLC, 7-Zip, PowerToys, Everything, Notepad++, VS Code, Steam |
| `the-all-rounder` | The All-Rounder | 7-Zip, VLC, Firefox, MSI Afterburner, HWiNFO64, LibreOffice, Everything, Notepad++, Discord |
| `windows-internals` | Windows Internals Kit | Sysinternals Suite, Windows Terminal, VS Code, WinSCP, PuTTY, Wireshark |

---

## 7. UI/UX Design

### 7.1 Hero Card on App Store (`AppsPage.tsx`)

A full-width gradient card placed near the top of `AppsPage`, above the category browser. Clicking anywhere on the card navigates to the `bundles` view. Contains:
- Package/Layers icon
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

### 7.5 Create Bundle Panel

Triggered by "+ Create Bundle". Renders as an inline panel below the top bar (not a modal). Contains:
- Text input: Bundle Name (required)
- Icon picker: grid of ~12 Lucide icons
- Group selector: dropdown (Starters / Gaming / Power Users / Creative / Other)
- App search: searches `app_metadata.json`, results shown as selectable rows
- Selected apps list: shows chosen apps with remove buttons, drag-to-reorder handle
- Footer: "Cancel" + "Save Bundle" (disabled until name + ≥1 app)

Saved bundles are persisted to `localStorage` under `winopt_custom_bundles` and rendered in the "My Bundles" section.

### 7.6 Sidebar Entry

New nav item under **Apps & Packages**:
- Label: "Bundles"
- Icon: `Layers` (differentiates from App Store's `Package` icon)
- ID: `bundles`
- Position: second item, after "App Store"

---

## 8. `useBundles.ts` Hook API

```typescript
interface UseBundlesReturn {
  // Curated bundles (from bundles.json)
  curatedBundles: Bundle[];

  // User bundles (from localStorage)
  customBundles: Bundle[];
  saveCustomBundle: (bundle: Omit<Bundle, "id" | "type">) => void;
  updateCustomBundle: (id: string, updates: Partial<Bundle>) => void;
  deleteCustomBundle: (id: string) => void;

  // App resolution
  resolveBundle: (bundle: Bundle) => ResolvedBundle;
  // ResolvedBundle: Bundle + each app resolved to AppMetadata | null

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBundles: Bundle[];  // curated + custom, filtered by searchQuery
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
- `localStorage` mocked via `vi.stubGlobal` in hook tests

---

## 11. Implementation Sequence

1. Create `src/data/bundles.json` with all 22 bundle definitions
2. Implement `src/hooks/useBundles.ts`
3. Implement `src/components/BundleInstallModal.tsx`
4. Implement `src/pages/BundlesPage.tsx`
5. Add hero card to `src/pages/AppsPage.tsx`
6. Register view in `src/App.tsx`
7. Add sidebar nav item in `src/components/layout/Sidebar.tsx`
8. Write tests (4 files)
9. Verify all 22 bundle app IDs resolve against `app_metadata.json`; mark any unresolvable IDs

---

*Spec approved: 2026-03-13*
