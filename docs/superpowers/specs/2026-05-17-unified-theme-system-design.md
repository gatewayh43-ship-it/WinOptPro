# Unified Theme System — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  

---

## Overview

Replace the current two-layer theme model (`theme: "dark"|"light"` + `colorScheme: ColorScheme`) with a single `ThemeName` string that covers all combinations, including three new standalone design themes: **Claude**, **Fluent**, and **Cyberpunk**. Users pick a theme from the Settings page; adding future themes requires touching only CSS, a type union, and the settings config array.

---

## Data Model

### `ThemeName` type (new, shared across `useTheme` and `appStore`)

```typescript
type ThemeName =
  | "dark" | "dark-teal" | "dark-rose" | "dark-amber" | "dark-emerald" | "dark-violet"
  | "light" | "light-teal" | "light-rose" | "light-amber" | "light-emerald" | "light-violet"
  | "claude" | "fluent" | "cyberpunk";
```

Default value: `"dark"` (matches current default).

### `UserSettings` in `appStore.ts`

- Remove `colorScheme: "default" | "teal" | ...` field
- Change `theme: "dark" | "light"` → `theme: ThemeName`
- Bump Zustand persist `version` to `2`
- Add `migrate` function:

```typescript
migrate: (state: any, version: number) => {
  if (version < 2) {
    const t = state.userSettings?.theme ?? "dark";
    const c = state.userSettings?.colorScheme ?? "default";
    const merged = c === "default" ? t : `${t}-${c}`;
    return {
      ...state,
      userSettings: { ...state.userSettings, theme: merged, colorScheme: undefined },
    };
  }
  return state;
},
```

Existing localStorage values `"dark"` / `"light"` are valid `ThemeName` values — no disruption for users who never changed their accent color.

---

## `useTheme` Hook (`src/hooks/useTheme.tsx`)

### Simplified API

```typescript
type ThemeProviderState = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};
```

`colorScheme` and `setColorScheme` removed entirely.

### Class mapping

The `ThemeProvider` `useEffect` uses a static map to translate `ThemeName` → HTML class list:

```typescript
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
```

`claude` and `fluent` include `"light"` so all `dark:` Tailwind utilities remain inactive. `cyberpunk` includes `"dark"` so they activate. All existing `dark:` utility classes in the codebase continue to work without modification.

### Storage

Single `localStorage` key `"vite-ui-theme"` (existing key, no change).

---

## CSS — New Theme Classes (`src/App.css`)

Three new CSS blocks appended after the existing `theme-violet` block. They appear after `.dark` in source order, so their variable overrides win regardless of which base class is also present.

### `.theme-claude`

Warm minimal, Anthropic aesthetic. Light background, warm parchment cards, amber-orange accent. No glows.

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
```

### `.theme-fluent`

Windows 11 Mica/Acrylic. Light gray background, translucent frosted cards (`backdrop-filter: blur(20px)`), Windows blue accent.

```css
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
```

### `.theme-cyberpunk`

Dark editorial, Vercel/Linear aesthetic. Near-black with blue tint, cyan accent that bleeds into borders and card halos. Activated alongside `dark` class.

```css
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

---

## Settings Page UI (`src/pages/SettingsPage.tsx`)

### Appearance section replaces

- The dark/light `Toggle` component (removed)
- The `COLOR_SCHEMES` array and swatch grid (removed)

### Replaces with

**`THEMES` config array** — all 15 theme names with metadata:

```typescript
const THEMES = [
  // Classic Dark
  { id: "dark",          label: "Default",  group: "classic-dark",  color: "#3b82f6" },
  { id: "dark-teal",     label: "Teal",     group: "classic-dark",  color: "#05cd99" },
  { id: "dark-rose",     label: "Rose",     group: "classic-dark",  color: "#f43f5e" },
  { id: "dark-amber",    label: "Amber",    group: "classic-dark",  color: "#f59e0b" },
  { id: "dark-emerald",  label: "Emerald",  group: "classic-dark",  color: "#10b981" },
  { id: "dark-violet",   label: "Violet",   group: "classic-dark",  color: "#8b5cf6" },
  // Classic Light
  { id: "light",         label: "Default",  group: "classic-light", color: "#4318FF" },
  { id: "light-teal",    label: "Teal",     group: "classic-light", color: "#05cd99" },
  { id: "light-rose",    label: "Rose",     group: "classic-light", color: "#f43f5e" },
  { id: "light-amber",   label: "Amber",    group: "classic-light", color: "#f59e0b" },
  { id: "light-emerald", label: "Emerald",  group: "classic-light", color: "#10b981" },
  { id: "light-violet",  label: "Violet",   group: "classic-light", color: "#8b5cf6" },
  // Design Themes
  { id: "claude",        label: "Claude",     group: "design", color: "#C96A2A",
    description: "Warm minimal",    preview: { bg: "#F7F3EC", card: "#FDFAF5", accent: "#C96A2A" } },
  { id: "fluent",        label: "Fluent",     group: "design", color: "#0078D4",
    description: "Windows 11",      preview: { bg: "#F0F0F0", card: "#FFFFFF",  accent: "#0078D4" } },
  { id: "cyberpunk",     label: "Cyberpunk",  group: "design", color: "#22D3EE",
    description: "Dark editorial",  preview: { bg: "#050508", card: "#0C0C16",  accent: "#22D3EE" } },
] as const;
```

