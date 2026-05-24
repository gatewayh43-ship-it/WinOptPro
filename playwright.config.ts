import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
const includeFirefox = process.env.PLAYWRIGHT_INCLUDE_FIREFOX === "1";

const projects = [
    {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
    },
    ...(includeFirefox
        ? [{
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        }]
        : []),
];

export default defineConfig({
    testDir: "./e2e",
    testIgnore: [
        "**/tweaks-lifecycle.spec.ts",
        "**/vm-tweak-direct.spec.ts",
        "**/features-direct.spec.ts",
    ],
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 2,
    reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
    use: {
        baseURL: "http://localhost:1420",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "on-first-retry",
    },
    projects,
    ...(skipWebServer ? {} : {
        webServer: {
            command: "node node_modules/vite/bin/vite.js --host 127.0.0.1",
            url: "http://localhost:1420",
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
        },
    }),
});
