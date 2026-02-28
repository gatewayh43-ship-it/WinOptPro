import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { SettingsPage } from "@/pages/SettingsPage";
import { useAppStore } from "@/store/appStore";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, animate }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode; animate?: unknown }) => (
                <div className={className} style={typeof animate === "object" && animate !== null ? (animate as React.CSSProperties) : {}}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

function resetStore() {
    useAppStore.setState({
        userSettings: {
            theme: "dark",
            colorScheme: "default",
            expertModeEnabled: false,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: 3000,
            showDeployConfirmation: true,
        },
    });
}

describe("SettingsPage", () => {
    beforeEach(resetStore);

    it("renders Appearance, System Monitoring, and Safety sections", () => {
        render(<SettingsPage />);
        expect(screen.getByText("Appearance")).toBeInTheDocument();
        expect(screen.getByText("System Monitoring")).toBeInTheDocument();
        expect(screen.getByText("Safety & Execution")).toBeInTheDocument();
    });

    it("renders theme toggle buttons", () => {
        render(<SettingsPage />);
        expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
    });

    it("renders reset defaults button", () => {
        render(<SettingsPage />);
        expect(screen.getByRole("button", { name: /reset defaults/i })).toBeInTheDocument();
    });

    it("Reset Defaults restores settings to defaults", async () => {
        useAppStore.setState({
            userSettings: {
                theme: "dark",
                colorScheme: "default",
                expertModeEnabled: true,
                autoRefreshVitals: false,
                autoRefreshIntervalMs: 10000,
                showDeployConfirmation: false,
            },
        });
        const user = setupUser();
        render(<SettingsPage />);
        await user.click(screen.getByRole("button", { name: /reset defaults/i }));
        const settings = useAppStore.getState().userSettings;
        expect(settings.expertModeEnabled).toBe(false);
        expect(settings.autoRefreshVitals).toBe(true);
        expect(settings.autoRefreshIntervalMs).toBe(3000);
        expect(settings.showDeployConfirmation).toBe(true);
    });

    it("toggling expert mode shows confirmation modal", async () => {
        const user = setupUser();
        render(<SettingsPage />);
        const expertToggle = screen.getByRole("button", { name: /expert mode/i });
        await user.click(expertToggle);
        expect(await screen.findByText("Expert Mode Warning")).toBeInTheDocument();
    });

    it("Cancel in expert mode modal closes it without enabling", async () => {
        const user = setupUser();
        render(<SettingsPage />);
        await user.click(screen.getByRole("button", { name: /expert mode/i }));
        await screen.findByText("Expert Mode Warning");
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(false);
    });

    it("I Understand enables expert mode and closes modal", async () => {
        const user = setupUser();
        render(<SettingsPage />);
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
        render(<SettingsPage />);
        const expertToggle = screen.getByRole("button", { name: /expert mode/i });
        await user.click(expertToggle);
        // Turning it OFF should not show modal
        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(false);
    });

    it("Auto-refresh toggle updates store", async () => {
        const user = setupUser();
        render(<SettingsPage />);
        const autoRefreshToggle = screen.getByRole("button", { name: /auto-refresh system vitals/i });
        await user.click(autoRefreshToggle);
        expect(useAppStore.getState().userSettings.autoRefreshVitals).toBe(false);
    });

    it("Deploy confirmation toggle updates store", async () => {
        const user = setupUser();
        render(<SettingsPage />);
        const confirmToggle = screen.getByRole("button", { name: /show confirmation before deploying/i });
        await user.click(confirmToggle);
        expect(useAppStore.getState().userSettings.showDeployConfirmation).toBe(false);
    });

    it("renders color scheme swatches", () => {
        render(<SettingsPage />);
        expect(screen.getByTitle("Violet")).toBeInTheDocument();
        expect(screen.getByTitle("Teal")).toBeInTheDocument();
        expect(screen.getByTitle("Rose")).toBeInTheDocument();
    });
});
