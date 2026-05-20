# One-Click Smart Optimise — Design Spec

**Date:** 2026-05-20
**Status:** Approved (brainstorming)
**Author:** WinOpt brainstorming session

## 1. Goal

Add a one-click optimisation feature that lets users apply curated, context-aware sets of WinOpt tweaks (plus optional maintenance actions) without navigating through the 165-tweak catalog. The feature must:

- Recommend the best bundle for the current PC automatically (context-aware "Smart Optimise").
- Let users pick from goal-specific bundles (Gaming, Privacy, Old PC, Speed Up, Network, Debloat, Safe Tune-up).
- Let users choose an impact tier per goal (Conservative / Balanced / Aggressive).
- Surface a high-impact entry point on the Dashboard.
- Replace the existing `ProfilesPage.tsx` with a richer "Quick Optimise" hub that absorbs custom-profile functionality.

## 2. Non-goals (YAGNI)

- No new Rust / Tauri commands. Execution reuses the existing tweak-apply, standby-flush, TRIM, and temp-clean pipelines.
- No analytics / telemetry on bundle usage.
- No A/B testing of bundle composition.
- No "undo this whole bundle" button — per-tweak revert (existing) is sufficient.
- No scheduling of bundles — `ScheduledMaintenance` already covers recurring tasks.

## 3. Data model changes

### 3.1 `src/data/tweaks.json` — additive fields

Each of the 165 tweak entries gains two new optional fields:

```json
{
  "id": "DisableHpet",
  "name": "Disable HPET timer",
  "category": "Gaming",
  "riskLevel": "Yellow",
  ...,
  "impact": "High",
  "effectiveness": {
    "gaming": 9,
    "old_pc": 7,
    "latency": 8
  }
}
```

- **`impact`** — `"High" | "Medium" | "Low"`. General performance/system impact. Required on all 165 entries.
- **`effectiveness`** — partial map `{ goal: 0–10 }`. Only goals where the tweak is relevant appear as keys. A tweak with no `effectiveness` map is ignored by every goal bundle (purely cosmetic / niche tweaks).

The seven goal keys: `gaming`, `privacy`, `old_pc`, `speed_up`, `network`, `debloat`, `safe_tuneup`.

Curated once by category-expertise, hand-reviewed. No runtime computation.

### 3.2 `src/data/quickOptimiseBundles.ts` — NEW

Defines 21 bundles (7 goals × 3 tiers). Shape:

```ts
export interface QuickBundle {
  goal: Goal;
  tier: Tier;
  label: string;             // "Boost Gaming · Balanced"
  description: string;       // user-facing one-liner
  riskGate: RiskLevel[];     // tweaks above this risk are excluded
  effectivenessThreshold: number;  // 0–10
  includeIds: string[];      // explicit allowlist (curated)
  excludeIds: string[];      // explicit denylist (overrides include)
  postActions: PostAction[]; // e.g. ["flush_standby", "trim", "clear_temp"]
}

export type Goal =
  | "gaming" | "privacy" | "old_pc" | "speed_up"
  | "network" | "debloat" | "safe_tuneup";

export type Tier = "conservative" | "balanced" | "aggressive";

export type PostAction =
  | "flush_standby" | "trim" | "clear_temp" | "restart_explorer";

export const QUICK_OPTIMISE_BUNDLES: QuickBundle[];
```

**Tier conventions:**

| Tier         | riskGate                | effectivenessThreshold |
|--------------|-------------------------|------------------------|
| conservative | `["Green"]`             | ≥ 7                    |
| balanced     | `["Green", "Yellow"]`   | ≥ 5                    |
| aggressive   | `["Green","Yellow","Red"]` | ≥ 3                |

`includeIds` is the curated allowlist; the gate + threshold act as guardrails. The resolver returns the intersection.

### 3.3 Resolver — `resolveBundle(bundle): ResolvedBundle`

```ts
interface ResolvedBundle {
  bundle: QuickBundle;
  tweaks: Tweak[];        // post-filter, ordered by effectiveness desc
  postActions: PostAction[];
  estimatedDurationSec: number; // tweaks.length * 2 + postActions cost estimate
}
```

Filtering rules:
1. Start with `includeIds`.
2. Remove any in `excludeIds`.
3. Remove any whose `riskLevel` is not in `riskGate`.
4. Remove any whose `effectiveness[goal]` is below `effectivenessThreshold` (or missing).
5. Sort descending by `effectiveness[goal]`.

## 4. Smart detector

### 4.1 `src/lib/smartDetector.ts` — NEW

