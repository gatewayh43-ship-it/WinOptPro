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
