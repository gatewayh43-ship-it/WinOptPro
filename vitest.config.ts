import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        exclude: ["node_modules", "dist", "e2e"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/main.tsx",
                "src/App.tsx", // app shell is covered by browser E2E
                "src/pages/**", // route-level UI is covered by browser E2E
                "src/vite-env.d.ts",
                "src/test/**",
                "src/**/*.d.ts",
                "src/components/ui/**", // shadcn generated — skip coverage
                "src/components/WslSetupWizard.tsx", // VM-only system flow
                "src/hooks/usePower.ts", // Windows powercfg integration path
                "src/hooks/useWsl.ts", // VM/Windows integration path
                "src/lib/semanticWorker.ts", // browser worker + ML runtime integration
            ],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
        },
    },
});
