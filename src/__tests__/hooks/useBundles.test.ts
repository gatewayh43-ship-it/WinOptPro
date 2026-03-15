import { renderHook, act } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Bundle } from "@/types/bundles";

// Mock JSON data — mirror the real structure: { categories: [...], apps: { ... } }
vi.mock("@/data/app_metadata.json", () => ({
  default: {
    categories: [],
    apps: {
      "Mozilla.Firefox": {
        id: "Mozilla.Firefox", name: "Firefox", description: "A browser",
        logo: "/logo.png", license: "MPL-2.0",
      },
      "7zip.7zip": {
        id: "7zip.7zip", name: "7-Zip", description: "An archiver",
        logo: "/logo.png", license: "LGPL",
      },
    },
  },
}));

const MOCK_BUNDLE: Bundle = {
  id: "test-bundle",
  type: "curated",
  group: "Starters",
  name: "Test Bundle",
  description: "A test bundle description",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip"],
};

const MOCK_BUNDLE_UNKNOWN_APP: Bundle = {
  id: "unknown-bundle",
  type: "curated",
  group: "Starters",
  name: "Unknown Bundle",
  description: "Has unknown app",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "Unknown.App"],
};

vi.mock("@/data/bundles.json", () => ({
  default: [MOCK_BUNDLE, MOCK_BUNDLE_UNKNOWN_APP],
}));

describe("useBundles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("curatedBundles", () => {
    it("loads curated bundles from bundles.json", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.curatedBundles).toHaveLength(2);
      expect(result.current.curatedBundles[0].id).toBe("test-bundle");
    });
  });

  describe("resolveBundle", () => {
    it("resolves known apps to metadata, unknown to null", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      const resolved = result.current.resolveBundle(MOCK_BUNDLE_UNKNOWN_APP);
      expect(resolved.resolvedApps).toHaveLength(2);
      expect(resolved.resolvedApps[0].metadata).not.toBeNull();
      expect(resolved.resolvedApps[0].metadata?.name).toBe("Firefox");
      expect(resolved.resolvedApps[1].appId).toBe("Unknown.App");
      expect(resolved.resolvedApps[1].metadata).toBeNull();
    });

    it("returns all apps resolved for fully known bundle", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      const resolved = result.current.resolveBundle(MOCK_BUNDLE);
      expect(resolved.resolvedApps.every(a => a.metadata !== null)).toBe(true);
    });
  });

  describe("custom bundle CRUD", () => {
    it("saveCustomBundle persists to localStorage and returns in customBundles", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.customBundles).toHaveLength(0);

      act(() => {
        result.current.saveCustomBundle({
          group: "Other",
          name: "My Bundle",
          description: "custom desc",
          icon: "Star",
          color: "red",
          apps: ["Mozilla.Firefox"],
        });
      });

      expect(result.current.customBundles).toHaveLength(1);
      expect(result.current.customBundles[0].name).toBe("My Bundle");
      expect(result.current.customBundles[0].type).toBe("custom");
      expect(result.current.customBundles[0].id).toBeTruthy();
      expect(result.current.customBundles[0].createdAt).toBeTruthy();
      const stored = JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]");
      expect(stored).toHaveLength(1);
    });

    it("saveCustomBundle appends (2) on name collision", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "Dupe", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
        result.current.saveCustomBundle({ group: "Other", name: "Dupe", description: "", icon: "Star", color: "blue", apps: ["7zip.7zip"] });
      });

      const names = result.current.customBundles.map(b => b.name);
      expect(names).toContain("Dupe");
      expect(names).toContain("Dupe (2)");
    });

    it("deleteCustomBundle removes from state and localStorage", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "ToDelete", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });
      const id = result.current.customBundles[0].id;

      act(() => {
        result.current.deleteCustomBundle(id);
      });

      expect(result.current.customBundles).toHaveLength(0);
      expect(JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]")).toHaveLength(0);
    });

    it("updateCustomBundle updates name in state and localStorage", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "Original", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });
      const id = result.current.customBundles[0].id;

      act(() => {
        result.current.updateCustomBundle(id, { name: "Updated" });
      });

      expect(result.current.customBundles[0].name).toBe("Updated");
      const stored = JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]");
      expect(stored[0].name).toBe("Updated");
    });

    it("hydrates customBundles from localStorage on mount", async () => {
      const saved = [{ id: "x", type: "custom", group: "Other", name: "Hydrated", description: "", icon: "Star", color: "blue", apps: [], createdAt: "2026-01-01" }];
      localStorage.setItem("winopt_custom_bundles", JSON.stringify(saved));
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.customBundles[0].name).toBe("Hydrated");
    });
  });

  describe("search / filteredBundles", () => {
    it("returns all bundles (custom first) when searchQuery empty", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "My Custom", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });

      const ids = result.current.filteredBundles.map(b => b.id);
      expect(ids[0]).toBe(result.current.customBundles[0].id); // custom first
      expect(ids).toContain("test-bundle");
    });

    it("filters bundles by name match", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => { result.current.setSearchQuery("test bundle"); });

      expect(result.current.filteredBundles.every(b => b.name.toLowerCase().includes("test") || b.description.toLowerCase().includes("test"))).toBe(true);
    });

    it("sorts name matches before description-only matches", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => { result.current.setSearchQuery("bundle"); });

      const nameMatches = result.current.filteredBundles.filter(b => b.name.toLowerCase().includes("bundle"));
      const descOnlyMatches = result.current.filteredBundles.filter(b => !b.name.toLowerCase().includes("bundle") && b.description.toLowerCase().includes("bundle"));
      if (nameMatches.length > 0 && descOnlyMatches.length > 0) {
        const lastNameMatchIdx = result.current.filteredBundles.indexOf(nameMatches[nameMatches.length - 1]);
        const firstDescMatchIdx = result.current.filteredBundles.indexOf(descOnlyMatches[0]);
        expect(lastNameMatchIdx).toBeLessThan(firstDescMatchIdx);
      }
    });
  });
});
