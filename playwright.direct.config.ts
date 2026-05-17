import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    timeout: 1800000,
    reporter: [
        ["list"],
        ["json", { outputFile: "test-results/vm-direct/playwright-direct-results.json" }],
    ],
});
