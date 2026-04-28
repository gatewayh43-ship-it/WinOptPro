import { useState, useCallback, useMemo, useRef } from "react";
import type { Bundle, AppMetadata, ResolvedBundle } from "@/types/bundles";
import rawBundles from "@/data/bundles.json";
import rawMeta from "@/data/app_metadata.json";
import { useToast } from "@/components/ToastSystem";

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
}

export function useBundles() {
  const [customBundles, setCustomBundles] = useState<Bundle[]>(loadCustomBundles);
  const customBundlesRef = useRef(customBundles);
  customBundlesRef.current = customBundles;
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();

  const resolveBundle = useCallback((bundle: Bundle): ResolvedBundle => ({
    ...bundle,
    resolvedApps: bundle.apps.map((appId) => ({
      appId,
      metadata: appLookup[appId] ?? null,
    })),
  }), []);

  const saveCustomBundle = useCallback(
    (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => {
      // Capture computed result from the updater (runs synchronously) so we can
      // persist and toast outside the updater — no side effects inside setState.
      let computed: { savedName: string; updated: Bundle[] } | null = null;
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
        computed = { savedName: name, updated };
        return updated;
      });
      if (!computed) return;
      const { savedName, updated } = computed as { savedName: string; updated: Bundle[] };
      try {
        persist(updated);
        addToast({ type: "success", title: "Bundle saved", message: `"${savedName}" bundle created.` });
      } catch (e) {
        addToast({ type: "error", title: "Failed to save bundle", message: String(e) });
      }
    },
    [addToast]
  );

  const updateCustomBundle = useCallback(
    (id: string, updates: Partial<Omit<Bundle, "id" | "type" | "createdAt">>) => {
      setCustomBundles((prev) => {
        const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
        try {
          persist(updated);
        } catch {
          // silent — curated bundles unaffected
        }
        return updated;
      });
    },
    []
  );

  const deleteCustomBundle = useCallback((id: string) => {
    setCustomBundles((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        persist(updated);
      } catch {
        // silent — curated bundles unaffected
      }
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
