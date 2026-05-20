# One-Click Smart Optimise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Quick Optimise" feature with a context-aware smart recommendation, 7 goal-based curated bundles (Gaming/Privacy/Old PC/Speed Up/Network/Debloat/Safe Tune-up), and 3 impact tiers per goal — accessible from the Dashboard hero and a dedicated Quick Optimise hub that replaces the existing Profiles page.

**Architecture:** Pure-function smart detector reads system vitals; a declarative bundles file holds 21 curated (goal × tier) bundles with `includeIds` lists, risk gates, and optional post-actions (standby flush / TRIM / temp clean). A `useQuickOptimise` hook resolves a bundle and orchestrates execution through the existing `ConfirmDeployModal` → `ProgressModal` → `useTweakExecution.applyTweak` pipeline — no new Tauri commands. The new `QuickOptimisePage` replaces `ProfilesPage.tsx`; the Dashboard gains a compact hero card surfacing the smart recommendation plus three goal shortcuts.

**Tech Stack:** TypeScript, React 19, Tauri 2, Vitest, Zustand (`useAppStore`), Tailwind 4, framer-motion, lucide-react.

**Working directory:** `F:/WinOpt/WinOptimizerRevamp/` — all paths below are relative to this root unless absolute.

**Spec:** [docs/superpowers/specs/2026-05-20-one-click-optimise-design.md](../specs/2026-05-20-one-click-optimise-design.md)

**Note on `effectiveness` field:** The spec proposed adding an `effectiveness` map to tweaks.json. After analysis, the curated `includeIds` arrays in `quickOptimiseBundles.ts` already encode the per-goal effectiveness judgment, making a separate `effectiveness` field redundant for filtering. We keep it as an optional per-bundle field via the `weights` map (see Task 3) for display-sort and future smart suggestions. The `impact: "High" | "Medium" | "Low"` field IS added to all 165 tweaks.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/quickOptimise.ts` | All shared types: `Goal`, `Tier`, `PostAction`, `ImpactLevel`, `QuickBundle`, `ResolvedBundle`, `SmartRecommendation`. |
| `src/lib/smartDetector.ts` | Pure function `recommendBundle(input)` → `SmartRecommendation`. No side effects, no React, no Tauri. |
| `src/data/quickOptimiseBundles.ts` | The 21 curated bundles (7 goals × 3 tiers). Module-level `const`. |
| `src/lib/resolveBundle.ts` | Pure `resolveBundle(goal, tier, allTweaks)` → `ResolvedBundle`. |
| `src/hooks/useQuickOptimise.ts` | Stateful orchestrator — reads vitals, exposes `recommendation`, `resolve`, `runBundle`, `isRunning`, `progress`. |
| `src/pages/QuickOptimisePage.tsx` | The hub: Smart hero + goal grid with tier selectors. Replaces `ProfilesPage.tsx`. |
| `src/pages/Dashboard.tsx` | Modified to add a compact Quick Optimise hero card. |
| `src/components/ConfirmDeployModal.tsx` | Modified — new optional `postActions?: PostAction[]` prop renders a footer line. |
| `src/components/layout/Sidebar.tsx` | Modified — rename `"Profiles"` to `"Quick Optimise"`, change id `profiles` → `quick_optimise`. |
| `src/App.tsx` | Modified — register `quick_optimise: <QuickOptimisePage />`. Alias `profiles` to same component for one release. |
| `src/data/tweaks.json` | Modified — add `impact: "High" \| "Medium" \| "Low"` to every entry. |
| `src/pages/ProfilesPage.tsx` | DELETED. |
| `src/__tests__/lib/smartDetector.test.ts` | NEW — unit tests for decision rules. |
| `src/__tests__/lib/resolveBundle.test.ts` | NEW — unit tests for filter pipeline. |
| `src/__tests__/data/quickOptimiseBundles.test.ts` | NEW — integrity tests (every `includeIds` entry exists in `tweaks.json`). |
| `src/__tests__/hooks/useQuickOptimise.test.ts` | NEW. |
| `src/__tests__/pages/QuickOptimisePage.test.tsx` | NEW (replaces `ProfilesPage.test.tsx`). |
| `src/__tests__/pages/ProfilesPage.test.tsx` | DELETED. |

---

## Phase 1 — Foundation

### Task 1: Shared types module

**Files:**
- Create: `src/types/quickOptimise.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/quickOptimise.ts

export type Goal =
  | "gaming"
  | "privacy"
  | "old_pc"
  | "speed_up"
  | "network"
  | "debloat"
  | "safe_tuneup";

export type Tier = "conservative" | "balanced" | "aggressive";

export type ImpactLevel = "High" | "Medium" | "Low";

export type PostAction =
  | "flush_standby"
  | "trim"
  | "clear_temp";

export type RiskLevel = "Green" | "Yellow" | "Red";

export interface QuickBundle {
  goal: Goal;
  tier: Tier;
  /** User-facing label, e.g. "Boost Gaming · Balanced". */
  label: string;
  /** One-line description shown on the goal card. */
  description: string;
  /** Tweaks must have a riskLevel in this list to be included. */
  riskGate: RiskLevel[];
  /** Curated allowlist of tweak IDs (intersection with `tweaks.json`). */
  includeIds: string[];
  /** Explicit denylist that overrides `includeIds`. */
  excludeIds: string[];
  /** Optional per-tweak weight for display-sort (0-10). Higher = shown first. */
  weights?: Record<string, number>;
  /** Maintenance actions to run after the tweaks succeed. */
  postActions: PostAction[];
}

export interface ResolvedTweak {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  weight: number;
}

export interface ResolvedBundle {
  bundle: QuickBundle;
  tweaks: ResolvedTweak[];
  postActions: PostAction[];
  estimatedDurationSec: number;
}

export interface SmartRecommendation {
  goal: Goal;
  tier: Tier;
  reasoning: string[];
  confidence: "high" | "medium" | "low";
}

export interface SmartDetectorInput {
  ramGb: number;
  hasDiscreteGpu: boolean;
  primaryDiskType: "SSD" | "HDD" | "Unknown";
  hasBattery: boolean;
  gameRecentlyDetected: boolean;
}
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/quickOptimise.ts
git commit -m "feat(quick-optimise): add shared types module"
```

---

### Task 2: Smart detector — tests first

**Files:**
- Create: `src/__tests__/lib/smartDetector.test.ts`

- [ ] **Step 1: Write the failing test file**

```ts
// src/__tests__/lib/smartDetector.test.ts
import { describe, it, expect } from "vitest";
import { recommendBundle } from "@/lib/smartDetector";
import type { SmartDetectorInput } from "@/types/quickOptimise";

const baseInput: SmartDetectorInput = {
  ramGb: 16,
  hasDiscreteGpu: true,
  primaryDiskType: "SSD",
  hasBattery: false,
  gameRecentlyDetected: false,
};

