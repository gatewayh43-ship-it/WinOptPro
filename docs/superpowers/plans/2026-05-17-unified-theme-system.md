# Unified Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-field `theme`/`colorScheme` system with a single `ThemeName` string and add three new standalone design themes (Claude, Fluent, Cyberpunk) selectable from the Settings page.

**Architecture:** `ThemeName` is exported from `useTheme.tsx` and imported wherever `UserSettings.theme` is typed. `ThemeProvider` maps each name to a set of HTML classes via a static `CLASS_MAP`. CSS variables for the three new themes are appended to `App.css`. Existing `dark:` Tailwind utilities continue to work because every theme that needs them also applies the `"dark"` HTML class.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Zustand persist, Vitest

---

## Files

| File | Action |
|---|---|
| `src/App.css` | Add 3 new CSS theme blocks |
| `src/hooks/useTheme.tsx` | Rewrite — export `ThemeName`, `CLASS_MAP`, simplified API |
| `src/store/appStore.ts` | Import `ThemeName`, remove `colorScheme`, add Zustand persist migration |
| `src/App.tsx` | Remove 3 `defaultColorScheme` props from `ThemeProvider` |
| `src/components/layout/Sidebar.tsx` | New toggle/accent derivation; hide controls for design themes |
| `src/pages/SettingsPage.tsx` | New Appearance section with `ThemeSwatch` + `ThemeCard` |
| `src/__tests__/hooks/useTheme.test.tsx` | Rewrite for new API |
| `src/__tests__/components/Sidebar.test.tsx` | Update wrapper + color picker assertions |
| `src/__tests__/pages/SettingsPage.test.tsx` | Remove `colorScheme` from mock; update assertions |
| `src/__tests__/hooks/useBackup.test.tsx` | Remove `colorScheme` from mock `userSettings` |
| `src/__tests__/hooks/useSmartStore.test.tsx` | Remove `colorScheme` from mock `userSettings` |
| `src/__tests__/hooks/useSystemVitals.test.tsx` | Remove `colorScheme` from mock `userSettings` |
| `src/__tests__/pages/TweaksPage.integration.test.tsx` | Remove `colorScheme` from mock `userSettings` |
| `src/__tests__/components/ExpertModeGate.test.tsx` | Remove `colorScheme` from mock `userSettings` |

---

## Task 1: Add CSS theme blocks

**Files:**
- Modify: `src/App.css` (append after `.theme-violet` block, ~line 151)

- [ ] **Step 1: Append the three new theme CSS blocks**

Open `src/App.css`. After the closing `}` of the `.theme-violet` block (~line 151), append:

```css
.theme-claude {
  --bg: #F7F3EC;
  --fg: #1C1917;
  --card-bg: #FDFAF5;
  --card-fg: #1C1917;
  --border: rgba(0, 0, 0, 0.07);
  --input: rgba(0, 0, 0, 0.04);
  --primary: #C96A2A;
  --glass-bg: rgba(253, 250, 245, 0.85);
  --glass-border: rgba(0, 0, 0, 0.05);
  --bento-shadow: 0 4px 20px -4px rgba(180, 120, 60, 0.10);
  --bento-hover-shadow: 0 8px 30px -6px rgba(180, 120, 60, 0.18);
  --bento-border: rgba(0, 0, 0, 0.05);
  --gradient-text: linear-gradient(135deg, #C96A2A 0%, #E8924A 100%);
  --scrollbar-thumb: #D6CAB8;
  --scrollbar-thumb-hover: #B8A898;
}

.theme-fluent {
  --bg: #F0F0F0;
  --fg: #1C1C1C;
  --card-bg: rgba(255, 255, 255, 0.75);
  --card-fg: #1C1C1C;
  --border: rgba(0, 0, 0, 0.10);
  --input: rgba(0, 0, 0, 0.04);
  --primary: #0078D4;
  --glass-bg: rgba(243, 243, 243, 0.80);
  --glass-border: rgba(255, 255, 255, 0.60);
  --bento-shadow: 0 2px 8px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0, 0, 0, 0.06);
  --bento-hover-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  --bento-border: rgba(255, 255, 255, 0.80);
  --gradient-text: linear-gradient(135deg, #0078D4 0%, #50C8FF 100%);
  --scrollbar-thumb: #BFBFBF;
  --scrollbar-thumb-hover: #999999;
}

.theme-fluent .bento-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.theme-cyberpunk {
  --bg: #050508;
  --fg: #F0F4F8;
  --card-bg: #0C0C16;
  --card-fg: #F0F4F8;
  --border: rgba(6, 182, 212, 0.12);
  --input: rgba(6, 182, 212, 0.08);
  --primary: #22D3EE;
  --glass-bg: rgba(12, 12, 22, 0.90);
  --glass-border: rgba(6, 182, 212, 0.15);
  --bento-shadow: 0 0 0 1px rgba(6, 182, 212, 0.07), 0 10px 30px rgba(0, 0, 0, 0.85);
  --bento-hover-shadow: 0 0 0 1px rgba(6, 182, 212, 0.20), 0 16px 40px rgba(0, 0, 0, 0.90);
  --bento-border: rgba(6, 182, 212, 0.10);
  --gradient-text: linear-gradient(135deg, #22D3EE 0%, #FFFFFF 100%);
  --scrollbar-thumb: #1E2A35;
  --scrollbar-thumb-hover: #2A3A48;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "feat: add CSS variables for claude, fluent, cyberpunk themes"
```

