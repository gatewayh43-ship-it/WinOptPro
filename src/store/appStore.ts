import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ────────────────────────────────────────────────────────────────

export interface SystemVitals {
  timestamp: number;
  cpu: {
    model: string;
    usagePct: number;
    freqGhz: number;
    cores: number;
    tempC: number | null;
  };
  ram: {
    usedMb: number;
    totalMb: number;
    usagePct: number;
  };
  drives: Record<
    string,
    {
      freeGb: number;
      totalGb: number;
      name: string;
      mountPoint: string;
    }
  >;
  network: Record<
    string,
    {
      receivedBytes: number;
      transmittedBytes: number;
    }
  >;
  system: {
    uptimeSeconds: number;
    osVersion: string;
    isAdmin: boolean;
  };
}

export interface TweakResult {
  success: boolean;
  tweakId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface TweakValidationResult {
  state: "Applied" | "Reverted" | "Unknown";
  rawOutput: string;
}

export interface TweakHistoryEntry {
  id: string;
  tweakId: string;
  tweakName: string;
  action: "APPLIED" | "REVERTED" | "FAILED";
  timestamp: number;
  durationMs: number;
  commandExecuted: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  status: "SUCCESS" | "FAILED" | "TIMEOUT";
}

export interface UserSettings {
  theme: "dark" | "light";
  colorScheme: "default" | "teal" | "rose" | "amber" | "emerald" | "violet";
  expertModeEnabled: boolean;
  autoRefreshVitals: boolean;
  autoRefreshIntervalMs: number;
  showDeployConfirmation: boolean;
  aiAssistantEnabled: boolean;
}

// ── Store Interface ──────────────────────────────────────────────────────

interface AppState {
  // Persisted
  appliedTweaks: string[];
  userSettings: UserSettings;

  // Session only
  selectedTweaks: string[];
  systemVitals: SystemVitals | null;
  tweakValidationState: Record<string, "Applied" | "Reverted" | "Unknown">;
  isExecuting: boolean;
  executingTweakId: string | null;
  error: { code: string; message: string } | null;

  // Actions — persisted state
  addAppliedTweak: (id: string) => void;
  removeAppliedTweak: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Actions — session state
  toggleSelectedTweak: (id: string) => void;
  clearSelectedTweaks: () => void;
  setSystemVitals: (vitals: SystemVitals) => void;
  setTweakValidation: (
    id: string,
    state: "Applied" | "Reverted" | "Unknown"
  ) => void;
  setExecuting: (executing: boolean, tweakId?: string | null) => void;
  setError: (error: { code: string; message: string } | null) => void;
}

// ── Store ────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Persisted defaults
      appliedTweaks: [],
      userSettings: {
        theme: "dark",
        colorScheme: "default",
        expertModeEnabled: false,
        autoRefreshVitals: true,
        autoRefreshIntervalMs: 3000,
        showDeployConfirmation: true,
        aiAssistantEnabled: false,
      },

      // Session defaults
      selectedTweaks: [],
      systemVitals: null,
      tweakValidationState: {},
      isExecuting: false,
      executingTweakId: null,
      error: null,

      // Persisted actions
      addAppliedTweak: (id) =>
        set((s) => ({
          appliedTweaks: s.appliedTweaks.includes(id)
            ? s.appliedTweaks
            : [...s.appliedTweaks, id],
        })),

      removeAppliedTweak: (id) =>
        set((s) => ({
          appliedTweaks: s.appliedTweaks.filter((t) => t !== id),
        })),

      updateSettings: (settings) =>
        set((s) => ({
          userSettings: { ...s.userSettings, ...settings },
        })),

      // Session actions
      toggleSelectedTweak: (id) =>
        set((s) => ({
          selectedTweaks: s.selectedTweaks.includes(id)
            ? s.selectedTweaks.filter((t) => t !== id)
            : [...s.selectedTweaks, id],
        })),

      clearSelectedTweaks: () => set({ selectedTweaks: [] }),

      setSystemVitals: (vitals) => set({ systemVitals: vitals }),

      setTweakValidation: (id, state) =>
        set((s) => ({
          tweakValidationState: { ...s.tweakValidationState, [id]: state },
        })),

      setExecuting: (executing, tweakId = null) =>
        set({ isExecuting: executing, executingTweakId: tweakId }),

      setError: (error) => set({ error }),
    }),
    {
      name: "winopt-storage",
      partialize: (state) => ({
        appliedTweaks: state.appliedTweaks,
        userSettings: state.userSettings,
      }),
    }
  )
);
