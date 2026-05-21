import { test, expect, Page } from "@playwright/test";

async function skipOnboarding(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem("consent-accepted", "true");
        window.localStorage.setItem("onboardingComplete", "true");
    });
    await page.goto("/");
}

async function openNetworkOptimizer(page: Page) {
    await page.getByTitle("Network Optimizer", { exact: true }).click();
    await expect(page.getByRole("heading", { name: /Network Optimizer/i })).toBeVisible({ timeout: 10000 });
}

function tab(page: Page, name: string) {
    return page.locator("main").getByRole("button", { name, exact: true });
}

test.describe("Network Optimizer", () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page);
    });

    test("opens from the sidebar and renders telemetry overview", async ({ page }) => {
        await openNetworkOptimizer(page);

        await expect(page.getByText("Recommendation Engine")).toBeVisible();
        await expect(page.getByText("Active Talkers")).toBeVisible();
        await expect(page.getByText("Network telemetry utility")).toBeVisible();
        await expect(page.getByText("Gaming Low Latency")).not.toBeVisible();
    });

    test("navigates across diagnostic tabs without losing the selected adapter", async ({ page }) => {
        await openNetworkOptimizer(page);

        const adapterSelect = page.getByLabel("Select adapter for network actions");
        await expect(adapterSelect).toBeVisible();
        await adapterSelect.selectOption("Wi-Fi");

        await tab(page, "Adapters").click();
        await expect(page.getByText("Driver properties").first()).toBeVisible();

        await tab(page, "Wi-Fi").click();
        await expect(page.getByText("Wireless Diagnostics")).toBeVisible();

        await tab(page, "DNS").click();
        await expect(page.getByText("Resolver Actions")).toBeVisible();
        await expect(page.getByText(/selected adapter:/i)).toContainText("Wi-Fi");

        await tab(page, "Latency").click();
        await expect(page.getByText("Bufferbloat Read")).toBeVisible();

        await tab(page, "Profiles").click();
        await expect(page.getByText("Gaming Low Latency")).toBeVisible();
        await expect(page.getByText("Privacy DNS Baseline")).toBeVisible();
    });

    test("supports the browser-mode custom DNS action flow", async ({ page }) => {
        await openNetworkOptimizer(page);

        await tab(page, "DNS").click();
        await page.getByPlaceholder("Primary IPv4 DNS").fill("9.9.9.9");
        await page.getByPlaceholder("Secondary IPv4 DNS (optional)").fill("149.112.112.112");
        await page.getByRole("button", { name: "Apply Custom DNS" }).click();

        await expect(page.getByText(/Simulated network action|Network action applied/i)).toBeVisible({ timeout: 10000 });
    });
});
