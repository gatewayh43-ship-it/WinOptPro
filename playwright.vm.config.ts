/**
 * Playwright config for VM E2E testing.
 * 
 * Differences from standard config:
 * - Captures screenshots and video on EVERY test (not just failures)
 * - Longer timeouts for VM-based tests (tweak execution + checkpoint restore)
 * - JSON reporter for structured results
 * - Supports connecting to a remote VM via VM_URL env var
 */

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.VM_URL || "http://localhost:1420";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false, // Sequential for VM tests — tweaks affect shared system state
    forbidOnly: !!process.env.CI,
    retries: 0, // No retries — partially-applied tweaks must not be re-attempted
    workers: 1, // Single worker for VM testing
    timeout: 120000, // 2 minutes per test (some tweaks are slow)
    expect: {
        timeout: 15000, // 15s for expect assertions
    },
    reporter: [
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "test-results/vm-test-results.json" }],
        ["list"],
    ],
    use: {
        baseURL,
        trace: "on", // Capture trace for EVERY test
        screenshot: "on", // Screenshot EVERY test
        video: "on", // Record video of EVERY test
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: "vm-chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: process.env.VM_URL
        ? undefined // Don't start a server if connecting to remote VM
        : {
            command: "npm run dev",
            url: "http://localhost:1420",
            reuseExistingServer: true,
            timeout: 60000,
        },
});
