import { beforeEach, describe, expect, it, vi } from "vitest";
import { getJSON, getString, hasItem, removeItem, setItem, STORAGE_KEYS } from "@/lib/storage";

describe("storage helpers", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("exports centralized keys", () => {
        expect(STORAGE_KEYS.CONSENT).toBe("consent-accepted");
        expect(STORAGE_KEYS.ONBOARDING).toBe("onboardingComplete");
    });

    it("reads strings with fallback values", () => {
        expect(getString("missing", "fallback")).toBe("fallback");
        localStorage.setItem("name", "WinOpt");
        expect(getString("name", "fallback")).toBe("WinOpt");
    });

    it("reads JSON and falls back for missing or invalid values", () => {
        expect(getJSON("missing", { ok: false })).toEqual({ ok: false });
        localStorage.setItem("valid", JSON.stringify({ ok: true }));
        expect(getJSON("valid", { ok: false })).toEqual({ ok: true });
        localStorage.setItem("invalid", "{");
        expect(getJSON("invalid", { ok: false })).toEqual({ ok: false });
    });

    it("sets strings and JSON values", () => {
        expect(setItem("plain", "value")).toBe(true);
        expect(localStorage.getItem("plain")).toBe("value");
        expect(setItem("object", { enabled: true })).toBe(true);
        expect(localStorage.getItem("object")).toBe(JSON.stringify({ enabled: true }));
    });

    it("removes and checks items", () => {
        setItem("flag", true);
        expect(hasItem("flag")).toBe(true);
        removeItem("flag");
        expect(hasItem("flag")).toBe(false);
    });

    it("swallows storage read/write errors", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
            throw new Error("private mode");
        });
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });
        vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        expect(getString("key", "fallback")).toBe("fallback");
        expect(getJSON("key", { ok: false })).toEqual({ ok: false });
        expect(setItem("key", "value")).toBe(false);
        expect(hasItem("key")).toBe(false);
        expect(() => removeItem("key")).not.toThrow();
    });
});
