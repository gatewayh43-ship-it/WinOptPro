// Centralized localStorage keys + safe getters/setters.
//
// Use STORAGE_KEYS instead of inline string literals so we have a single place
// to audit what we persist. Helpers swallow QuotaExceeded / private-mode errors.

export const STORAGE_KEYS = {
  CONSENT: "consent-accepted",
  ONBOARDING: "onboardingComplete",
  AI_MODEL: "ai-model",
  AI_MODEL_INSTALLING: "ai-model-installing",
  GAMING_AUTO_OPTIMIZE: "gaming-auto-optimize",
  GAMING_BASELINE: "gaming-baseline",
  WSL_SETUP_COMPLETE: "wslSetupComplete",
  LAST_BACKUP: "last-backup",
  EXPERT_MODE: "expert-mode",
  THEME: "theme",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function getString(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
