import { useState, useCallback, useMemo } from "react";
import type { Bundle, AppMetadata, ResolvedBundle } from "@/types/bundles";
import rawBundles from "@/data/bundles.json";
import rawMeta from "@/data/app_metadata.json";

// app_metadata.json structure: { categories: [...], apps: { "Mozilla.Firefox": {...}, ... } }
// Access the apps sub-object for O(1) lookup
const appLookup = (rawMeta as any).apps as Record<string, AppMetadata>;

// Module-level constant — stable reference so useMemo deps work correctly
const curatedBundles = rawBundles as Bundle[];

const STORAGE_KEY = "winopt_custom_bundles";

function loadCustomBundles(): Bundle[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Bundle[]) : [];
  } catch {
    return [];
  }
}

function persist(bundles: Bundle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
  } catch {
    // localStorage unavailable — silent fail, curated bundles unaffected
  }
}

export function useBundles() {
  const [customBundles, setCustomBundles] = useState<Bundle[]>(loadCustomBundles);
  const [searchQuery, setSearchQuery] = useState("");

  const resolveBundle = useCallback((bundle: Bundle): ResolvedBundle => ({
    ...bundle,
    resolvedApps: bundle.apps.map((appId) => ({
      appId,
      metadata: appLookup[appId] ?? null,
    })),
  }), []);

  const saveCustomBundle = useCallback(
    (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => {
      setCustomBundles((prev) => {
        let name = bundle.name;
        let suffix = 2;
        while (prev.some((b) => b.name === name)) {
          name = `${bundle.name} (${suffix++})`;
        }
        const newBundle: Bundle = {
          ...bundle,
          name,
          id: crypto.randomUUID(),
          type: "custom",
          createdAt: new Date().toISOString(),
        };
        const updated = [...prev, newBundle];
        persist(updated);
        return updated;
      });
    },
    []
  );

  const updateCustomBundle = useCallback(
    (id: string, updates: Partial<Bundle>) => {
      setCustomBundles((prev) => {
        const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
        persist(updated);
        return updated;
      });
    },
    []
  );

  const deleteCustomBundle = useCallback((id: string) => {
    setCustomBundles((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const filteredBundles = useMemo((): Bundle[] => {
    if (!searchQuery.trim()) {
      return [...customBundles, ...curatedBundles];
    }
    const q = searchQuery.toLowerCase();
    return [...customBundles, ...curatedBundles]
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase().includes(q);
        const bName = b.name.toLowerCase().includes(q);
        if (aName && !bName) return -1;
        if (!aName && bName) return 1;
        return 0;
      });
  }, [customBundles, searchQuery]);

  return {
    curatedBundles,
    customBundles,
    saveCustomBundle,
    updateCustomBundle,
    deleteCustomBundle,
    resolveBundle,
    searchQuery,
    setSearchQuery,
    filteredBundles,
  };
}