```ts
export interface SmartRecommendation {
  goal: Goal;
  tier: Tier;
  reasoning: string[];    // human-readable signals, e.g. ["8 GB RAM", "HDD primary disk"]
  confidence: "high" | "medium" | "low";
}

export function recommendBundle(input: {
  ramGb: number;
  hasDiscreteGpu: boolean;
  primaryDiskType: "SSD" | "HDD" | "Unknown";
  hasBattery: boolean;
  gameRecentlyDetected: boolean;
}): SmartRecommendation;
```

### 4.2 Decision rules (evaluated in order)

| Signal                                          | Goal          | Tier         |
|-------------------------------------------------|---------------|--------------|
| `ramGb ≤ 4` OR `primaryDiskType === "HDD"`      | `old_pc`      | `balanced`   |
| `ramGb ≤ 8` AND `hasBattery` AND no dGPU         | `old_pc`      | `conservative` |
| `gameRecentlyDetected` AND `hasDiscreteGpu`     | `gaming`      | `balanced`   |
| `hasBattery` AND no dGPU (modern laptop)         | `speed_up`    | `conservative` |
| (default / no clear signal)                     | `safe_tuneup` | `balanced`   |

`reasoning` lists the signals that fired so the UI can show *"8 GB RAM · HDD · No game detected → Old PC · Balanced"*.

### 4.3 Inputs come from

- `useSystemVitals` → RAM total, GPU info, disk info.
- `usePower` → battery presence.
- `useGaming` → `gameRecentlyDetected` flag (already polled).

Pure function — easy to unit test.

## 5. New hook — `src/hooks/useQuickOptimise.ts`

```ts
export function useQuickOptimise() {
  return {
    recommendation: SmartRecommendation | null;
    bundles: QuickBundle[];                                  // all 21
    resolve: (goal: Goal, tier: Tier) => ResolvedBundle;
    runBundle: (bundle: ResolvedBundle) => Promise<void>;    // orchestrates tweaks + post-actions
    isRunning: boolean;
    progress: ProgressItem[];                                // mirrors existing ProgressModal shape
  };
}
```

`runBundle` orchestrates:
1. Call existing `useTweakExecution.applyMany(tweakIds)` for tweaks.
2. For each `postAction`, call the matching existing hook:
   - `flush_standby` → `useLatency.flushStandbyList()`
   - `trim` → `useStorage.runTrim()`
   - `clear_temp` → `useStorage.executeCleanup(itemIds)` — first calls `scan` to populate cleanup items, then executes against the safe subset (browser caches, temp folders) by id.
   - `restart_explorer` → invoke existing process hook
3. Update `progress` items incrementally.
4. On completion, push a success toast and emit a `"quick-optimise:done"` event for the audit log.

## 6. UI

### 6.1 Quick Optimise hub — `src/pages/QuickOptimisePage.tsx`

Replaces `src/pages/ProfilesPage.tsx` (the file is renamed; existing custom-profile logic is preserved inside).

Layout (top to bottom):

1. **Hero card** — Smart Optimise
   - 🪄 Large primary button "Smart Optimise"
   - Reasoning chip below: e.g. *"8 GB RAM · HDD · No recent game → Old PC · Balanced — 12 tweaks + standby flush"*
   - Click → `ConfirmDeployModal` with resolved bundle.

2. **Goal grid** — 7 cards (Gaming / Privacy / Old PC / Speed Up / Network / Debloat / Safe Tune-up)
   - Each card: icon, name, one-line description.
   - 3-tier segmented control: Conservative · Balanced · Aggressive.
   - Live count: *"8 tweaks + 1 maintenance task · ~16 s"*.
   - "Apply" button on each card → `ConfirmDeployModal`.

3. **My Bundles** section
   - Lists existing user-created custom profiles (preserved from current `ProfilesPage`).
   - "Build your own" button opens the existing custom-profile builder modal (logic unchanged).

### 6.2 Dashboard hero — `src/pages/Dashboard.tsx`

Adds a compact Quick Optimise card near the top (placement: same row as SystemScore on wide screens, stacked above on narrow):

- 🪄 **Smart Optimise** primary button — full-width on the card.
- Reasoning chip (truncated to one line; full text in tooltip).
- Three secondary buttons: 🎮 Gaming · 🔒 Privacy · 🛡️ Old PC — each runs `balanced` tier directly.
- "See all options →" link → routes to `quick_optimise` view.

### 6.3 Sidebar — `src/components/layout/Sidebar.tsx`

In `NAV_GROUPS.tuning`:
- Rename `"Profiles"` → `"Quick Optimise"`.
- Keep the `Sparkles` icon.
- View key changes from `profiles` to `quick_optimise`.

