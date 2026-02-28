import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import tweakData from "@/data/tweaks.json";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, onClick }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

const successResult = {
    success: true,
    tweakId: "test",
    stdout: "",
    stderr: "",
    exitCode: 0,
    durationMs: 50,
};

function resetStore() {
    useAppStore.setState({
        appliedTweaks: [],
        selectedTweaks: [],
        isExecuting: false,
        executingTweakId: null,
        error: null,
        tweakValidationState: {},
    });
}

describe("ProfilesPage", () => {
    beforeEach(() => {
        resetStore();
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "execute_tweak") return successResult;
            if (cmd === "validate_tweak") return { state: "Unknown", rawOutput: "" };
            return null;
        });
    });

    it("renders all 6 built-in profiles", () => {
        render(<ProfilesPage />);
        expect(screen.getByText("Gaming Mode")).toBeInTheDocument();
        expect(screen.getByText("Privacy Fortress")).toBeInTheDocument();
        expect(screen.getByText("System Speedup")).toBeInTheDocument();
        expect(screen.getByText("Network Optimizer")).toBeInTheDocument();
        expect(screen.getByText("Clean Windows")).toBeInTheDocument();
        expect(screen.getByText("Safe & Minimal")).toBeInTheDocument();
    });

    it("renders profile descriptions", () => {
        render(<ProfilesPage />);
        expect(screen.getByText(/maximize fps and minimize system overhead/i)).toBeInTheDocument();
    });

    it("shows tweak count and active count for each profile", () => {
        render(<ProfilesPage />);
        // At least one profile shows "X tweaks · 0 active" (no applied tweaks initially)
        expect(screen.getAllByText(/tweaks · 0 active/).length).toBeGreaterThan(0);
    });

    it("clicking a profile card expands it showing tweaks", async () => {
        const user = setupUser();
        render(<ProfilesPage />);
        // Click Safe & Minimal to expand
        await user.click(screen.getByText("Safe & Minimal"));
        expect(await screen.findByText(/included tweaks/i)).toBeInTheDocument();
    });

    it("clicking same profile again collapses it", async () => {
        const user = setupUser();
        render(<ProfilesPage />);
        await user.click(screen.getByText("Safe & Minimal"));
        await screen.findByText(/included tweaks/i);
        await user.click(screen.getByText("Safe & Minimal"));
        await waitFor(() => {
            expect(screen.queryByText(/included tweaks/i)).not.toBeInTheDocument();
        });
    });

    it("Apply button is visible in expanded profile", async () => {
        const user = setupUser();
        render(<ProfilesPage />);
        await user.click(screen.getByText("Safe & Minimal"));
        await screen.findByText(/included tweaks/i);
        expect(screen.getByRole("button", { name: /apply.*remaining/i })).toBeInTheDocument();
    });

    it("Apply button opens ConfirmDeployModal", async () => {
        const user = setupUser();
        render(<ProfilesPage />);
        await user.click(screen.getByText("Safe & Minimal"));
        await screen.findByText(/included tweaks/i);
        const applyBtn = screen.getByRole("button", { name: /apply.*remaining/i });
        await user.click(applyBtn);
        expect(await screen.findByText("Confirm Deploy")).toBeInTheDocument();
    });

    it("Cancel on ConfirmDeployModal closes it without deploying", async () => {
        const user = setupUser();
        render(<ProfilesPage />);
        await user.click(screen.getByText("Safe & Minimal"));
        await screen.findByText(/included tweaks/i);
        await user.click(screen.getByRole("button", { name: /apply.*remaining/i }));
        await screen.findByText("Confirm Deploy");
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("Confirm Deploy")).not.toBeInTheDocument();
        expect(tauriCore.invoke).not.toHaveBeenCalledWith("execute_tweak", expect.anything());
    });

    it("shows Applied badge for fully applied profiles", () => {
        const gamingIds = tweakData.filter((t: { category: string; riskLevel: string }) => t.category === "Gaming" && t.riskLevel !== "Red").map((t: { id: string }) => t.id);
        useAppStore.setState({ appliedTweaks: gamingIds });

        render(<ProfilesPage />);
        expect(screen.getByText("Applied")).toBeInTheDocument();
    });

    it("shows partial count when some tweaks applied", () => {
        const gamingIds = tweakData.filter((t: { category: string; riskLevel: string }) => t.category === "Gaming" && t.riskLevel !== "Red").map((t: { id: string }) => t.id);
        useAppStore.setState({ appliedTweaks: [gamingIds[0]] });

        render(<ProfilesPage />);
        expect(screen.getByText(`1/${gamingIds.length}`)).toBeInTheDocument();
    });

    it("shows info toast if all profile tweaks already applied", async () => {
        const safeTweaks = tweakData.filter((t: { riskLevel: string }) => t.riskLevel === "Green").map((t: { id: string }) => t.id);
        useAppStore.setState({ appliedTweaks: safeTweaks });

        const user = setupUser();
        render(<ProfilesPage />);
        await user.click(screen.getByText("Safe & Minimal"));
        await screen.findByText(/included tweaks/i);

        expect(screen.getByRole("button", { name: /all applied/i })).toBeDisabled();
    });
});