---

## Task 2: Rewrite `useTheme.tsx`

**Files:**
- Modify: `src/hooks/useTheme.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName =
  | "dark" | "dark-teal" | "dark-rose" | "dark-amber" | "dark-emerald" | "dark-violet"
  | "light" | "light-teal" | "light-rose" | "light-amber" | "light-emerald" | "light-violet"
  | "claude" | "fluent" | "cyberpunk";

const CLASS_MAP: Record<ThemeName, string[]> = {
  "dark":           ["dark"],
  "dark-teal":      ["dark", "theme-teal"],
  "dark-rose":      ["dark", "theme-rose"],
  "dark-amber":     ["dark", "theme-amber"],
  "dark-emerald":   ["dark", "theme-emerald"],
  "dark-violet":    ["dark", "theme-violet"],
  "light":          ["light"],
  "light-teal":     ["light", "theme-teal"],
  "light-rose":     ["light", "theme-rose"],
  "light-amber":    ["light", "theme-amber"],
  "light-emerald":  ["light", "theme-emerald"],
  "light-violet":   ["light", "theme-violet"],
  "claude":         ["light", "theme-claude"],
  "fluent":         ["light", "theme-fluent"],
  "cyberpunk":      ["dark",  "theme-cyberpunk"],
};

const ALL_THEME_CLASSES = [
  "dark", "light",
  "theme-default", "theme-teal", "theme-rose", "theme-amber",
  "theme-emerald", "theme-violet", "theme-claude", "theme-fluent", "theme-cyberpunk",
];

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(
    () => (localStorage.getItem(storageKey) as ThemeName) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...ALL_THEME_CLASSES);
    root.classList.add(...CLASS_MAP[theme]);
  }, [theme]);

  const setTheme = (next: ThemeName) => {
    localStorage.setItem(storageKey, next);
    setThemeState(next);
  };

  return (
    <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTheme.tsx
git commit -m "refactor: unify theme system — single ThemeName replaces theme+colorScheme"
```

---

## Task 3: Rewrite `useTheme.test.tsx`

**Files:**
- Modify: `src/__tests__/hooks/useTheme.test.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>;
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("returns the default theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("sets theme to light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("light"); });
    expect(result.current.theme).toBe("light");
  });

  it("sets theme back to dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("light"); });
    act(() => { result.current.setTheme("dark"); });
    expect(result.current.theme).toBe("dark");
  });

  it("persists theme to localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("light"); });
    expect(localStorage.getItem("vite-ui-theme")).toBe("light");
  });

  it("persists accent theme to localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("dark-teal"); });
    expect(localStorage.getItem("vite-ui-theme")).toBe("dark-teal");
  });

  it("applies correct classes for dark-teal", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("dark-teal"); });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-teal")).toBe(true);
  });

  it("applies correct classes for claude theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("claude"); });
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("theme-claude")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("applies correct classes for fluent theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("fluent"); });
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("theme-fluent")).toBe(true);
  });

  it("applies correct classes for cyberpunk theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("cyberpunk"); });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-cyberpunk")).toBe(true);
  });

  it("removes old classes when switching themes", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme("dark-teal"); });
    act(() => { result.current.setTheme("claude"); });
    expect(document.documentElement.classList.contains("theme-teal")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("returns context from initialState when used outside ThemeProvider", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.setTheme).toBe("function");
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/__tests__/hooks/useTheme.test.tsx
```