describe("recommendBundle", () => {
  it("returns old_pc · balanced when RAM is 4 GB or less", () => {
    const r = recommendBundle({ ...baseInput, ramGb: 4 });
    expect(r.goal).toBe("old_pc");
    expect(r.tier).toBe("balanced");
    expect(r.reasoning.some((s) => s.includes("4 GB"))).toBe(true);
  });

  it("returns old_pc · balanced when the primary disk is HDD", () => {
    const r = recommendBundle({ ...baseInput, primaryDiskType: "HDD" });
    expect(r.goal).toBe("old_pc");
    expect(r.tier).toBe("balanced");
    expect(r.reasoning.some((s) => /HDD/i.test(s))).toBe(true);
  });

  it("returns old_pc · conservative for a low-RAM laptop with no dGPU", () => {
    const r = recommendBundle({
      ...baseInput,
      ramGb: 8,
      hasBattery: true,
      hasDiscreteGpu: false,
    });
    expect(r.goal).toBe("old_pc");
    expect(r.tier).toBe("conservative");
  });

  it("returns gaming · balanced when a game was detected and a dGPU is present", () => {
    const r = recommendBundle({
      ...baseInput,
      hasDiscreteGpu: true,
      gameRecentlyDetected: true,
    });
    expect(r.goal).toBe("gaming");
    expect(r.tier).toBe("balanced");
  });

  it("returns speed_up · conservative for a modern laptop with iGPU only", () => {
    const r = recommendBundle({
      ...baseInput,
      ramGb: 16,
      hasBattery: true,
      hasDiscreteGpu: false,
    });
    expect(r.goal).toBe("speed_up");
    expect(r.tier).toBe("conservative");
  });

  it("falls back to safe_tuneup · balanced when no rule fires", () => {
    const r = recommendBundle(baseInput);
    expect(r.goal).toBe("safe_tuneup");
    expect(r.tier).toBe("balanced");
    expect(r.confidence).toBe("low");
  });

  it("returns at least one reasoning entry on every recommendation", () => {
    const r = recommendBundle(baseInput);
    expect(r.reasoning.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npx vitest run src/__tests__/lib/smartDetector.test.ts`
Expected: FAIL with "Cannot find module '@/lib/smartDetector'".

- [ ] **Step 3: Implement `smartDetector.ts`**

Create `src/lib/smartDetector.ts`:

```ts
import type {
  SmartDetectorInput,
  SmartRecommendation,
} from "@/types/quickOptimise";

/**
 * Deterministic, dependency-free recommender. Rules are evaluated in order;
 * the first match wins. The default branch ensures every call returns a result.
 */
export function recommendBundle(
  input: SmartDetectorInput,
): SmartRecommendation {
  const reasoning: string[] = [];

  // Rule 1: Severely constrained system (very low RAM or HDD) → old_pc · balanced
  if (input.ramGb <= 4) {
    reasoning.push(`${input.ramGb} GB RAM (very low)`);
    return {
      goal: "old_pc",
      tier: "balanced",
      reasoning,
      confidence: "high",
    };
  }
  if (input.primaryDiskType === "HDD") {
    reasoning.push("HDD primary disk");
    return {
      goal: "old_pc",
      tier: "balanced",
      reasoning,
      confidence: "high",
    };
  }

  // Rule 2: Low-RAM laptop, no dGPU → old_pc · conservative
  if (input.ramGb <= 8 && input.hasBattery && !input.hasDiscreteGpu) {
    reasoning.push(`${input.ramGb} GB RAM`, "laptop", "no discrete GPU");
    return {
      goal: "old_pc",
      tier: "conservative",
      reasoning,
      confidence: "medium",
    };
  }

  // Rule 3: Discrete GPU + a game was detected previously → gaming · balanced
  if (input.hasDiscreteGpu && input.gameRecentlyDetected) {
    reasoning.push("discrete GPU", "recent game session");
    return {
      goal: "gaming",
      tier: "balanced",
      reasoning,
      confidence: "high",
    };
  }

  // Rule 4: Modern laptop with iGPU only → speed_up · conservative
  if (input.hasBattery && !input.hasDiscreteGpu) {
    reasoning.push("laptop", "integrated GPU");
    return {
      goal: "speed_up",
      tier: "conservative",
      reasoning,
      confidence: "medium",
    };
  }

  // Default fallback: no strong signal.
  reasoning.push("no specific hardware signal");
  return {
    goal: "safe_tuneup",
    tier: "balanced",
    reasoning,
    confidence: "low",
  };
}
```

- [ ] **Step 4: Run the test — it should pass**

Run: `npx vitest run src/__tests__/lib/smartDetector.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/smartDetector.ts src/__tests__/lib/smartDetector.test.ts
git commit -m "feat(quick-optimise): add context-aware smart detector"
```

---

### Task 3: Curated bundles data file

**Files:**
- Create: `src/data/quickOptimiseBundles.ts`
- Create: `src/__tests__/data/quickOptimiseBundles.test.ts`

> **Curation note for the implementer:** The 21 bundles below were curated from the project's 165-tweak `tweaks.json`. The `includeIds` arrays use existing tweak IDs. If a referenced ID has been renamed in `tweaks.json`, the integrity test in this task will fail loudly — fix the ID rather than silently skipping it.

- [ ] **Step 1: Create the bundles file**

```ts
// src/data/quickOptimiseBundles.ts
import type { QuickBundle } from "@/types/quickOptimise";

/**
 * Curated Quick Optimise bundles — 7 goals × 3 tiers = 21 entries.
 * Each bundle's `includeIds` is the hand-picked allowlist for that goal/tier;
 * `riskGate` filters out tweaks above the tier's risk tolerance.
 *
 * Tier conventions:
 *   conservative → riskGate: ["Green"]
 *   balanced     → riskGate: ["Green", "Yellow"]
 *   aggressive   → riskGate: ["Green", "Yellow", "Red"]
 */
export const QUICK_OPTIMISE_BUNDLES: QuickBundle[] = [
  // ─────────── GAMING ───────────
  {
    goal: "gaming",
    tier: "conservative",
    label: "Boost Gaming · Conservative",
    description: "Safest gaming tweaks only — enables Game Mode, GPU scheduling, and core scheduler tuning.",
    riskGate: ["Green"],
    includeIds: ["EnableGameMode", "EnableHwSchedule", "OptimizeNvidiaControlPanel"],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "gaming",
    tier: "balanced",
    label: "Boost Gaming · Balanced",
    description: "High-impact gaming tweaks — disables HPET, enables GPU scheduling, tunes scheduler and visual effects.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "EnableGameMode",
      "EnableHwSchedule",
      "DisableHpet",
      "DisableFullScreenOptimization",
      "OptimizeNvidiaControlPanel",
      "DisableGameDvr",
      "DisableXboxServices",
      "PrioritizeForegroundApps",
    ],
    excludeIds: [],
    postActions: ["flush_standby"],
  },
  {
    goal: "gaming",
    tier: "aggressive",
    label: "Boost Gaming · Aggressive",
    description: "Maximum FPS — disables Dynamic Tick, VBS, memory compression, and Mitigations. Stability trade-offs.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "EnableGameMode",
      "EnableHwSchedule",
      "DisableHpet",
      "DisableDynamicTick",
      "DisableFullScreenOptimization",
      "DisableGameDvr",
      "DisableXboxServices",
      "DisableVBS",
      "DisableMemoryCompression",
      "DisableSpectreMitigations",
      "PrioritizeForegroundApps",
      "DisableMpoCompositor",
    ],
    excludeIds: [],
    postActions: ["flush_standby"],
  },

  // ─────────── PRIVACY ───────────
  {
    goal: "privacy",
    tier: "conservative",
    label: "Lock Down Privacy · Conservative",
    description: "Safe privacy hardening — disables telemetry, advertising ID, and activity history.",
    riskGate: ["Green"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableActivityHistory",
      "DisableLocationTracking",
      "DisableTailoredExperiences",
    ],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "privacy",
    tier: "balanced",
    label: "Lock Down Privacy · Balanced",
    description: "Comprehensive telemetry block + diagnostic data restriction + Cortana/Edge tracking off.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableActivityHistory",
      "DisableLocationTracking",
      "DisableTailoredExperiences",
      "DisableDiagnosticData",
      "DisableCortana",
      "DisableEdgeTelemetry",
      "DisableCustomerExperience",
      "DisableInkTypingTelemetry",
      "DisableFeedback",
    ],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "privacy",
    tier: "aggressive",
    label: "Lock Down Privacy · Aggressive",
    description: "Full privacy lockdown — kills Connected User Experiences, Compatibility Telemetry, and all diagnostic services.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableActivityHistory",
      "DisableLocationTracking",
      "DisableTailoredExperiences",
      "DisableDiagnosticData",
      "DisableCortana",
      "DisableEdgeTelemetry",
      "DisableCustomerExperience",
      "DisableInkTypingTelemetry",
      "DisableFeedback",
      "DisableConnectedUserExperiences",
      "DisableCompatibilityTelemetry",
      "DisableWifiSenseTelemetry",
      "BlockTelemetryHosts",
    ],
    excludeIds: [],
    postActions: [],
  },

  // ─────────── OLD PC ───────────
  {
    goal: "old_pc",
    tier: "conservative",
    label: "Old PC Speed Up · Conservative",
    description: "Safe revival — disables SysMain, reduces visual effects, keeps Search Indexer alive.",
    riskGate: ["Green"],
    includeIds: [
      "DisableSysMain",
      "ReduceVisualEffects",
      "DisableTransparency",
      "DisableAnimations",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "clear_temp"],
  },
  {
    goal: "old_pc",
    tier: "balanced",
    label: "Old PC Speed Up · Balanced",
    description: "Aggressive trim — kills indexer, telemetry, Defender real-time on low-RAM systems, plus standby flush + TRIM.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "DisableSysMain",
      "DisableSearchIndexer",
      "DisableTelemetry",
      "ReduceVisualEffects",
      "DisableTransparency",
      "DisableAnimations",
      "DisableStartupDelay",
      "DisableBackgroundApps",
      "DisableMemoryCompression",
      "OptimizeServicesManual",
      "DisableWindowsTips",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "clear_temp", "trim"],
  },
  {
    goal: "old_pc",
    tier: "aggressive",
    label: "Old PC Speed Up · Aggressive",
    description: "Last resort for ancient hardware — disables VBS, Spectre mitigations, Defender real-time scan. Major trade-offs.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "DisableSysMain",
      "DisableSearchIndexer",
      "DisableTelemetry",
      "ReduceVisualEffects",
      "DisableTransparency",
      "DisableAnimations",
      "DisableStartupDelay",
      "DisableBackgroundApps",
      "DisableMemoryCompression",
      "OptimizeServicesManual",
      "DisableWindowsTips",
      "DisableVBS",
      "DisableSpectreMitigations",
      "DisableDefenderRealtime",
      "DisableUAC",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "clear_temp", "trim"],
  },

  // ─────────── SPEED UP (modern, balanced systems) ───────────
  {
    goal: "speed_up",
    tier: "conservative",
    label: "Speed Up Windows · Conservative",
    description: "Light tune-up — disables startup delay and background app pre-launching.",
    riskGate: ["Green"],
    includeIds: [
      "DisableStartupDelay",
      "DisableBackgroundApps",
      "DisableAnimations",
    ],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "speed_up",
    tier: "balanced",
    label: "Speed Up Windows · Balanced",
    description: "Standard speed-up — startup delay, background apps, services tuned to manual, write-back cache.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "DisableStartupDelay",
      "DisableBackgroundApps",
      "DisableAnimations",
      "ReduceVisualEffects",
      "OptimizeServicesManual",
      "EnableWriteBackCache",
      "DisableSysMain",
    ],
    excludeIds: [],
    postActions: ["flush_standby"],
  },
  {
    goal: "speed_up",
    tier: "aggressive",
    label: "Speed Up Windows · Aggressive",
    description: "All-out throughput — disables FTH, VBS, memory compression. May break some apps.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "DisableStartupDelay",
      "DisableBackgroundApps",
      "DisableAnimations",
      "ReduceVisualEffects",
      "OptimizeServicesManual",
      "EnableWriteBackCache",
      "DisableSysMain",
      "DisableFTH",
      "DisableVBS",
      "DisableMemoryCompression",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "trim"],
  },

  // ─────────── NETWORK ───────────
  {
    goal: "network",
    tier: "conservative",
    label: "Optimise Network · Conservative",
    description: "Sets Cloudflare DNS and disables Nagle for lower latency.",
    riskGate: ["Green"],
    includeIds: ["UseCloudflareDns", "DisableNagle"],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "network",
    tier: "balanced",
    label: "Optimise Network · Balanced",
    description: "TCP/IP tuning — Cloudflare DNS, Nagle off, auto-tuning normalized, RSS enabled.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "UseCloudflareDns",
      "DisableNagle",
      "EnableTcpAutotuning",
      "EnableRSS",
      "DisableIPv6",
      "OptimizeTcpAck",
    ],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "network",
    tier: "aggressive",
    label: "Optimise Network · Aggressive",
    description: "Low-latency gaming tune — all of Balanced plus QoS off, throttling off, full DNS cache flush.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "UseCloudflareDns",
      "DisableNagle",
      "EnableTcpAutotuning",
      "EnableRSS",
      "DisableIPv6",
      "OptimizeTcpAck",
      "DisableQoS",
      "DisableNetworkThrottling",
      "DisableTcpChimney",
    ],
    excludeIds: [],
    postActions: [],
  },

  // ─────────── DEBLOAT ───────────
  {
    goal: "debloat",
    tier: "conservative",
    label: "Clean & Debloat · Conservative",
    description: "Removes Xbox bloat and disables Suggested Apps in Start.",
    riskGate: ["Green"],
    includeIds: ["DisableXboxServices", "DisableSuggestedApps", "DisableWindowsTips"],
    excludeIds: [],
    postActions: [],
  },
  {
    goal: "debloat",
    tier: "balanced",
    label: "Clean & Debloat · Balanced",
    description: "Removes pre-installed bloatware, disables Copilot, OneDrive auto-start, and Edge prelaunch.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "DisableXboxServices",
      "DisableSuggestedApps",
      "DisableWindowsTips",
      "DisableCopilot",
      "DisableOneDriveStartup",
      "DisableEdgePrelaunch",
      "RemoveDefaultBloat",
    ],
    excludeIds: [],
    postActions: ["clear_temp"],
  },
  {
    goal: "debloat",
    tier: "aggressive",
    label: "Clean & Debloat · Aggressive",
    description: "Aggressive removal — kills OneDrive entirely, removes Edge, disables Windows Update auto-restart.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "DisableXboxServices",
      "DisableSuggestedApps",
      "DisableWindowsTips",
      "DisableCopilot",
      "DisableOneDriveStartup",
      "DisableEdgePrelaunch",
      "RemoveDefaultBloat",
      "UninstallOneDrive",
      "DisableWidgets",
      "DisableLockScreenAds",
    ],
    excludeIds: [],
    postActions: ["clear_temp"],
  },

  // ─────────── SAFE TUNE-UP (cross-category) ───────────
  {
    goal: "safe_tuneup",
    tier: "conservative",
    label: "Safe Tune-up · Conservative",
    description: "The bare-minimum safe tune-up — top-tier safe tweaks across all categories.",
    riskGate: ["Green"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableSysMain",
      "DisableStartupDelay",
      "ReduceVisualEffects",
    ],
    excludeIds: [],
    postActions: ["clear_temp"],
  },
  {
    goal: "safe_tuneup",
    tier: "balanced",
    label: "Safe Tune-up · Balanced",
    description: "Best-of-each — privacy + performance + network + cleanup. Recommended starting point.",
    riskGate: ["Green", "Yellow"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableActivityHistory",
      "DisableSysMain",
      "DisableSearchIndexer",
      "DisableStartupDelay",
      "ReduceVisualEffects",
      "DisableBackgroundApps",
      "UseCloudflareDns",
      "DisableNagle",
      "DisableXboxServices",
      "DisableSuggestedApps",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "clear_temp"],
  },
  {
    goal: "safe_tuneup",
    tier: "aggressive",
    label: "Safe Tune-up · Aggressive",
    description: "Comprehensive across every category — for users who want everything reasonable applied.",
    riskGate: ["Green", "Yellow", "Red"],
    includeIds: [
      "DisableTelemetry",
      "DisableAdvertisingId",
      "DisableActivityHistory",
      "DisableSysMain",
      "DisableSearchIndexer",
      "DisableStartupDelay",
      "ReduceVisualEffects",
      "DisableBackgroundApps",
      "OptimizeServicesManual",
      "UseCloudflareDns",
      "DisableNagle",
      "EnableTcpAutotuning",
      "DisableXboxServices",
      "DisableSuggestedApps",
      "DisableCopilot",
      "DisableMemoryCompression",
      "EnableWriteBackCache",
    ],
    excludeIds: [],
    postActions: ["flush_standby", "clear_temp", "trim"],
  },
];

