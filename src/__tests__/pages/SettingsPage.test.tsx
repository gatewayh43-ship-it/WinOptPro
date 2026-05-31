import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, setupUser, waitFor } from "@/test/utils";
import { SettingsPage } from "@/pages/SettingsPage";
import { useAppStore } from "@/store/appStore";
import { ThemeProvider } from "@/hooks/useTheme";
import type { ReactNode, ReactElement } from "react";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/hooks/useSystemVitals", () => ({
    useSystemVitals: vi.fn(() => ({
        vitals: {
            ram: { totalMb: 16384, usedMb: 8192, usagePct: 50 },
            gpu: { name: "NVIDIA RTX 3080", driverVersion: "531.00", vramMb: 10240 },
        },
        refresh: vi.fn(),
    })),
}));

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

function renderWithTheme(ui: ReactElement) {
    return render(
        <ThemeProvider defaultTheme="dark">
            {ui}
        </ThemeProvider>
    );
}

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

describe("SettingsPage", () => {
    beforeEach(() => {
        resetStore();
        localStorage.clear();
        vi.mocked(tauriCore.invoke).mockClear();
    });

    it("renders Appearance, System Monitoring, and Safety sections", () => {
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        expect(screen.getByText("Appearance")).toBeInTheDocument();
        expect(screen.getByText("System Monitoring")).toBeInTheDocument();
        expect(screen.getByText("Safety & Execution")).toBeInTheDocument();
    });

    it("renders reset defaults button", () => {
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        expect(screen.getByRole("button", { name: /reset defaults/i })).toBeInTheDocument();
    });

    it("Reset Defaults restores settings to defaults", async () => {
        useAppStore.setState({
            userSettings: {
                theme: "dark",
                expertModeEnabled: true,
                autoRefreshVitals: false,
                autoRefreshIntervalMs: 10000,
                showDeployConfirmation: false,
                aiAssistantEnabled: false,
            },
        });
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /reset defaults/i }));
        const settings = useAppStore.getState().userSettings;
        expect(settings.expertModeEnabled).toBe(false);
        expect(settings.autoRefreshVitals).toBe(true);
        expect(settings.autoRefreshIntervalMs).toBe(3000);
        expect(settings.showDeployConfirmation).toBe(true);
    });

    it("toggling expert mode shows confirmation modal", async () => {
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        const expertToggle = screen.getByRole("button", { name: /expert mode/i });
        await user.click(expertToggle);
        expect(await screen.findByText("Expert Mode Warning")).toBeInTheDocument();
    });

    it("Cancel in expert mode modal closes it without enabling", async () => {
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /expert mode/i }));
        await screen.findByText("Expert Mode Warning");
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(false);
    });

    it("I Understand enables expert mode and closes modal", async () => {
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /expert mode/i }));
        await screen.findByText("Expert Mode Warning");
        await user.click(screen.getByRole("button", { name: /i understand, enable/i }));
        await waitFor(() => expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument());
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(true);
    });

    it("disabling expert mode directly (no modal) updates store", async () => {
        useAppStore.setState({
            userSettings: { ...useAppStore.getState().userSettings, expertModeEnabled: true },
        });
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        const expertToggle = screen.getByRole("button", { name: /expert mode/i });
        await user.click(expertToggle);
        // Turning it OFF should not show modal
        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(false);
    });

    it("Auto-refresh toggle updates store", async () => {
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        const autoRefreshToggle = screen.getByRole("button", { name: /auto-refresh system vitals/i });
        await user.click(autoRefreshToggle);
        expect(useAppStore.getState().userSettings.autoRefreshVitals).toBe(false);
    });

    it("Deploy confirmation toggle updates store", async () => {
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
        const confirmToggle = screen.getByRole("button", { name: /show confirmation before deploying/i });
        await user.click(confirmToggle);
        expect(useAppStore.getState().userSettings.showDeployConfirmation).toBe(false);
    });

    it("checks GitHub Releases for app updates", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValueOnce(null);
        const user = setupUser();
        renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: /^check$/i }));

        expect(tauriCore.invoke).toHaveBeenCalledWith("check_for_update");
        expect(await screen.findByText("WinOpt Pro is up to date.")).toBeInTheDocument();
    });

    describe("Appearance section", () => {
        it("renders classic dark swatches", () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            expect(screen.getByTestId("theme-swatch-dark")).toBeInTheDocument();
            expect(screen.getByTestId("theme-swatch-dark-teal")).toBeInTheDocument();
            expect(screen.getByTestId("theme-swatch-dark-violet")).toBeInTheDocument();
        });

        it("renders classic light swatches", () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            expect(screen.getByTestId("theme-swatch-light")).toBeInTheDocument();
            expect(screen.getByTestId("theme-swatch-light-rose")).toBeInTheDocument();
        });

        it("renders signature design theme swatches", () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            expect(screen.getByTestId("theme-swatch-claude")).toBeInTheDocument();
            expect(screen.getByTestId("theme-swatch-fluent")).toBeInTheDocument();
            expect(screen.getByTestId("theme-swatch-cyberpunk")).toBeInTheDocument();
        });

        it("clicking a theme swatch updates localStorage", async () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            fireEvent.click(screen.getByTestId("theme-swatch-dark-rose"));
            expect(localStorage.getItem("vite-ui-theme")).toBe("dark-rose");
        });

        it("clicking a light accent swatch updates localStorage", async () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            fireEvent.click(screen.getByTestId("theme-swatch-light-violet"));
            expect(localStorage.getItem("vite-ui-theme")).toBe("light-violet");
        });

        it("clicking a signature theme swatch updates localStorage", async () => {
            renderWithTheme(<SettingsPage onTriggerGuide={vi.fn()} />);
            fireEvent.click(screen.getByTestId("theme-swatch-cyberpunk"));
            expect(localStorage.getItem("vite-ui-theme")).toBe("cyberpunk");
        });
    });
});