Expected: all 11 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/hooks/useTheme.test.tsx
git commit -m "test: update useTheme tests for unified ThemeName API"
```

---

## Task 4: Update `appStore.ts`

**Files:**
- Modify: `src/store/appStore.ts`

- [ ] **Step 1: Add the import and update `UserSettings`**

At the top of `src/store/appStore.ts`, add the import after the existing `create`/`persist` import:

```typescript
import type { ThemeName } from "../hooks/useTheme";
```

Replace the `UserSettings` interface (currently around line 98):

```typescript
export interface UserSettings {
  theme: ThemeName;
  expertModeEnabled: boolean;
  autoRefreshVitals: boolean;
  autoRefreshIntervalMs: number;
  showDeployConfirmation: boolean;
  aiAssistantEnabled: boolean;
}
```

- [ ] **Step 2: Update the store default and persist config**

In the store `(set) => ({...})` block, update the `userSettings` default (remove `colorScheme`):

```typescript
userSettings: {
  theme: "dark" as ThemeName,
  expertModeEnabled: false,
  autoRefreshVitals: true,
  autoRefreshIntervalMs: 3000,
  showDeployConfirmation: true,
  aiAssistantEnabled: false,
},
```

In the `persist(...)` second argument, add `version` and `migrate` before `partialize`:

```typescript
{
  name: "winopt-storage",
  version: 2,
  migrate: (persistedState: unknown, version: number) => {
    const state = persistedState as any;
    if (version < 2) {
      const t: string = state?.userSettings?.theme ?? "dark";
      const c: string = state?.userSettings?.colorScheme ?? "default";
      const merged = c === "default" ? t : `${t}-${c}`;
      return {
        ...state,
        userSettings: { ...state.userSettings, theme: merged, colorScheme: undefined },
      };
    }
    return state;
  },
  partialize: (state) => ({
    appliedTweaks: state.appliedTweaks,
    userSettings: state.userSettings,
    tweakFilterCategory: state.tweakFilterCategory,
    tweakFilterRisk: state.tweakFilterRisk,
    tweakSearchQuery: state.tweakSearchQuery,
  }),
}
```

- [ ] **Step 3: Commit**

```bash
git add src/store/appStore.ts
git commit -m "refactor: remove colorScheme from UserSettings, add Zustand persist v2 migration"
```

---

## Task 5: Fix five test files — remove `colorScheme` from mock `userSettings`

**Files:**
- Modify: `src/__tests__/hooks/useBackup.test.tsx`
- Modify: `src/__tests__/hooks/useSmartStore.test.tsx`
- Modify: `src/__tests__/hooks/useSystemVitals.test.tsx`
- Modify: `src/__tests__/pages/TweaksPage.integration.test.tsx`
- Modify: `src/__tests__/components/ExpertModeGate.test.tsx`

In each file, find every object that contains `colorScheme: "default"` (or `colorScheme: "default" as const`) and remove that line. The `theme` field stays.

- [ ] **Step 1: Fix `useBackup.test.tsx`** (~line 26 and ~line 40)

Remove `colorScheme: "default" as const,` from both the `mockBackupData.user_settings` object and any `useAppStore.setState` call.

- [ ] **Step 2: Fix `useSmartStore.test.tsx`** (~line 33)

Remove `colorScheme: "default",` from the `userSettings` object in `useAppStore.setState`.

- [ ] **Step 3: Fix `useSystemVitals.test.tsx`** (~lines 26, 40)

Remove `colorScheme: "default" as const,` from both `userSettings` objects.

- [ ] **Step 4: Fix `TweaksPage.integration.test.tsx`** (~line 267)

Remove `colorScheme: "default",` from the `userSettings` object.

- [ ] **Step 5: Fix `ExpertModeGate.test.tsx`** (~line 30)

Remove `colorScheme: "default",` from the `userSettings` object.

- [ ] **Step 6: Run the affected tests**

```bash
npx vitest run src/__tests__/hooks/useBackup.test.tsx src/__tests__/hooks/useSmartStore.test.tsx src/__tests__/hooks/useSystemVitals.test.tsx src/__tests__/pages/TweaksPage.integration.test.tsx src/__tests__/components/ExpertModeGate.test.tsx
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/hooks/useBackup.test.tsx src/__tests__/hooks/useSmartStore.test.tsx src/__tests__/hooks/useSystemVitals.test.tsx src/__tests__/pages/TweaksPage.integration.test.tsx src/__tests__/components/ExpertModeGate.test.tsx
git commit -m "test: remove colorScheme from mock userSettings across test suite"
```

---

## Task 6: Update `App.tsx` — remove `defaultColorScheme` props

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove `defaultColorScheme="default"` from all three `ThemeProvider` usages**

There are three occurrences in `App.tsx` (lines ~49, ~285, ~292). In each, change:

```tsx
<ThemeProvider defaultTheme="dark" defaultColorScheme="default">
```

to:

```tsx
<ThemeProvider defaultTheme="dark">
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: remove defaultColorScheme prop from ThemeProvider usages"
```

---

## Task 7: Update `Sidebar.tsx`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update the import and add ThemeName**

At the top, change:

```typescript
import { useTheme } from "../../hooks/useTheme";
```

to:

```typescript
import { useTheme } from "../../hooks/useTheme";
import type { ThemeName } from "../../hooks/useTheme";
```

- [ ] **Step 2: Replace the hook destructure and add helpers**

Find line 84 (`const { theme, setTheme, colorScheme, setColorScheme } = useTheme();`) and replace it — along with the existing `const [showColorPicker, setShowColorPicker] = useState(false);` that follows — with:

```typescript
const { theme, setTheme } = useTheme();
const [showColorPicker, setShowColorPicker] = useState(false);

