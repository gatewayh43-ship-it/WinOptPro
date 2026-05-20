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
