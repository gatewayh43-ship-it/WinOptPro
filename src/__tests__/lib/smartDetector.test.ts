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