const DESIGN_THEMES = ["claude", "fluent", "cyberpunk"];
const isDesignTheme = DESIGN_THEMES.includes(theme);
const classicBase = theme.startsWith("light") ? "light" : "dark";
const classicAccent = (theme === "dark" || theme === "light")
  ? "default"
  : theme.split("-")[1];

const toggleBase = () => {
  if (theme === "dark")           return setTheme("light");
  if (theme === "light")          return setTheme("dark");
  if (theme.startsWith("dark-"))  return setTheme(`light-${theme.slice(5)}` as ThemeName);
  if (theme.startsWith("light-")) return setTheme(`dark-${theme.slice(6)}` as ThemeName);
};

const setAccent = (accent: string) => {
  setTheme((accent === "default" ? classicBase : `${classicBase}-${accent}`) as ThemeName);
};
```

- [ ] **Step 3: Replace the Theme Controls JSX block**

Find the `{/* Theme Controls */}` comment block (~lines 232–270) and replace it with:

```tsx
{/* Theme Controls */}
{!isDesignTheme && (
  <div className="px-2 lg:px-5 mb-4 flex flex-col lg:flex-row lg:grid lg:grid-cols-2 gap-2">
    <button
      onClick={toggleBase}
      className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
      title="Toggle Theme"
      aria-label={classicBase === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {classicBase === "dark"
        ? <Sun className="w-4 h-4 text-slate-400" />
        : <Moon className="w-4 h-4 text-slate-500 dark:text-slate-300" />}
    </button>
    <div className="relative">
      {showColorPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-card border border-border rounded-2xl shadow-2xl flex flex-col gap-1.5 z-50">
            {COLOR_SCHEMES.map(scheme => (
              <button
                key={scheme.id}
                title={scheme.label}
                aria-label={`Set color scheme to ${scheme.label}`}
                onClick={() => { setAccent(scheme.id); setShowColorPicker(false); }}
                className={`w-5 h-5 rounded-full transition-all hover:scale-110 active:scale-95 ${classicAccent === scheme.id ? "ring-2 ring-white/40 ring-offset-2 ring-offset-card scale-110" : ""}`}
                style={{ backgroundColor: scheme.color }}
              />
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setShowColorPicker(!showColorPicker)}
        className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
        title="Change Color Theme"
        aria-label="Change color theme"
        aria-expanded={showColorPicker}
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-current opacity-60"
          style={{ backgroundColor: COLOR_SCHEMES.find(s => s.id === classicAccent)?.color ?? "#4318FF" }}
        />
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: update sidebar theme controls to use unified ThemeName"
```

---

## Task 8: Update `Sidebar.test.tsx`

**Files:**
- Modify: `src/__tests__/components/Sidebar.test.tsx`

- [ ] **Step 1: Update the `renderSidebar` wrapper** (line ~28)

Remove `defaultColorScheme="default"` from `ThemeProvider`:

```tsx
function renderSidebar(currentView: string, setView = vi.fn()) {
  return render(
    <ThemeProvider defaultTheme="dark">
      <Sidebar currentView={currentView} setView={setView} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Update the color picker close assertion** (~line 161)

Change:

```typescript
expect(localStorage.getItem("vite-ui-color")).toBe("rose");
```

to:

```typescript
expect(localStorage.getItem("vite-ui-theme")).toBe("dark-rose");
```

- [ ] **Step 3: Add a test for design theme hiding controls**

Add this test after the existing color picker tests:

```typescript
it("hides theme controls when a design theme is active", () => {
  render(
    <ThemeProvider defaultTheme="claude">
      <Sidebar currentView="dashboard" setView={vi.fn()} />
    </ThemeProvider>
  );
  expect(screen.queryByTitle("Toggle Theme")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Change Color Theme")).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/__tests__/components/Sidebar.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/components/Sidebar.test.tsx
git commit -m "test: update sidebar tests for unified theme system"
```

---

## Task 9: Update `SettingsPage.tsx`

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Update imports**

Add `ThemeName` to the `useTheme` import:

```typescript
import { useTheme } from "../hooks/useTheme";
import type { ThemeName } from "../hooks/useTheme";
```

- [ ] **Step 2: Replace `COLOR_SCHEMES` with new constants** (around line 21)

Remove the existing `COLOR_SCHEMES` constant and replace it with:

```typescript
const CLASSIC_ACCENTS = [
  { accent: "default", label: "Default", darkColor: "#3b82f6", lightColor: "#4318FF" },
  { accent: "teal",    label: "Teal",    darkColor: "#05cd99", lightColor: "#05cd99" },
  { accent: "rose",    label: "Rose",    darkColor: "#f43f5e", lightColor: "#f43f5e" },
  { accent: "amber",   label: "Amber",   darkColor: "#f59e0b", lightColor: "#f59e0b" },
  { accent: "emerald", label: "Emerald", darkColor: "#10b981", lightColor: "#10b981" },
  { accent: "violet",  label: "Violet",  darkColor: "#8b5cf6", lightColor: "#8b5cf6" },
] as const;

const DESIGN_THEME_ENTRIES = [
  { id: "claude",    label: "Claude",    description: "Warm minimal",    preview: { bg: "#F7F3EC", card: "#FDFAF5", accent: "#C96A2A" } },
  { id: "fluent",    label: "Fluent",    description: "Windows 11",      preview: { bg: "#F0F0F0", card: "#FFFFFF",  accent: "#0078D4" } },
  { id: "cyberpunk", label: "Cyberpunk", description: "Dark editorial",  preview: { bg: "#050508", card: "#0C0C16",  accent: "#22D3EE" } },
] as const;
```

- [ ] **Step 3: Add `ThemeSwatch` component** (after the `SelectOption` component, before `BackupSection`)

```tsx
function ThemeSwatch({ label, color, isActive, onClick }: {
  label: string; color: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="w-7 h-7 rounded-full transition-all hover:scale-110 active:scale-95"
      style={{
        backgroundColor: color,
        boxShadow: isActive ? `0 0 0 2px var(--color-card), 0 0 0 4px ${color}` : "none",
        opacity: isActive ? 1 : 0.65,
        transform: isActive ? "scale(1.1)" : undefined,
      }}
    />
  );
}
```

- [ ] **Step 4: Add `ThemeCard` component** (after `ThemeSwatch`)

```tsx
function ThemeCard({ id, label, description, preview, isActive, onClick }: {
  id: string; label: string; description: string;
  preview: { bg: string; card: string; accent: string };
  isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      data-testid={`theme-card-${id}`}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden transition-all hover:scale-[1.02] text-left w-full"
      style={{
        border: `2px solid ${isActive ? preview.accent : "var(--color-border)"}`,
        boxShadow: isActive ? `0 0 0 1px ${preview.accent}40` : "none",
      }}
    >
      <div className="h-[72px] flex gap-1.5 p-2" style={{ backgroundColor: preview.bg }}>
        <div className="w-5 rounded-lg flex flex-col gap-1 p-1" style={{ backgroundColor: preview.card }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-1 rounded-full" style={{
              backgroundColor: i === 1 ? preview.accent : preview.card,
              opacity: 0.6,
              border: `1px solid ${preview.accent}30`,
            }} />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-2.5 rounded" style={{ backgroundColor: preview.accent, width: "60%", opacity: 0.9 }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: preview.card, width: "90%", opacity: 0.7 }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: preview.card, width: "70%", opacity: 0.7 }} />
          <div className="h-4 rounded-lg mt-auto" style={{ backgroundColor: preview.card, border: `1px solid ${preview.accent}20` }} />
        </div>
      </div>
      <div className="px-3 py-2 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
        <p className="text-[12px] font-bold" style={{ color: "var(--color-foreground)" }}>{label}</p>
        <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{description}</p>
      </div>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: preview.accent }}>
          <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Update the `SettingsPage` component body**

In `SettingsPage` (~line 270), update the `useTheme` destructure:

```typescript
const { theme, setTheme } = useTheme();
```

(Remove `colorScheme, setColorScheme` from the destructure.)

- [ ] **Step 6: Add classic theme helpers** (after the `useTheme` destructure in `SettingsPage`)

```typescript
const isDesignTheme = ["claude", "fluent", "cyberpunk"].includes(theme);
const classicBase = theme.startsWith("light") ? "light" : "dark";
const classicAccent = (theme === "dark" || theme === "light")
  ? "default"
  : theme.split("-")[1];

const setBase = (base: "dark" | "light") => {
  setTheme((classicAccent === "default" ? base : `${base}-${classicAccent}`) as ThemeName);
};
const setAccent = (accent: string) => {
  setTheme((accent === "default" ? classicBase : `${classicBase}-${accent}`) as ThemeName);
};
```

- [ ] **Step 7: Update `handleResetDefaults`** (~line 330)

Remove the `setColorScheme("default")` call:

```typescript
const handleResetDefaults = () => {
  updateSettings({
    expertModeEnabled: false,
    autoRefreshVitals: true,
    autoRefreshIntervalMs: 3000,
    showDeployConfirmation: true,
  });
  setTheme("dark");
  localStorage.removeItem("ai-model");
  setSelectedModel("qwen2.5:1.5b");
  addToast({ type: "success", title: "Settings reset to defaults" });
};
```

- [ ] **Step 8: Replace the Appearance `SettingSection` content** (~lines 373–412)

Replace the entire inner content of the `<SettingSection icon={Palette} title="Appearance" ...>` block with:

```tsx
{/* Base mode + accent — hidden when a design theme is active */}
{!isDesignTheme && (
  <>
    <div>
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-2">Base Mode</span>
      <div className="flex gap-2 bg-black/5 dark:bg-white/[0.02] border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setBase("dark")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
            classicBase === "dark"
              ? "bg-primary/20 dark:bg-primary/15 text-primary border border-primary/20"
              : "text-slate-500 dark:text-slate-300 hover:text-foreground"
          }`}
        >
          <Moon className="w-3.5 h-3.5" /> Dark
        </button>
        <button
          onClick={() => setBase("light")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
            classicBase === "light"
              ? "bg-primary/20 dark:bg-primary/15 text-primary border border-primary/20"
              : "text-slate-500 dark:text-slate-300 hover:text-foreground"
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> Light
        </button>
      </div>
    </div>
    <div>
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-2">Accent Color</span>
      <div className="flex gap-2.5">
        {CLASSIC_ACCENTS.map(({ accent, label, darkColor, lightColor }) => (
          <ThemeSwatch
            key={accent}
            label={label}
            color={classicBase === "dark" ? darkColor : lightColor}
            isActive={classicAccent === accent}
            onClick={() => setAccent(accent)}
          />
        ))}
      </div>
    </div>
  </>
)}

{/* Design themes */}
<div>
  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-2">Design Themes</span>
  <div className="grid grid-cols-3 gap-3">
    {DESIGN_THEME_ENTRIES.map(entry => (
      <ThemeCard
        key={entry.id}
        id={entry.id}
        label={entry.label}
        description={entry.description}
        preview={entry.preview}
        isActive={theme === entry.id}
        onClick={() => setTheme(entry.id as ThemeName)}
      />
    ))}
  </div>
  {isDesignTheme && (
    <button
      onClick={() => setTheme("dark")}
      className="mt-3 text-[12px] font-medium text-slate-500 dark:text-slate-300 hover:text-foreground transition-colors"
    >
      ← Back to Classic themes
    </button>
  )}
</div>
```

- [ ] **Step 9: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: replace Appearance section with unified theme picker (ThemeSwatch + ThemeCard)"
```

---

## Task 10: Update `SettingsPage.test.tsx`

**Files:**
- Modify: `src/__tests__/pages/SettingsPage.test.tsx`

- [ ] **Step 1: Update `resetStore` function** (~line 31)

Remove `colorScheme: "default",` from the `userSettings` object:

```typescript
function resetStore() {
  useAppStore.setState({
    userSettings: {
      theme: "dark",
      expertModeEnabled: false,
      autoRefreshVitals: true,
      autoRefreshIntervalMs: 3000,
      showDeployConfirmation: true,
      aiAssistantEnabled: false,
    },
  });
}
```

- [ ] **Step 2: Update the Reset Defaults test** (~line 66)

Remove `colorScheme: "default",` from the `useAppStore.setState` call inside that test. Also update the `userSettings` assertion if present to not check `colorScheme`.

- [ ] **Step 3: Update the "renders theme toggle buttons" test** (~line 55)

The test checks for `dark` and `light` buttons — these are still rendered when `theme: "dark"` (a classic theme). No change needed to the assertion. But verify it still passes after other changes.

- [ ] **Step 4: Add imports and a `renderWithTheme` helper** at the top of the test file

Add `ThemeProvider` to the imports:

```typescript
import { ThemeProvider } from "@/hooks/useTheme";
import type { ThemeName } from "@/hooks/useTheme";
```

Add a helper below `resetStore`:

```typescript
function renderWithTheme(initialTheme: ThemeName = "dark") {
  return render(
    <ThemeProvider defaultTheme={initialTheme}>
      <SettingsPage />
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Add tests for design theme cards**

```typescript
it("renders all three design theme cards", () => {
  renderWithTheme();
  expect(screen.getByTestId("theme-card-claude")).toBeInTheDocument();
  expect(screen.getByTestId("theme-card-fluent")).toBeInTheDocument();
  expect(screen.getByTestId("theme-card-cyberpunk")).toBeInTheDocument();
});

it("clicking a design theme card updates the theme", async () => {
  const user = setupUser();
  renderWithTheme();
  await user.click(screen.getByTestId("theme-card-claude"));
  expect(localStorage.getItem("vite-ui-theme")).toBe("claude");
});

it("hides base mode and accent controls when a design theme is active", () => {
  useAppStore.setState({
    userSettings: {
      theme: "claude",
      expertModeEnabled: false,
      autoRefreshVitals: true,
      autoRefreshIntervalMs: 3000,
      showDeployConfirmation: true,
      aiAssistantEnabled: false,
    },
  });
  renderWithTheme("claude");
  expect(screen.queryByRole("button", { name: /dark/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /light/i })).not.toBeInTheDocument();
});

it("clicking Back to Classic resets theme to dark", async () => {
  useAppStore.setState({
    userSettings: {
      theme: "claude",
      expertModeEnabled: false,
      autoRefreshVitals: true,
      autoRefreshIntervalMs: 3000,
      showDeployConfirmation: true,
      aiAssistantEnabled: false,
    },
  });
  const user = setupUser();
  renderWithTheme("claude");
  await user.click(screen.getByText(/back to classic/i));
  expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
});
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run src/__tests__/pages/SettingsPage.test.tsx
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/pages/SettingsPage.test.tsx
git commit -m "test: update SettingsPage tests for unified theme picker"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run the full type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (769+).

- [ ] **Step 3: Start the dev server and manually verify**

```bash
npm run dev
```

Open the app, navigate to Settings → Appearance. Verify:
- Dark / Light toggle works and accent swatches update correctly
- Clicking Claude card switches to warm cream background, orange accent
- Clicking Fluent card switches to light gray background, blue accent, frosted cards
- Clicking Cyberpunk card switches to near-black background, cyan borders and accent
- "← Back to Classic themes" button appears when a design theme is active and works
- Sidebar hides the dark/light toggle and color picker when a design theme is active
- Refreshing the page preserves the chosen theme (localStorage)
