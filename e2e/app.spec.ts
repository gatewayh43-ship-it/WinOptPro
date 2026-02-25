import { test, expect } from "@playwright/test";

test.describe("WinOpt Pro — Core Navigation", () => {
    test.beforeEach(async ({ page }) => {
        // Clear onboarding so it doesn't block tests
        await page.goto("/");
        await page.evaluate(() => localStorage.setItem("onboardingComplete", "true"));
        await page.reload();
    });

    test("loads the dashboard view by default", async ({ page }) => {
        await expect(page.getByText(/system health/i)).toBeVisible({ timeout: 10000 });
    });

    test("navigates to Performance view via sidebar", async ({ page }) => {
        await page.getByTitle("Performance").click();
        await expect(page.getByText(/Performance/i).first()).toBeVisible();
    });

    test("navigates to Privacy view via sidebar", async ({ page }) => {
        await page.getByTitle("Privacy & Security").click();
        await expect(page.getByText(/Privacy/i).first()).toBeVisible();
    });
});

test.describe("WinOpt Pro — Onboarding", () => {
    test("shows onboarding modal on first visit", async ({ page }) => {
        await page.goto("/");
        // On first load localStorage is empty → onboarding should show
        await expect(page.getByText(/Interactive Guide/i)).toBeVisible({ timeout: 8000 });
    });

    test("advances through all steps and closes", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText(/Interactive Guide/i)).toBeVisible();
        // Step 1 → 2
        await page.getByRole("button", { name: /next/i }).click();
        await expect(page.getByText(/Granular OS Tuning/i)).toBeVisible();
        // Step 2 → 3
        await page.getByRole("button", { name: /next/i }).click();
        await expect(page.getByText(/Contextual Education/i)).toBeVisible();
        // Finish
        await page.getByRole("button", { name: /get started/i }).click();
        await expect(page.getByText(/Interactive Guide/i)).not.toBeVisible();
    });

    test("does not show onboarding on subsequent visits", async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.setItem("onboardingComplete", "true"));
        await page.reload();
        await expect(page.getByText(/Interactive Guide/i)).not.toBeVisible();
    });
});

test.describe("WinOpt Pro — Command Palette", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.setItem("onboardingComplete", "true"));
        await page.reload();
    });

    test("opens command palette with Ctrl+K", async ({ page }) => {
        await page.keyboard.press("Control+k");
        await expect(page.getByPlaceholder(/search tweaks/i)).toBeVisible();
    });

    test("closes command palette with Escape", async ({ page }) => {
        await page.keyboard.press("Control+k");
        await expect(page.getByPlaceholder(/search tweaks/i)).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByPlaceholder(/search tweaks/i)).not.toBeVisible();
    });

    test("filters tweaks by search query", async ({ page }) => {
        await page.keyboard.press("Control+k");
        await page.getByPlaceholder(/search tweaks/i).fill("sysmain");
        await expect(page.getByText(/sysmain/i)).toBeVisible();
    });

    test("shows empty state for unmatched query", async ({ page }) => {
        await page.keyboard.press("Control+k");
        await page.getByPlaceholder(/search tweaks/i).fill("xyzzy_nothing");
        await expect(page.getByText(/no optimizations found/i)).toBeVisible();
    });
});

test.describe("WinOpt Pro — Tweaks Page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.setItem("onboardingComplete", "true"));
        await page.reload();
        await page.getByTitle("Performance").click();
    });

    test("shows risk filter chips", async ({ page }) => {
        await expect(page.getByText("All")).toBeVisible();
        await expect(page.getByText("Green")).toBeVisible();
        await expect(page.getByText("Yellow")).toBeVisible();
        await expect(page.getByText("Red")).toBeVisible();
    });

    test("opens inspector when a tweak card is clicked", async ({ page }) => {
        // Click first tweak card
        const cards = page.locator('[data-testid="tweak-card"], .rounded-2xl button').first();
        await cards.click();
        await expect(page.getByText(/Mechanical Summary/i)).toBeVisible({ timeout: 5000 });
    });
});
