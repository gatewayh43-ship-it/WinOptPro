import { describe, it, expect } from "vitest";
import tweaksData from "@/data/tweaks.json";

// ── Type helpers ──────────────────────────────────────────────────────────────

type RiskLevel = "Green" | "Yellow" | "Red";
type Tweak = (typeof tweaksData)[number];

const KNOWN_CATEGORIES = [
    "Performance",
    "Privacy",
    "Gaming",
    "Network",
    "Power",
    "Debloat",
    "Security",
    "Tools",
    "Windows UI",
    "Windows Update",
] as const;

const RISK_LEVELS: RiskLevel[] = ["Green", "Yellow", "Red"];

// ── Data integrity tests ──────────────────────────────────────────────────────

describe("tweaks.json data integrity", () => {
    it("contains at least 50 tweaks", () => {
        expect(tweaksData.length).toBeGreaterThanOrEqual(50);
    });

    it("has no duplicate tweak IDs", () => {
        const ids = tweaksData.map((t) => t.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it("every tweak has a non-empty id", () => {
        tweaksData.forEach((t) => {
            expect(t.id).toBeTruthy();
        });
    });

    it("every tweak has a non-empty name", () => {
        tweaksData.forEach((t) => {
            expect(t.name).toBeTruthy();
        });
    });

    it("every tweak has a valid riskLevel", () => {
        tweaksData.forEach((t) => {
            expect(RISK_LEVELS).toContain(t.riskLevel);
        });
    });

    it("every tweak has a non-empty execution.code", () => {
        tweaksData.forEach((t) => {
            expect(t.execution.code).toBeTruthy();
        });
    });

    it("every tweak has a non-empty execution.revertCode", () => {
        tweaksData.forEach((t) => {
            expect(t.execution.revertCode).toBeTruthy();
        });
    });

    it("every tweak has a category that matches a known value", () => {
        const categories = new Set(KNOWN_CATEGORIES as readonly string[]);
        tweaksData.forEach((t) => {
            expect(categories).toContain(t.category);
        });
    });

    it("tweaks with requiresExpertMode set are Red risk level", () => {
        const expertTweaks = tweaksData.filter((t) => t.requiresExpertMode);
        expertTweaks.forEach((t) => {
            expect(t.riskLevel).toBe("Red");
        });
    });

    it("all Red tweaks have requiresExpertMode set to true", () => {
        const redTweaks = tweaksData.filter((t) => t.riskLevel === "Red");
        redTweaks.forEach((t) => {
            expect(t.requiresExpertMode).toBe(true);
        });
    });
});

// ── Category filtering ────────────────────────────────────────────────────────

describe("filtering tweaks by category", () => {
    function byCategory(cat: string): Tweak[] {
        return tweaksData.filter((t) => t.category === cat);
    }

    it("Performance category has tweaks", () => {
        expect(byCategory("Performance").length).toBeGreaterThan(0);
    });

    it("Privacy category has tweaks", () => {
        expect(byCategory("Privacy").length).toBeGreaterThan(0);
    });

    it("Gaming category has tweaks", () => {
        expect(byCategory("Gaming").length).toBeGreaterThan(0);
    });

    it("Network category has tweaks", () => {
        expect(byCategory("Network").length).toBeGreaterThan(0);
    });

    it("filtering by a non-existent category returns empty array", () => {
        expect(byCategory("__nonexistent__")).toHaveLength(0);
    });

    it("sum of all per-category counts equals total tweak count", () => {
        const total = KNOWN_CATEGORIES.reduce(
            (sum, cat) => sum + byCategory(cat).length,
            0
        );
        expect(total).toBe(tweaksData.length);
    });
});

// ── Risk level filtering ──────────────────────────────────────────────────────

describe("filtering tweaks by risk level", () => {
    function byRisk(risk: RiskLevel): Tweak[] {
        return tweaksData.filter((t) => t.riskLevel === risk);
    }

    it("Green tweaks exist", () => {
        expect(byRisk("Green").length).toBeGreaterThan(0);
    });

    it("Yellow tweaks exist", () => {
        expect(byRisk("Yellow").length).toBeGreaterThan(0);
    });

    it("Green tweaks do NOT have requiresExpertMode", () => {
        byRisk("Green").forEach((t) => {
            expect(t.requiresExpertMode).toBeFalsy();
        });
    });

    it("Yellow tweaks do NOT have requiresExpertMode", () => {
        byRisk("Yellow").forEach((t) => {
            expect(t.requiresExpertMode).toBeFalsy();
        });
    });

    it("Green + Yellow + Red counts sum to total", () => {
        const total =
            byRisk("Green").length + byRisk("Yellow").length + byRisk("Red").length;
        expect(total).toBe(tweaksData.length);
    });
});

// ── Expert mode filtering ─────────────────────────────────────────────────────

describe("expert mode visibility logic", () => {
    const expertModeOff = (tweaks: Tweak[]) =>
        tweaks.filter((t) => !t.requiresExpertMode);

    const expertModeOn = (tweaks: Tweak[]) => tweaks;

    it("with expert mode OFF, no expert tweaks are shown", () => {
        const visible = expertModeOff(tweaksData);
        visible.forEach((t) => {
            expect(t.requiresExpertMode).toBeFalsy();
        });
    });

    it("with expert mode ON, all tweaks are shown", () => {
        expect(expertModeOn(tweaksData)).toHaveLength(tweaksData.length);
    });

    it("expert mode OFF shows fewer tweaks than expert mode ON (if expert tweaks exist)", () => {
        const withExpert = tweaksData.filter((t) => t.requiresExpertMode);
        if (withExpert.length > 0) {
            expect(expertModeOff(tweaksData).length).toBeLessThan(
                expertModeOn(tweaksData).length
            );
        }
    });
});

// ── Composite filtering (category + risk) ────────────────────────────────────

describe("composite category + risk filtering", () => {
    it("Performance Green tweaks have no requiresExpertMode", () => {
        const results = tweaksData.filter(
            (t) => t.category === "Performance" && t.riskLevel === "Green"
        );
        results.forEach((t) => expect(t.requiresExpertMode).toBeFalsy());
    });

    it("filtering non-existent category+risk combination returns empty array", () => {
        const results = tweaksData.filter(
            (t) => t.category === "__nonexistent__" && t.riskLevel === "Green"
        );
        expect(results).toHaveLength(0);
    });
});
