# WinOpt Pro

Tauri 2 + React 19 Windows optimization app. UI prototype — Rust backend has no real commands yet.

## Commands
```
npm run dev          # frontend only (Vite)
npm run tauri dev    # full desktop app
npm run tauri build  # production build
npx shadcn add <c>   # add shadcn component → src/components/ui/
```

## Non-obvious constraints
- **Tailwind 4**: config lives in CSS (`src/index.css`), no `tailwind.config.js`
- **No react-router**: views switch via state in `App.tsx`
- **Rust backend**: only `greet()` exists — don't call non-existent Tauri commands
- **shadcn**: uses `radix-ui` (v1 monorepo), not individual `@radix-ui/react-*` packages