### 6.4 App routing — `src/App.tsx`

- Add `quick_optimise: <QuickOptimisePage />` to the `views` object.
- Remove the `profiles` entry (or alias for one release: `profiles: <QuickOptimisePage />` to avoid breaking any saved deep links).
- Default initial view unchanged (`dashboard`).

## 7. Execution pipeline (no new Tauri commands)

```
[Smart button / goal+tier click]
        │
        ▼
[useQuickOptimise.resolve()] ─► ResolvedBundle
        │
        ▼
[ConfirmDeployModal]  ◄── reused as-is, accepts a list of tweaks + a postActions footer
        │ user confirms
        ▼
[ProgressModal]      ◄── reused as-is
        │
        ▼
[useTweakExecution.applyMany()]
[useLatency.flushStandbyList(), useStorage.runTrim(), …]
        │
        ▼
[Toast: "Quick Optimise complete — 12 tweaks applied"]
[Audit log entry via existing db.rs path]
```

`ConfirmDeployModal` gains a `postActions?: PostAction[]` prop to render a small "Plus: flush standby list, run TRIM" footer. No structural change.

## 8. Files touched

| File | Change |
|------|--------|
| `src/data/tweaks.json` | Add `impact` (all 165) + `effectiveness` (where relevant) |
| `src/data/quickOptimiseBundles.ts` | NEW — 21 bundles |
| `src/lib/smartDetector.ts` | NEW — pure recommendation function |
| `src/hooks/useQuickOptimise.ts` | NEW |
| `src/pages/QuickOptimisePage.tsx` | NEW — renamed from `ProfilesPage.tsx` |
| `src/pages/ProfilesPage.tsx` | DELETE (logic preserved in `QuickOptimisePage.tsx`) |
| `src/pages/Dashboard.tsx` | Add Quick Optimise hero card |
| `src/components/layout/Sidebar.tsx` | Rename nav item + view key |
| `src/App.tsx` | Register new view; optional alias for `profiles` |
| `src/components/ConfirmDeployModal.tsx` | Add optional `postActions` prop to footer |
| `src/types/quickOptimise.ts` | NEW — `Goal`, `Tier`, `PostAction`, `QuickBundle`, `ResolvedBundle`, `SmartRecommendation` |

## 9. Testing strategy

New tests (Vitest):

- `src/__tests__/lib/smartDetector.test.ts` — all 5 decision branches, edge cases (exact thresholds at 4 GB / 8 GB), default fallthrough.
- `src/__tests__/data/quickOptimiseBundles.test.ts` — every bundle's `includeIds` exists in `tweaks.json`; every `excludeIds` exists; risk gates valid; effectiveness thresholds within 0–10.
- `src/__tests__/hooks/useQuickOptimise.test.ts` — resolve filters correctly; runBundle orchestrates tweaks then post-actions; progress updates.
- `src/__tests__/pages/QuickOptimisePage.test.tsx` — renders Smart hero, all 7 goal cards, tier selector switches counts, "Apply" opens ConfirmDeployModal, custom-profile section still works.
- `src/__tests__/components/Dashboard.test.tsx` — Quick Optimise hero present, secondary buttons run balanced tier, "See all" navigates.

Existing tests touched:

- `src/__tests__/pages/ProfilesPage.test.tsx` → renamed and adapted.
- `src/__tests__/components/Sidebar.test.tsx` → expects "Quick Optimise" label.

Target: all 769+ existing tests still green; ~30 new tests.

## 10. Risk & rollout

- **Backwards compat for saved state** — `useAppStore.appliedTweaks[]` is unchanged. Existing custom profiles in localStorage continue to load.
- **Tweak metadata risk** — `impact` and `effectiveness` are additive optional fields; the rest of the app ignores them. Safe to ship incrementally.
- **Rename risk** — `profiles` → `quick_optimise` view key. Keep an alias for one release.
- **Curation risk** — bundle composition is opinionated. Document the curation rules in a comment block at the top of `quickOptimiseBundles.ts` so future edits stay coherent.

## 11. Open questions (deferred — not blockers)

- Should "My Bundles" be promoted to the goal grid once a user has created them? *(Deferred to a follow-up.)*
- Should `aggressive` tier require an "I understand the risks" checkbox in `ConfirmDeployModal`? *(Likely yes; will be added during implementation.)*
- Should we add a `quick_optimise` audit-log entry kind in `db.rs`? *(Existing per-tweak audit entries cover it; a higher-level entry is a follow-up.)*
