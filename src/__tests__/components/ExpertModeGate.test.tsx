import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { ExpertModeGate } from "@/components/ExpertModeGate";
import { useAppStore } from "@/store/appStore";
import type { ReactNode } from "react";

// ── Framer Motion mock ────────────────────────────────────────────────────────

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setExpertMode(enabled: boolean) {
    useAppStore.setState({
        userSettings: {
            theme: "dark",
            colorScheme: "default",
            expertModeEnabled: enabled,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: 3000,
            showDeployConfirmation: true,
            aiAssistantEnabled: false,
        },
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExpertModeGate", () => {
    beforeEach(() => {
        setExpertMode(false);
    });

    // ── Expert mode ON ────────────────────────────────────────────────────────

    it("renders children when expert mode is enabled", () => {
        setExpertMode(true);
        render(
            <ExpertModeGate>
                <p>Secret content</p>
            </ExpertModeGate>
        );
        expect(screen.getByText("Secret content")).toBeInTheDocument();
    });

    it("does NOT show the lock overlay when expert mode is enabled", () => {
        setExpertMode(true);
        render(
            <ExpertModeGate>
                <p>Secret content</p>
            </ExpertModeGate>
        );
        expect(screen.queryByText("Expert Mode Required")).not.toBeInTheDocument();
    });

    // ── Expert mode OFF ───────────────────────────────────────────────────────

    it("shows the 'Expert Mode Required' overlay when disabled", () => {
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );
        expect(screen.getByText("Expert Mode Required")).toBeInTheDocument();
    });

    it("renders the 'Enable Expert Mode' button when disabled", () => {
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );
        expect(screen.getByRole("button", { name: /enable expert mode/i })).toBeInTheDocument();
    });

    it("blurs children content in overlay (renders them hidden)", () => {
        render(
            <ExpertModeGate>
                <p>Blurred content</p>
            </ExpertModeGate>
        );
        // Children still appear in DOM but behind blur/opacity classes
        expect(screen.getByText("Blurred content")).toBeInTheDocument();
    });

    it("shows the custom message when provided", () => {
        render(
            <ExpertModeGate message="Custom warning message">
                <p>Hidden</p>
            </ExpertModeGate>
        );
        expect(screen.getByText("Custom warning message")).toBeInTheDocument();
    });

    it("shows the default message when no custom message provided", () => {
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );
        expect(screen.getByText(/requires advanced knowledge/i)).toBeInTheDocument();
    });

    // ── hideCompletely prop ───────────────────────────────────────────────────

    it("renders nothing when hideCompletely=true and expert mode is disabled", () => {
        const { container } = render(
            <ExpertModeGate hideCompletely>
                <p>Completely hidden</p>
            </ExpertModeGate>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders children when hideCompletely=true but expert mode IS enabled", () => {
        setExpertMode(true);
        render(
            <ExpertModeGate hideCompletely>
                <p>Visible content</p>
            </ExpertModeGate>
        );
        expect(screen.getByText("Visible content")).toBeInTheDocument();
    });

    // ── Confirmation modal ────────────────────────────────────────────────────

    it("opens the warning modal when Enable Expert Mode is clicked", async () => {
        const user = setupUser();
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );

        await user.click(screen.getByRole("button", { name: /enable expert mode/i }));
        expect(screen.getByText("Expert Mode Warning")).toBeInTheDocument();
    });

    it("shows the warning dialog with risk description", async () => {
        const user = setupUser();
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );

        await user.click(screen.getByRole("button", { name: /enable expert mode/i }));
        expect(screen.getByText(/high-risk tweaks/i)).toBeInTheDocument();
    });

    it("closes the modal when Cancel is clicked without enabling", async () => {
        const user = setupUser();
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );

        await user.click(screen.getByRole("button", { name: /enable expert mode/i }));
        expect(screen.getByText("Expert Mode Warning")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(false);
    });

    it("enables expert mode when 'I Understand, Enable' is clicked", async () => {
        const user = setupUser();
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );

        await user.click(screen.getByRole("button", { name: /enable expert mode/i }));
        await user.click(screen.getByRole("button", { name: /i understand, enable/i }));

        expect(useAppStore.getState().userSettings.expertModeEnabled).toBe(true);
    });

    it("closes the modal after enabling", async () => {
        const user = setupUser();
        render(
            <ExpertModeGate>
                <p>Hidden</p>
            </ExpertModeGate>
        );

        await user.click(screen.getByRole("button", { name: /enable expert mode/i }));
        await user.click(screen.getByRole("button", { name: /i understand, enable/i }));

        expect(screen.queryByText("Expert Mode Warning")).not.toBeInTheDocument();
    });
});