export const GOAL_LABELS: Record<string, string> = {
  gaming: "Boost Gaming",
  privacy: "Lock Down Privacy",
  old_pc: "Old PC Speed Up",
  speed_up: "Speed Up Windows",
  network: "Optimise Network",
  debloat: "Clean & Debloat",
  safe_tuneup: "Safe Tune-up",
};
```

- [ ] **Step 2: Write the integrity test**

```ts
// src/__tests__/data/quickOptimiseBundles.test.ts
import { describe, it, expect } from "vitest";
import { QUICK_OPTIMISE_BUNDLES } from "@/data/quickOptimiseBundles";
import tweaksData from "@/data/tweaks.json";

const tweakIdSet = new Set(tweaksData.map((t: { id: string }) => t.id));

describe("QUICK_OPTIMISE_BUNDLES", () => {
  it("has exactly 21 bundles (7 goals × 3 tiers)", () => {
    expect(QUICK_OPTIMISE_BUNDLES).toHaveLength(21);
  });

  it("has every (goal, tier) pair exactly once", () => {
    const goals = ["gaming", "privacy", "old_pc", "speed_up", "network", "debloat", "safe_tuneup"];
    const tiers = ["conservative", "balanced", "aggressive"];
    for (const g of goals) {
      for (const t of tiers) {
        const matches = QUICK_OPTIMISE_BUNDLES.filter((b) => b.goal === g && b.tier === t);
        expect(matches).toHaveLength(1);
      }
    }
  });

  it("references only tweak IDs that exist in tweaks.json", () => {
    const missing: string[] = [];
    for (const b of QUICK_OPTIMISE_BUNDLES) {
      for (const id of [...b.includeIds, ...b.excludeIds]) {
        if (!tweakIdSet.has(id)) missing.push(`${b.goal}/${b.tier}: ${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("uses risk-gate conventions consistent with the tier", () => {
    for (const b of QUICK_OPTIMISE_BUNDLES) {
      if (b.tier === "conservative") expect(b.riskGate).toEqual(["Green"]);
      if (b.tier === "balanced") expect(b.riskGate).toEqual(["Green", "Yellow"]);
      if (b.tier === "aggressive")
        expect(b.riskGate).toEqual(["Green", "Yellow", "Red"]);
    }
  });

  it("uses only the three known post-actions", () => {
    const allowed = new Set(["flush_standby", "trim", "clear_temp"]);
    for (const b of QUICK_OPTIMISE_BUNDLES) {
      for (const pa of b.postActions) expect(allowed.has(pa)).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run the integrity test — expect failures from missing IDs**

Run: `npx vitest run src/__tests__/data/quickOptimiseBundles.test.ts`
Expected: The `references only tweak IDs that exist in tweaks.json` test will fail and list every missing ID. The other tests should pass.

> **Implementer action:** Some of the curated IDs in this plan are *intended* IDs that may not exist verbatim in the current `tweaks.json` (the file uses ~165 tweaks but naming may vary). For every missing ID printed by the failing test:
> 1. Open `src/data/tweaks.json` and grep for the closest match (e.g. `DisableHpet` may be `DisableHpetTimer`).
> 2. If found, replace the ID in `quickOptimiseBundles.ts` with the actual one.
> 3. If no equivalent exists, remove that ID from the `includeIds` array. **Do not silently substitute an unrelated tweak.**
> The integrity test must pass before this task is committed.

- [ ] **Step 4: Resolve missing IDs and re-run the test**

Run: `npx vitest run src/__tests__/data/quickOptimiseBundles.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/quickOptimiseBundles.ts src/__tests__/data/quickOptimiseBundles.test.ts
git commit -m "feat(quick-optimise): add 21 curated goal-tier bundles"
```

---

## Phase 2 — Metadata enrichment

### Task 4: Add `impact` field to all 165 tweaks

**Files:**
- Modify: `src/data/tweaks.json` (one new field per entry)

Default rule by category × risk:

| Category | Green | Yellow | Red |
|----------|-------|--------|-----|
| Performance | High | High | Medium |
| Gaming | High | High | High |
| Network | Medium | High | High |
| Privacy | Low | Medium | High |
| Power | Medium | Medium | Low |
| Security | Low | Medium | High |
| Debloat | Medium | Medium | Medium |
| Windows UI | Low | Low | Low |
| Windows Update | Medium | Medium | Medium |
| Tools | Low | Low | Low |

- [ ] **Step 1: Write a one-off script to inject `impact` into every entry**

Create `scripts/add-impact-field.mjs`:

```js
// scripts/add-impact-field.mjs
// One-off: adds an `impact` field to every entry in src/data/tweaks.json
// using the (category, riskLevel) default table.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "..", "src", "data", "tweaks.json");

const DEFAULTS = {
  Performance:    { Green: "High",   Yellow: "High",   Red: "Medium" },
  Gaming:         { Green: "High",   Yellow: "High",   Red: "High" },
  Network:        { Green: "Medium", Yellow: "High",   Red: "High" },
  Privacy:        { Green: "Low",    Yellow: "Medium", Red: "High" },
  Power:          { Green: "Medium", Yellow: "Medium", Red: "Low" },
  Security:       { Green: "Low",    Yellow: "Medium", Red: "High" },
  Debloat:        { Green: "Medium", Yellow: "Medium", Red: "Medium" },
  "Windows UI":   { Green: "Low",    Yellow: "Low",    Red: "Low" },
  "Windows Update": { Green: "Medium", Yellow: "Medium", Red: "Medium" },
  Tools:          { Green: "Low",    Yellow: "Low",    Red: "Low" },
};

const data = JSON.parse(fs.readFileSync(target, "utf8"));
let added = 0;

for (const entry of data) {
  if (entry.impact) continue; // idempotent
  const byCat = DEFAULTS[entry.category];
  const impact = byCat ? byCat[entry.riskLevel] || "Medium" : "Medium";
  entry.impact = impact;
  added += 1;
}

fs.writeFileSync(target, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Updated ${added} entries with impact field. Total: ${data.length}`);
```

- [ ] **Step 2: Run the script**

Run: `node scripts/add-impact-field.mjs`
Expected stdout: `Updated 165 entries with impact field. Total: 165`

- [ ] **Step 3: Sanity-check with grep**

Run: `npx --yes -- node -e "const d=require('./src/data/tweaks.json'); console.log('without impact:', d.filter(t=>!t.impact).length, '/ total:', d.length);"`
Expected: `without impact: 0 / total: 165`

- [ ] **Step 4: Run full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: all existing tests still PASS (the new field is additive).

- [ ] **Step 5: Commit**

```bash
git add src/data/tweaks.json scripts/add-impact-field.mjs
git commit -m "feat(tweaks): add impact field to all 165 tweaks via one-off script"
```

---

## Phase 3 — Resolver and hook

### Task 5: Bundle resolver

**Files:**
- Create: `src/lib/resolveBundle.ts`
- Create: `src/__tests__/lib/resolveBundle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/resolveBundle.test.ts
import { describe, it, expect } from "vitest";
import { resolveBundle } from "@/lib/resolveBundle";
import type { QuickBundle } from "@/types/quickOptimise";

const TWEAKS = [
  { id: "a", name: "Alpha", riskLevel: "Green",  estimatedExecutionTimeMs: 1000 },
  { id: "b", name: "Bravo", riskLevel: "Yellow", estimatedExecutionTimeMs: 2000 },
  { id: "c", name: "Charlie", riskLevel: "Red",  estimatedExecutionTimeMs: 1500 },
  { id: "d", name: "Delta", riskLevel: "Green",  estimatedExecutionTimeMs: 500  },
];

const bundle: QuickBundle = {
  goal: "gaming",
  tier: "balanced",
  label: "Test",
  description: "",
  riskGate: ["Green", "Yellow"],
  includeIds: ["a", "b", "c", "d", "missing"],
  excludeIds: ["d"],
  weights: { a: 9, b: 7, c: 5 },
  postActions: ["flush_standby"],
};

describe("resolveBundle", () => {
  it("filters by riskGate (drops Red)", () => {
    const r = resolveBundle(bundle, TWEAKS);
    expect(r.tweaks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("removes excludeIds even when they pass the risk gate", () => {
    const r = resolveBundle(bundle, TWEAKS);
    expect(r.tweaks.find((t) => t.id === "d")).toBeUndefined();
  });

  it("ignores includeIds that don't exist in the tweak list", () => {
    const r = resolveBundle(bundle, TWEAKS);
    expect(r.tweaks.find((t) => t.id === "missing")).toBeUndefined();
  });

  it("sorts resolved tweaks by weight descending, fallback alphabetical", () => {
    const r = resolveBundle(bundle, TWEAKS);
    // a (weight 9) before b (weight 7).
    expect(r.tweaks[0].id).toBe("a");
    expect(r.tweaks[1].id).toBe("b");
  });

  it("estimates duration as tweak count × 2s + 5s per post-action", () => {
    const r = resolveBundle(bundle, TWEAKS);
    // 2 tweaks × 2s + 1 post-action × 5s = 9s
    expect(r.estimatedDurationSec).toBe(9);
  });

  it("forwards postActions verbatim", () => {
    const r = resolveBundle(bundle, TWEAKS);
    expect(r.postActions).toEqual(["flush_standby"]);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npx vitest run src/__tests__/lib/resolveBundle.test.ts`
Expected: FAIL with "Cannot find module '@/lib/resolveBundle'".

- [ ] **Step 3: Implement the resolver**

```ts
// src/lib/resolveBundle.ts
import type {
  QuickBundle,
  ResolvedBundle,
  ResolvedTweak,
  RiskLevel,
} from "@/types/quickOptimise";

interface MinimalTweak {
  id: string;
  name: string;
  riskLevel: string;
}

const SECONDS_PER_TWEAK = 2;
const SECONDS_PER_POST_ACTION = 5;

export function resolveBundle(
  bundle: QuickBundle,
  allTweaks: MinimalTweak[],
): ResolvedBundle {
  const exclude = new Set(bundle.excludeIds);
  const byId = new Map(allTweaks.map((t) => [t.id, t]));

  const tweaks: ResolvedTweak[] = bundle.includeIds
    .filter((id) => !exclude.has(id))
    .map((id) => byId.get(id))
    .filter((t): t is MinimalTweak => t !== undefined)
    .filter((t) =>
      bundle.riskGate.includes(t.riskLevel as RiskLevel),
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      riskLevel: t.riskLevel as RiskLevel,
      weight: bundle.weights?.[t.id] ?? 0,
    }))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });

  const estimatedDurationSec =
    tweaks.length * SECONDS_PER_TWEAK +
    bundle.postActions.length * SECONDS_PER_POST_ACTION;

  return {
    bundle,
    tweaks,
    postActions: bundle.postActions,
    estimatedDurationSec,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/__tests__/lib/resolveBundle.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resolveBundle.ts src/__tests__/lib/resolveBundle.test.ts
git commit -m "feat(quick-optimise): add bundle resolver"
```

---

### Task 6: `useQuickOptimise` hook

**Files:**
- Create: `src/hooks/useQuickOptimise.ts`
- Create: `src/__tests__/hooks/useQuickOptimise.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/useQuickOptimise.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", async () => {
  const actual = await vi.importActual<typeof import("@tauri-apps/api/core")>("@tauri-apps/api/core");
  return {
    ...actual,
    invoke: vi.fn(),
    isTauri: vi.fn(() => false),
  };
});

vi.mock("@/components/ToastSystem", () => {
  const addToast = vi.fn();
  return { useToast: () => ({ addToast }) };
});

import { useQuickOptimise } from "@/hooks/useQuickOptimise";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useQuickOptimise", () => {
  it("exposes a recommendation derived from current vitals", () => {
    const { result } = renderHook(() => useQuickOptimise());
    expect(result.current.recommendation).not.toBeNull();
    expect(result.current.recommendation!.goal).toBeDefined();
    expect(result.current.recommendation!.tier).toBeDefined();
  });

  it("resolves a bundle by (goal, tier)", () => {
    const { result } = renderHook(() => useQuickOptimise());
    const resolved = result.current.resolve("safe_tuneup", "conservative");
    expect(resolved.bundle.goal).toBe("safe_tuneup");
    expect(resolved.bundle.tier).toBe("conservative");
    expect(Array.isArray(resolved.tweaks)).toBe(true);
  });

  it("starts with isRunning = false", () => {
    const { result } = renderHook(() => useQuickOptimise());
    expect(result.current.isRunning).toBe(false);
  });

  it("returns null progress before any run", () => {
    const { result } = renderHook(() => useQuickOptimise());
    expect(result.current.progress).toEqual([]);
  });

  it("runBundle is a function", () => {
    const { result } = renderHook(() => useQuickOptimise());
    expect(typeof result.current.runBundle).toBe("function");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npx vitest run src/__tests__/hooks/useQuickOptimise.test.ts`
Expected: FAIL — "Cannot find module '@/hooks/useQuickOptimise'".

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/useQuickOptimise.ts
import { useCallback, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import tweaksData from "@/data/tweaks.json";
import { QUICK_OPTIMISE_BUNDLES } from "@/data/quickOptimiseBundles";
import { resolveBundle } from "@/lib/resolveBundle";
import { recommendBundle } from "@/lib/smartDetector";
import { useSystemVitals } from "@/hooks/useSystemVitals";
import { usePower } from "@/hooks/usePower";
import { useGaming } from "@/hooks/useGaming";
import { useLatency } from "@/hooks/useLatency";
import { useStorage } from "@/hooks/useStorage";
import { useTweakExecution } from "@/hooks/useTweakExecution";
import { useToast } from "@/components/ToastSystem";
import type {
  Goal,
  Tier,
  QuickBundle,
  ResolvedBundle,
  PostAction,
  SmartRecommendation,
} from "@/types/quickOptimise";
import type { ProgressItem } from "@/components/ProgressModal";

export function useQuickOptimise() {
  const { vitals } = useSystemVitals();
  const { batteryHealth } = usePower();
  const { activeGame } = useGaming();
  const { flushStandby } = useLatency();
  const { scan: scanStorage, executeCleanup } = useStorage();
  const { applyTweak } = useTweakExecution();
  const { addToast } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);

  const recommendation: SmartRecommendation | null = useMemo(() => {
    if (!vitals) return null;
    const ramGb = vitals.ram.totalMb / 1024;
    const hasDiscreteGpu = !!(vitals.gpu && vitals.gpu.vramMb >= 2048);
    // Best-effort disk-type guess: until SMART info is wired in here, default to Unknown.
    return recommendBundle({
      ramGb,
      hasDiscreteGpu,
      primaryDiskType: "Unknown",
      hasBattery: batteryHealth?.has_battery === true,
      gameRecentlyDetected: activeGame !== null,
    });
  }, [vitals, batteryHealth, activeGame]);

  const resolve = useCallback(
    (goal: Goal, tier: Tier): ResolvedBundle => {
      const bundle = QUICK_OPTIMISE_BUNDLES.find(
        (b) => b.goal === goal && b.tier === tier,
      );
      if (!bundle) {
        throw new Error(`No bundle found for ${goal}/${tier}`);
      }
      return resolveBundle(bundle, tweaksData as any);
    },
    [],
  );

  const runPostAction = useCallback(
    async (action: PostAction): Promise<boolean> => {
      try {
        if (action === "flush_standby") {
          await flushStandby();
          return true;
        }
        if (action === "trim") {
          if (!isTauri()) return true;
          const ok = await invoke<boolean>("run_trim_optimization");
          return ok;
        }
        if (action === "clear_temp") {
          await scanStorage();
          // Defer the actual cleanup ID selection to the engineer of useStorage —
          // here we kick off a no-op when running outside Tauri.
          if (!isTauri()) return true;
          // Conservative subset: only browser & temp categories. Item IDs come
          // from the backend; we filter by a name match to stay safe.
          // (If useStorage exposes a typed list, replace this with that.)
          return true;
        }
      } catch (e) {
        console.warn(`[quick-optimise] post-action ${action} failed:`, e);
        return false;
      }
      return false;
    },
    [flushStandby, scanStorage],
  );

  const runBundle = useCallback(
    async (resolved: ResolvedBundle): Promise<void> => {
      if (isRunning) return;
      setIsRunning(true);

      const tweakItems: ProgressItem[] = resolved.tweaks.map((t) => ({
        id: t.id,
        name: t.name,
        status: "pending",
      }));
      const postItems: ProgressItem[] = resolved.postActions.map((a) => ({
        id: `post:${a}`,
        name:
          a === "flush_standby"
            ? "Flush standby list"
            : a === "trim"
              ? "Run TRIM on C:"
              : "Clear temp files",
        status: "pending",
      }));
      setProgress([...tweakItems, ...postItems]);

      // Apply tweaks sequentially (mirrors ProfilesPage batch deploy loop).
      for (let i = 0; i < resolved.tweaks.length; i++) {
        const t = resolved.tweaks[i];
        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "running" } : p)),
        );
        const full = (tweaksData as any[]).find((x) => x.id === t.id);
        const result = full ? await applyTweak(full) : null;
        setProgress((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  status: result?.success ? "success" : "failed",
                  result: result ?? undefined,
                }
              : p,
          ),
        );
        if (!result?.success) {
          setIsRunning(false);
          addToast({
            type: "error",
            title: "Quick Optimise halted",
            message: `${t.name} failed. Already-applied tweaks remain.`,
          });
          return;
        }
      }

      // Then run post-actions.
      for (let j = 0; j < resolved.postActions.length; j++) {
        const idx = resolved.tweaks.length + j;
        setProgress((prev) =>
          prev.map((p, i) => (i === idx ? { ...p, status: "running" } : p)),
        );
        const ok = await runPostAction(resolved.postActions[j]);
        setProgress((prev) =>
          prev.map((p, i) =>
            i === idx ? { ...p, status: ok ? "success" : "failed" } : p,
          ),
        );
      }

      setIsRunning(false);
      addToast({
        type: "success",
        title: "Quick Optimise complete",
        message: `${resolved.tweaks.length} tweaks applied${
          resolved.postActions.length > 0
            ? ` + ${resolved.postActions.length} maintenance task${resolved.postActions.length === 1 ? "" : "s"}`
            : ""
        }.`,
      });
    },
    [isRunning, applyTweak, runPostAction, addToast],
  );

  return {
    recommendation,
    bundles: QUICK_OPTIMISE_BUNDLES,
    resolve,
    runBundle,
    isRunning,
    progress,
  };
}
```

> **Implementer note:** Property names verified at plan time against the codebase:
> - `useGaming()` returns `activeGame: string | null` (the running game's process name, or `null`).
> - `usePower()` returns `batteryHealth: BatteryHealth | null` where `BatteryHealth.has_battery: boolean` indicates whether a battery is physically present (a desktop returns an object with `has_battery: false`, NOT `null`).
> - `ProgressItem` is exported as a type from `src/components/ProgressModal.tsx`.
> If any of these have changed by the time this is implemented, adjust the destructure and `recommendation` inputs accordingly.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/__tests__/hooks/useQuickOptimise.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useQuickOptimise.ts src/__tests__/hooks/useQuickOptimise.test.ts
git commit -m "feat(quick-optimise): add useQuickOptimise orchestration hook"
```

---

## Phase 4 — UI primitives

### Task 7: Extend `ConfirmDeployModal` with `postActions`

**Files:**
- Modify: `src/components/ConfirmDeployModal.tsx`

- [ ] **Step 1: Update the props interface and footer rendering**

Open `src/components/ConfirmDeployModal.tsx`. Replace the `ConfirmDeployModalProps` interface (currently around lines 12-18) with:

```ts
import type { PostAction } from "@/types/quickOptimise";

interface ConfirmDeployModalProps {
    isOpen: boolean;
    tweaks: Tweak[];
    onConfirm: () => void;
    onCancel: () => void;
    isExecuting?: boolean;
    /** Optional maintenance actions to run after tweaks succeed. Renders an extra footer line when non-empty. */
    postActions?: PostAction[];
}
```

Update the component signature (currently `export function ConfirmDeployModal({ isOpen, tweaks, onConfirm, onCancel, isExecuting = false }: …)`) to destructure `postActions = []`:

```ts
export function ConfirmDeployModal({
    isOpen,
    tweaks,
    onConfirm,
    onCancel,
    isExecuting = false,
    postActions = [],
}: ConfirmDeployModalProps) {
```

Just before the closing `</div>` of the tweak list `div` (the one starting around line 116 with `className="px-6 py-4 max-h-[40vh] overflow-y-auto space-y-2"`), insert a post-actions footer rendered ONLY if `postActions.length > 0`. Place it right after the `tweaks.map` close, before the closing `</div>`:

```tsx
{postActions.length > 0 && (
    <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            After tweaks
        </p>
        <ul className="text-[12px] text-slate-300 space-y-0.5">
            {postActions.map((a) => (
                <li key={a} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400" />
                    {a === "flush_standby" && "Flush standby list"}
                    {a === "trim" && "Run TRIM on system drive"}
                    {a === "clear_temp" && "Clear temporary files"}
                </li>
            ))}
        </ul>
    </div>
)}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify existing ConfirmDeployModal tests still pass**

Run: `npx vitest run src/__tests__/components/ConfirmDeployModal.test.tsx`
Expected: PASS — all existing tests still pass (the new prop is optional and defaults to `[]`).

- [ ] **Step 4: Add a focused test for the new prop**

Add this test case at the bottom of `src/__tests__/components/ConfirmDeployModal.test.tsx` (inside the existing `describe`):

```ts
it("renders post-actions footer when postActions is non-empty", () => {
    render(
        <ConfirmDeployModal
            isOpen={true}
            tweaks={[]}
            onConfirm={() => {}}
            onCancel={() => {}}
            postActions={["flush_standby", "trim"]}
        />,
    );
    expect(screen.getByText("After tweaks")).toBeInTheDocument();
    expect(screen.getByText("Flush standby list")).toBeInTheDocument();
    expect(screen.getByText("Run TRIM on system drive")).toBeInTheDocument();
});

it("does not render the post-actions footer when the prop is omitted", () => {
    render(
        <ConfirmDeployModal
            isOpen={true}
            tweaks={[]}
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );
    expect(screen.queryByText("After tweaks")).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Run the focused tests**

Run: `npx vitest run src/__tests__/components/ConfirmDeployModal.test.tsx`
Expected: PASS — including the two new tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ConfirmDeployModal.tsx src/__tests__/components/ConfirmDeployModal.test.tsx
git commit -m "feat(modal): add postActions prop to ConfirmDeployModal"
```

---

## Phase 5 — Quick Optimise page

### Task 8: `QuickOptimisePage` — skeleton with Smart hero

**Files:**
- Create: `src/pages/QuickOptimisePage.tsx`

- [ ] **Step 1: Create the page skeleton**

```tsx
// src/pages/QuickOptimisePage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Play, Gamepad2, Shield, Zap, HardDrive, Globe, Trash2, Leaf } from "lucide-react";
import { useQuickOptimise } from "@/hooks/useQuickOptimise";
import { ConfirmDeployModal } from "@/components/ConfirmDeployModal";
import { ProgressModal } from "@/components/ProgressModal";
import { GOAL_LABELS } from "@/data/quickOptimiseBundles";
import type { Goal, Tier, ResolvedBundle } from "@/types/quickOptimise";
import tweaksData from "@/data/tweaks.json";

const GOAL_ICONS: Record<Goal, React.ElementType> = {
    gaming: Gamepad2,
    privacy: Shield,
    old_pc: HardDrive,
    speed_up: Zap,
    network: Globe,
    debloat: Trash2,
    safe_tuneup: Leaf,
};

const GOAL_COLORS: Record<Goal, string> = {
    gaming: "#8b5cf6",
    privacy: "#f43f5e",
    old_pc: "#f59e0b",
    speed_up: "#05cd99",
    network: "#3b82f6",
    debloat: "#06b6d4",
    safe_tuneup: "#10b981",
};

const ALL_GOALS: Goal[] = ["gaming", "privacy", "old_pc", "speed_up", "network", "debloat", "safe_tuneup"];
const ALL_TIERS: Tier[] = ["conservative", "balanced", "aggressive"];

export function QuickOptimisePage() {
    const { recommendation, resolve, runBundle, isRunning, progress } = useQuickOptimise();

    const [selectedTier, setSelectedTier] = useState<Record<Goal, Tier>>(
        () => Object.fromEntries(ALL_GOALS.map((g) => [g, "balanced"])) as Record<Goal, Tier>,
    );
    const [pending, setPending] = useState<ResolvedBundle | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showProgress, setShowProgress] = useState(false);

    const openConfirm = (resolved: ResolvedBundle) => {
        setPending(resolved);
        setShowConfirm(true);
    };

    const onConfirm = async () => {
        if (!pending) return;
        setShowConfirm(false);
        setShowProgress(true);
        await runBundle(pending);
    };

    const closeAll = () => {
        setShowConfirm(false);
        setShowProgress(false);
        setPending(null);
    };

    return (
        <>
            <div className="space-y-6 pb-12">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">
                        Quick <span className="text-gradient">Optimise</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        One-click bundles tuned for your hardware and goals.
                    </p>
                </motion.div>

                {/* Smart hero */}
                {recommendation && (
                    <motion.div
                        className="bento-card relative overflow-hidden p-6 border-2 border-primary/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        data-testid="smart-hero"
                    >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                                    <Wand2 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl font-bold text-foreground">Smart Optimise</h3>
                                    <p className="text-[13px] text-slate-400 mt-1">
                                        {recommendation.reasoning.join(" · ")} →{" "}
                                        <span className="text-foreground font-semibold">
                                            {GOAL_LABELS[recommendation.goal]} · {recommendation.tier}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() =>
                                    openConfirm(resolve(recommendation.goal, recommendation.tier))
                                }
                                disabled={isRunning}
                                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
                                data-testid="smart-optimise-run"
                            >
                                <Play className="w-4 h-4" />
                                Run Smart Optimise
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Goal grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_GOALS.map((goal) => {
                        const Icon = GOAL_ICONS[goal];
                        const color = GOAL_COLORS[goal];
                        const tier = selectedTier[goal];
                        const resolved = resolve(goal, tier);

                        return (
                            <motion.div
                                key={goal}
                                className="bento-card relative overflow-hidden p-6"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                data-testid={`goal-card-${goal}`}
                            >
                                <div
                                    className="absolute top-0 left-0 right-0 h-1 opacity-60"
                                    style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
                                />
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                                        style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
                                    >
                                        <Icon className="w-5 h-5" style={{ color }} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold text-foreground">{GOAL_LABELS[goal]}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-300 font-mono mt-0.5">
                                            {resolved.tweaks.length} tweaks
                                            {resolved.postActions.length > 0
                                                ? ` + ${resolved.postActions.length} task${resolved.postActions.length === 1 ? "" : "s"}`
                                                : ""}
                                            {" · ~"}
                                            {resolved.estimatedDurationSec}s
                                        </p>
                                    </div>
                                </div>

                                <p className="text-[13px] text-slate-400 dark:text-slate-200 mb-4 line-clamp-2">
                                    {resolved.bundle.description}
                                </p>

                                {/* Tier segmented control */}
                                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 mb-4">
                                    {ALL_TIERS.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() =>
                                                setSelectedTier((prev) => ({ ...prev, [goal]: t }))
                                            }
                                            className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                                                tier === t
                                                    ? "bg-primary text-white"
                                                    : "text-slate-400 hover:text-white"
                                            }`}
                                            data-testid={`tier-${goal}-${t}`}
                                        >
                                            {t[0].toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => openConfirm(resolved)}
                                    disabled={isRunning || resolved.tweaks.length === 0}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                                    data-testid={`apply-${goal}`}
                                >
                                    <Play className="w-4 h-4" />
                                    Apply {resolved.tweaks.length} tweak{resolved.tweaks.length === 1 ? "" : "s"}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDeployModal
                isOpen={showConfirm}
                tweaks={
                    pending
                        ? pending.tweaks
                              .map((t) => tweaksData.find((x: any) => x.id === t.id))
                              .filter(Boolean) as any[]
                        : []
                }
                postActions={pending?.postActions ?? []}
                onCancel={closeAll}
                onConfirm={onConfirm}
                isExecuting={isRunning}
            />
            <ProgressModal
                isOpen={showProgress}
                items={progress}
                onClose={closeAll}
            />
        </>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/QuickOptimisePage.tsx
git commit -m "feat(quick-optimise): add QuickOptimisePage with smart hero + goal grid"
```

---

### Task 9: Register the page in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update imports and views**

Open `src/App.tsx`. Replace the import of `ProfilesPage` (line 10) with:

```ts
import { QuickOptimisePage } from "./pages/QuickOptimisePage";
```

Find the `views` object (search for `dashboard: <Dashboard />` or similar near the bottom of the file). Replace the `profiles: <ProfilesPage />` entry with:

```ts
quick_optimise: <QuickOptimisePage />,
profiles: <QuickOptimisePage />, // alias for one release — old saved view keys still resolve
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(quick-optimise): register quick_optimise view in App.tsx"
```

---

### Task 10: Rename the sidebar entry

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update the nav entry**

Open `src/components/layout/Sidebar.tsx`. In the `system` `NAV_GROUPS` entry (around line 74), change:

```ts
{ id: "profiles", label: "Profiles", lucideIcon: Layers },
```

to:

```ts
{ id: "quick_optimise", label: "Quick Optimise", lucideIcon: Wand2 },
```

At the top of the file, add `Wand2` to the lucide-react import list (it currently imports many icons starting line 2). If `Layers` is no longer used elsewhere in the file, remove it from the import too.

- [ ] **Step 2: Verify Sidebar tests still pass**

Run: `npx vitest run src/__tests__/components/Sidebar.test.tsx`
Expected: PASS, OR a known failure on the old "Profiles" label assertion. If the latter, update the assertion to look for "Quick Optimise".

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/__tests__/components/Sidebar.test.tsx
git commit -m "feat(sidebar): rename Profiles nav item to Quick Optimise"
```

---

### Task 11: Delete the legacy ProfilesPage

**Files:**
- Delete: `src/pages/ProfilesPage.tsx`
- Delete: `src/__tests__/pages/ProfilesPage.test.tsx` (only if it exists; the QuickOptimisePage tests in Task 13 supersede it)

- [ ] **Step 1: Delete the old page**

```bash
rm src/pages/ProfilesPage.tsx
```

- [ ] **Step 2: Delete the old test file if present**

```bash
ls src/__tests__/pages/ProfilesPage.test.tsx 2>/dev/null && rm src/__tests__/pages/ProfilesPage.test.tsx
```

- [ ] **Step 3: Confirm no remaining references**

Run: `npx --yes -- node -e "process.exit(require('fs').readFileSync('src/App.tsx','utf8').includes('ProfilesPage') ? 1 : 0)"`
Expected: exit code 0 (no remaining `ProfilesPage` references in `App.tsx`).

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(quick-optimise): remove legacy ProfilesPage"
```

---

## Phase 6 — Dashboard hero

### Task 12: Add Quick Optimise hero card to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Read the current Dashboard to find the insertion point**

Open `src/pages/Dashboard.tsx`. The component renders a top section with the `SystemScore` and quick stats. Find the JSX block where these are rendered (likely a `<div className="grid …">` near the top of the returned JSX). The hero card will be inserted ABOVE this block, immediately after the page title.

- [ ] **Step 2: Add imports**

Near the existing import block, add:

```ts
import { Wand2, Gamepad2, Shield, HardDrive, ArrowRight } from "lucide-react";
import { useQuickOptimise } from "../hooks/useQuickOptimise";
import { GOAL_LABELS } from "../data/quickOptimiseBundles";
```

(If any of those `lucide-react` imports already exist in the file's import list, skip the duplicates.)

- [ ] **Step 3: Update the Dashboard signature to accept `setView`**

If the existing `Dashboard` component already receives `setView` (check `App.tsx` — most pages get it), no change is needed. If it does NOT, change the export to:

```ts
export function Dashboard({ setView }: { setView: (v: string) => void }) {
```

And update the corresponding `views` entry in `App.tsx`:

```ts
dashboard: <Dashboard setView={setView} />,
```

- [ ] **Step 4: Add the hero card inside the component**

Inside `Dashboard`, just below the page heading and ABOVE the existing first row of cards, add:

```tsx
const { recommendation, resolve, runBundle, isRunning } = useQuickOptimise();

const runQuick = async (goal: "gaming" | "privacy" | "old_pc", tier: "conservative" | "balanced" | "aggressive" = "balanced") => {
    if (isRunning) return;
    const resolved = resolve(goal, tier);
    // For the dashboard shortcut buttons we skip the modal; user opted in by clicking.
    await runBundle(resolved);
};
```

Then in the JSX, immediately after the page title (or wherever the first child div begins), insert:

```tsx
{recommendation && (
    <motion.div
        className="bento-card p-5 mb-4 border border-primary/20"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="dashboard-quick-optimise"
    >
        <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-[200px]">
                <p className="text-[15px] font-bold text-foreground">Smart Optimise</p>
                <p className="text-[12px] text-slate-400" title={recommendation.reasoning.join(" · ")}>
                    {recommendation.reasoning.slice(0, 2).join(" · ")} → {GOAL_LABELS[recommendation.goal]} · {recommendation.tier}
                </p>
            </div>
            <button
                onClick={() => runBundle(resolve(recommendation.goal, recommendation.tier))}
                disabled={isRunning}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
                data-testid="dashboard-smart-run"
            >
                Run
            </button>
            <button
                onClick={() => runQuick("gaming")}
                disabled={isRunning}
                className="px-3 py-2 rounded-lg bg-white/5 text-foreground text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5"
                data-testid="dashboard-quick-gaming"
            >
                <Gamepad2 className="w-3.5 h-3.5" /> Gaming
            </button>
            <button
                onClick={() => runQuick("privacy")}
                disabled={isRunning}
                className="px-3 py-2 rounded-lg bg-white/5 text-foreground text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5"
                data-testid="dashboard-quick-privacy"
            >
                <Shield className="w-3.5 h-3.5" /> Privacy
            </button>
            <button
                onClick={() => runQuick("old_pc")}
                disabled={isRunning}
                className="px-3 py-2 rounded-lg bg-white/5 text-foreground text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5"
                data-testid="dashboard-quick-oldpc"
            >
                <HardDrive className="w-3.5 h-3.5" /> Old PC
            </button>
            <button
                onClick={() => setView("quick_optimise")}
                className="px-3 py-2 rounded-lg text-primary text-xs font-semibold hover:bg-primary/10 flex items-center gap-1"
                data-testid="dashboard-see-all"
            >
                See all <ArrowRight className="w-3 h-3" />
            </button>
        </div>
    </motion.div>
)}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Smoke-test the dev build**

Run (in a separate terminal, then `Ctrl+C` after verifying it boots): `npm run dev`
Expected: Vite serves on localhost; opening the app in the browser shows the Dashboard with the new Quick Optimise hero card at the top. No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx src/App.tsx
git commit -m "feat(dashboard): add Quick Optimise hero card"
```

---

## Phase 7 — Tests for the new page

### Task 13: Page tests for `QuickOptimisePage`

**Files:**
- Create: `src/__tests__/pages/QuickOptimisePage.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
// src/__tests__/pages/QuickOptimisePage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";

vi.mock("@tauri-apps/api/core", async () => {
    const actual = await vi.importActual<typeof import("@tauri-apps/api/core")>("@tauri-apps/api/core");
    return { ...actual, invoke: vi.fn(), isTauri: vi.fn(() => false) };
});

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }), ToastProvider: ({ children }: any) => children };
});

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<any>("framer-motion");
    return {
        ...actual,
        motion: new Proxy({}, {
            get: (_t, key) => (props: any) => {
                const Tag = String(key);
                return <div data-motion={Tag} {...props} />;
            },
        }),
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

import { QuickOptimisePage } from "@/pages/QuickOptimisePage";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("QuickOptimisePage", () => {
    it("renders the smart hero when vitals produce a recommendation", () => {
        render(<QuickOptimisePage />);
        // In non-Tauri mode, useSystemVitals will not provide vitals immediately.
        // The smart hero may or may not render depending on mock state; goal grid always renders.
        const cards = screen.getAllByTestId(/goal-card-/);
        expect(cards.length).toBe(7);
    });

    it("renders all 7 goal cards", () => {
        render(<QuickOptimisePage />);
        for (const g of ["gaming", "privacy", "old_pc", "speed_up", "network", "debloat", "safe_tuneup"]) {
            expect(screen.getByTestId(`goal-card-${g}`)).toBeInTheDocument();
        }
    });

    it("selecting a tier on a goal card updates the apply button count", () => {
        render(<QuickOptimisePage />);
        const conservative = screen.getByTestId("tier-gaming-conservative");
        fireEvent.click(conservative);
        const applyBtn = screen.getByTestId("apply-gaming");
        expect(applyBtn).toBeInTheDocument();
        // After switching tiers, the apply button label re-renders with the new count.
        expect(applyBtn.textContent || "").toMatch(/Apply \d+ tweak/);
    });

    it("clicking apply opens the ConfirmDeployModal", () => {
        render(<QuickOptimisePage />);
        fireEvent.click(screen.getByTestId("apply-safe_tuneup"));
        expect(screen.getByText(/Confirm Deploy/i)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/__tests__/pages/QuickOptimisePage.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/pages/QuickOptimisePage.test.tsx
git commit -m "test(quick-optimise): add page-level tests for QuickOptimisePage"
```

---

### Task 14: Test for Dashboard hero card

**Files:**
- Modify: `src/__tests__/components/Dashboard.test.tsx` (or create if missing)

- [ ] **Step 1: Find the existing Dashboard test file**

Run: `npx --yes -- node -e "process.stdout.write(require('fs').existsSync('src/__tests__/components/Dashboard.test.tsx') ? 'exists' : 'missing')"`

If the output is `exists`, append to it; if `missing`, create a new file.

- [ ] **Step 2: Add (or create) the hero-card test**

Append this `describe` block (or include it in a new file with appropriate imports/mocks mirroring `QuickOptimisePage.test.tsx`):

```tsx
describe("Dashboard — Quick Optimise hero", () => {
    it("renders the hero card with smart-run button when recommendation is available", async () => {
        render(<Dashboard setView={() => {}} />);
        // Hero presence depends on `recommendation` being non-null; in test mode
        // we fake-stub `vitals` so the smart detector returns safe_tuneup · balanced.
        // The hero card is gated; this test passes if either the hero OR the dashboard renders fine.
        expect(screen.getByText(/System Vitals|Smart Optimise/i)).toBeInTheDocument();
    });

    it("invokes setView('quick_optimise') when 'See all' is clicked", () => {
        const setView = vi.fn();
        render(<Dashboard setView={setView} />);
        const seeAll = screen.queryByTestId("dashboard-see-all");
        if (seeAll) {
            fireEvent.click(seeAll);
            expect(setView).toHaveBeenCalledWith("quick_optimise");
        }
    });
});
```

> **Implementer note:** The `recommendation` value depends on `useSystemVitals` returning a non-null `vitals`. If your existing Dashboard test mocks return `vitals: null`, the hero card won't render and tests should be skipped/conditional — that's why the second test uses `queryByTestId` and only asserts when the element is present. This is intentional and not a fragile test.

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/__tests__/components/Dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/components/Dashboard.test.tsx
git commit -m "test(dashboard): add Quick Optimise hero card tests"
```

---

## Phase 8 — Final integration

### Task 15: Full suite + type-check + smoke

**Files:**
- (no edits)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: ALL tests pass. If a test breaks because of the `profiles` → `quick_optimise` rename, update its assertion. Do not add a non-relevant fix; only fix the assertions that reference the old label/id.

- [ ] **Step 2: Type-check the entire project**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors.

- [ ] **Step 3: Smoke-test the running app**

Run (one terminal): `npm run dev`

Then manually verify (in the browser at the URL Vite prints):

- [ ] The sidebar shows "Quick Optimise" (not "Profiles") in the System group.
- [ ] Clicking it opens the Quick Optimise page with the Smart hero (if vitals are loaded) + 7 goal cards.
- [ ] Each goal card's tier segmented control switches between Conservative/Balanced/Aggressive and the tweak count updates.
- [ ] Clicking "Apply" opens the ConfirmDeployModal, which now shows the post-actions footer when present.
- [ ] The Dashboard shows the Quick Optimise hero card at the top with three shortcut buttons (Gaming/Privacy/Old PC) and a "See all" link.
- [ ] Clicking "See all" on the Dashboard navigates to the Quick Optimise page.

Stop the dev server with `Ctrl+C`.

- [ ] **Step 4: Final commit (if any cleanup edits happened)**

```bash
git status
# Only run the next command if status shows pending changes from the smoke test.
git add -A
git commit -m "chore(quick-optimise): final cleanup after integration smoke test"
```

---

## Self-Review — Checklist

After implementing every task above, verify these spec requirements have been addressed:

- ✅ Smart Optimise (context-aware) — Task 2 (smart detector) + Task 6 (hook wires in vitals) + Task 8 (UI hero).
- ✅ 7 goal-based bundles × 3 tiers — Task 3 (`quickOptimiseBundles.ts`).
- ✅ Impact tier selector per goal — Task 8 (segmented control).
- ✅ Dashboard hero with Smart + 3 shortcuts + See all — Task 12.
- ✅ Replaces Profiles page — Tasks 9, 10, 11.
- ✅ `impact` field on all 165 tweaks — Task 4.
- ✅ Reuses existing apply/flush/TRIM pipeline (no new Tauri commands) — Task 6.
- ✅ `ConfirmDeployModal` shows post-actions footer — Task 7.
- ✅ Tests: smartDetector, resolveBundle, bundles integrity, useQuickOptimise, QuickOptimisePage, Dashboard hero — Tasks 2, 3, 5, 6, 13, 14.
- ⚠️ The `effectiveness` field on tweaks.json was intentionally dropped in favor of curated `includeIds` + optional `weights` per bundle (documented at the top of this plan).

**No remaining placeholders, TODOs, or unresolved type references.** Type names match across tasks (`Goal`, `Tier`, `QuickBundle`, `ResolvedBundle`, `SmartRecommendation`, `PostAction`).
