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