**`ThemeSwatch`** — 36px circle, color dot, label below, active ring in that theme's color. Used for classic dark and classic light rows.

**`ThemeCard`** — ~120px tall card with a mini CSS preview (fake sidebar strip + two fake card blocks rendered inline using the theme's `preview` colors). Name + description below. Active ring in that theme's primary color. Used for the design themes 3-column grid.

**Section layout:**

```
[section header: Palette icon, "Appearance", "Choose your theme"]

  CLASSIC DARK        ← small label
  [swatch][swatch][swatch][swatch][swatch][swatch]

  CLASSIC LIGHT
  [swatch][swatch][swatch][swatch][swatch][swatch]

  DESIGN THEMES
  [ThemeCard: Claude] [ThemeCard: Fluent] [ThemeCard: Cyberpunk]
```

---

## Sidebar Controls (`src/components/layout/Sidebar.tsx`)

The sidebar footer has two quick-access controls that also use `useTheme`: a dark/light toggle button and a color-picker popover. Both need updating.

### Classic themes — keep both controls working

Derive base and accent from the theme name:

```typescript
const isDesignTheme = ["claude", "fluent", "cyberpunk"].includes(theme);

// toggle base while preserving accent
const toggleBase = () => {
  if (theme === "dark")           return setTheme("light");
  if (theme === "light")          return setTheme("dark");
  if (theme.startsWith("dark-"))  return setTheme(`light-${theme.slice(5)}` as ThemeName);
  if (theme.startsWith("light-")) return setTheme(`dark-${theme.slice(6)}` as ThemeName);
};

// change accent while preserving base
const setAccent = (accent: string) => {
  const base = theme.startsWith("light") ? "light" : "dark";
  setTheme(accent === "default" ? base : `${base}-${accent}` as ThemeName);
};

// current accent for the active ring on the swatch
const currentAccent = theme === "dark" || theme === "light"
  ? "default"
  : theme.split("-")[1];
```

### Design themes — hide both controls

When `isDesignTheme` is true, render neither the toggle nor the color picker in the sidebar. The user changes design themes from the Settings page.

---

## Affected Files

| File | Change |
|---|---|
| `src/hooks/useTheme.tsx` | Rewrite — remove `colorScheme`, simplify to `theme: ThemeName` + `CLASS_MAP` |
| `src/App.css` | Add 3 new theme CSS blocks + `.theme-fluent .bento-card` rule |
| `src/store/appStore.ts` | Remove `colorScheme` from `UserSettings`, change `theme` type, add persist `version: 2` + `migrate` |
| `src/pages/SettingsPage.tsx` | Replace dark/light toggle + swatch grid with `THEMES` config + `ThemeSwatch` + `ThemeCard` |
| `src/components/layout/Sidebar.tsx` | Replace `colorScheme`/`setColorScheme` with derived logic; hide controls when design theme active |
| `src/__tests__/hooks/useTheme.test.tsx` | Rewrite for new API — remove `colorScheme` assertions, add `ThemeName` + `CLASS_MAP` coverage |
| `src/__tests__/pages/SettingsPage.test.tsx` | Remove `colorScheme` from mock `userSettings`; add tests for new theme picker UI |
| `src/__tests__/components/Sidebar.test.tsx` | Update mock `userSettings` + assertions for new toggle/picker logic |
| `src/__tests__/hooks/useBackup.test.tsx` | Remove `colorScheme` from mock `userSettings` object |
| `src/__tests__/hooks/useSmartStore.test.tsx` | Remove `colorScheme` from mock `userSettings` object |
| `src/__tests__/hooks/useSystemVitals.test.tsx` | Remove `colorScheme` from mock `userSettings` object |
| `src/__tests__/pages/TweaksPage.integration.test.tsx` | Remove `colorScheme` from mock `userSettings` object |
| `src/__tests__/components/ExpertModeGate.test.tsx` | Remove `colorScheme` from mock `userSettings` object |

---

## Future Theme Addition Checklist

Adding a new theme in the future requires only:

1. Add CSS block to `App.css`
2. Add name to `ThemeName` union in `useTheme.tsx`
3. Add entry to `CLASS_MAP` in `useTheme.tsx`
4. Add entry to `THEMES` array in `SettingsPage.tsx`
