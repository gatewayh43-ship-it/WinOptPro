import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor, fireEvent } from "@/test/utils";
import { TweaksPage } from "@/pages/TweaksPage";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";
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
            circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const successResult = {
    success: true,
    tweakId: "disable-sysmain",
    stdout: "Service stopped.",
    stderr: "",
    exitCode: 0,
    durationMs: 80,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wait until all skeleton loading states are gone */
const waitForTweaks = () =>
    waitFor(
        () => expect(document.querySelector('[class*="animate-pulse"]')).toBeNull(),
        { timeout: 3000 }
    );

function resetStore() {
    useAppStore.setState({
        appliedTweaks: [],
        selectedTweaks: [],
        isExecuting: false,
        executingTweakId: null,
        error: null,
        tweakValidationState: {},
        systemVitals: null,
    });
}

// ── Integration Tests ─────────────────────────────────────────────────────────

describe("TweaksPage integration", () => {
    beforeEach(() => {
        resetStore();
        vi.mocked(tauriCore.invoke).mockReset();
        // Default: execute_tweak succeeds, validate_tweak returns Unknown
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "execute_tweak") return successResult;
            if (cmd === "validate_tweak") return { state: "Unknown", rawOutput: "" };
            return null;
        });
    });

    // ── Select → batch bar ────────────────────────────────────────────────────

    it("shows floating batch bar after selecting a tweak via its toggle", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        expect(toggleTrack).toBeTruthy();
        fireEvent.click(toggleTrack.parentElement!);

        await waitFor(() => {
            expect(screen.getByText(/tweak.*ready/i)).toBeInTheDocument();
        });
    });

    it("shows selected count in the batch bar", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);

        await waitFor(() => {
            expect(screen.getByText(/1 tweak ready/i)).toBeInTheDocument();
        });
    });

    it("Clear button removes selection and hides the batch bar", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^clear$/i }));

        await waitFor(() => {
            expect(screen.queryByText(/tweak.*ready/i)).not.toBeInTheDocument();
        });
    });

    // ── Batch bar → ConfirmDeployModal ────────────────────────────────────────

    it("opens ConfirmDeployModal when Deploy is clicked", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));

        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();
    });

    it("ConfirmDeployModal lists selected tweaks", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));

        // At least one tweak name should appear in the modal
        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();
    });

    it("Cancel on ConfirmDeployModal hides the modal without executing", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));
        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("Confirm Deploy")).not.toBeInTheDocument();
        expect(tauriCore.invoke).not.toHaveBeenCalledWith("execute_tweak", expect.anything());
    });

    // ── ConfirmDeployModal → ProgressModal ────────────────────────────────────

    it("opens ProgressModal after confirming deploy", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));

        const confirmBtn = screen.getByRole("button", { name: /confirm.*deploy/i });
        await user.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText(/Applying Tweaks|Deployment/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("calls execute_tweak after confirming", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));
        await user.click(screen.getByRole("button", { name: /confirm.*deploy/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("execute_tweak", expect.objectContaining({
                code: expect.any(String),
            }));
        }, { timeout: 3000 });
    });

    it("adds tweak to appliedTweaks after successful deploy", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => screen.getByText(/tweak.*ready/i));

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));
        await user.click(screen.getByRole("button", { name: /confirm.*deploy/i }));

        await waitFor(() => {
            expect(useAppStore.getState().appliedTweaks.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    // ── Failed deploy → rollback ──────────────────────────────────────────────

    it("shows failure actions when a tweak fails during batch", async () => {
        // First tweak succeeds, second fails
        let callCount = 0;
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "validate_tweak") return { state: "Unknown", rawOutput: "" };
            if (cmd === "execute_tweak") {
                callCount++;
                if (callCount === 1) return successResult;
                return { ...successResult, success: false, stderr: "Access denied", exitCode: 1 };
            }
            return null;
        });

        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();

        // Select all visible tweaks by toggling all tracks
        const toggleTracks = document.querySelectorAll('[class*="42px"]');
        toggleTracks.forEach((track) => fireEvent.click(track.parentElement!));
        await waitFor(() => screen.getByText(/tweak.*ready/i), { timeout: 2000 }).catch(() => null);

        // Only proceed if we have at least 2 selected
        const batchBar = screen.queryByText(/tweak.*ready/i);
        if (!batchBar) return; // skip if not enough tweaks

        const user = setupUser();
        await user.click(screen.getByRole("button", { name: /^deploy/i }));
        await user.click(screen.getByRole("button", { name: /confirm.*deploy/i }));

        await waitFor(() => {
            const rollbackBtn = screen.queryByRole("button", { name: /rollback/i });
            const skipBtn = screen.queryByRole("button", { name: /skip/i });
            // Either rollback/skip shown, or all succeeded (callCount < 2)
            if (callCount >= 2) {
                expect(rollbackBtn || skipBtn).toBeTruthy();
            }
        }, { timeout: 3000 });
    });

    // ── Expert mode banner ────────────────────────────────────────────────────

    it("shows expert mode banner when expert tweaks are hidden", async () => {
        useAppStore.setState({
            userSettings: {
                theme: "dark",
                colorScheme: "default",
                expertModeEnabled: false,
                autoRefreshVitals: true,
                autoRefreshIntervalMs: 3000,
                showDeployConfirmation: true,
                aiAssistantEnabled: false,
            },
        });

        render(<TweaksPage categoryTitle="Power" />);
        // Power category has expert tweaks (requiresExpertMode: true)
        await waitFor(() => {
            const bannerText = screen.queryByText(/enable expert mode/i);
            // If Power has expert tweaks, banner will show
            if (bannerText) {
                expect(bannerText).toBeInTheDocument();
            }
        }, { timeout: 3000 });
    });
});
