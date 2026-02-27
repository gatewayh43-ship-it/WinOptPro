import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { Dashboard } from "@/pages/Dashboard";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";
import tweaksData from "@/data/tweaks.json";

// ── Framer Motion mock (same pattern as TweaksPage.test.tsx) ─────────────────
vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
            circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockVitals = {
    timestamp: Date.now(),
    cpu: { model: "AMD Ryzen 7 7800X3D", usagePct: 42, freqGhz: 4.8, cores: 8, tempC: 65 },
    ram: { usedMb: 8192, totalMb: 32768, usagePct: 25 },
    drives: { "C:": { freeGb: 420, totalGb: 1000, name: "System SSD", mountPoint: "C:" } },
    network: { Ethernet: { receivedBytes: 1024000, transmittedBytes: 512000 } },
    system: { uptimeSeconds: 86400, osVersion: "Windows 11 23H2", isAdmin: true },
};

describe("Dashboard", () => {
    beforeEach(() => {
        useAppStore.setState({ appliedTweaks: [], systemVitals: null });
        vi.mocked(tauriCore.invoke).mockReset();
        // Default: vitals fetch succeeds
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);
    });

    // ── Rendering ─────────────────────────────────────────────────────────────

    it("renders the hero heading", () => {
        render(<Dashboard />);
        expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("shows OS version after vitals load", async () => {
        render(<Dashboard />);
        await waitFor(() => {
            expect(screen.getByText("Windows 11 23H2")).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("renders the privacy alert banner", () => {
        render(<Dashboard />);
        expect(screen.getByText("Privacy Intervention Recommended")).toBeInTheDocument();
    });

    // ── Quick Scan button ─────────────────────────────────────────────────────

    it("renders Quick Scan button when there are unapplied green tweaks", () => {
        render(<Dashboard />);
        // With empty appliedTweaks, all green tweaks are candidates
        const btn = screen.getByRole("button", { name: /quick scan/i });
        expect(btn).toBeInTheDocument();
    });

    it("Quick Scan button shows the candidate count", () => {
        const greenCount = tweaksData.filter((t) => t.riskLevel === "Green").length;
        render(<Dashboard />);
        expect(screen.getByText(new RegExp(`Quick Scan \\(${greenCount}\\)`))).toBeInTheDocument();
    });

    it("shows 'All Safe Tweaks Applied' when every green tweak is already applied", () => {
        const allGreenIds = tweaksData.filter((t) => t.riskLevel === "Green").map((t) => t.id);
        useAppStore.setState({ appliedTweaks: allGreenIds });
        render(<Dashboard />);
        expect(screen.getByText(/All Safe Tweaks Applied/i)).toBeInTheDocument();
    });

    it("opens ConfirmDeployModal when Quick Scan is clicked", async () => {
        const user = setupUser();
        render(<Dashboard />);

        const btn = screen.getByRole("button", { name: /quick scan/i });
        await user.click(btn);

        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();
    });

    it("Quick Scan ConfirmDeployModal lists green tweaks", async () => {
        const user = setupUser();
        render(<Dashboard />);

        await user.click(screen.getByRole("button", { name: /quick scan/i }));

        // At least one tweak name from tweaksData should appear in the modal
        const firstGreen = tweaksData.find((t) => t.riskLevel === "Green");
        expect(firstGreen).toBeDefined();
        const tweakName = await screen.findByText(firstGreen!.name);
        expect(tweakName).toBeInTheDocument();
    });

    it("closing ConfirmDeployModal via Cancel hides it", async () => {
        const user = setupUser();
        render(<Dashboard />);

        await user.click(screen.getByRole("button", { name: /quick scan/i }));
        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /cancel/i }));
        expect(screen.queryByText("Confirm Deploy")).not.toBeInTheDocument();
    });

    // ── Interactive Guide ─────────────────────────────────────────────────────

    it("calls onTriggerGuide when Interactive Guide button is clicked", async () => {
        const user = setupUser();
        const onTriggerGuide = vi.fn();
        render(<Dashboard onTriggerGuide={onTriggerGuide} />);

        const guideBtn = screen.getByRole("button", { name: /interactive guide/i });
        await user.click(guideBtn);

        expect(onTriggerGuide).toHaveBeenCalledOnce();
    });

    // ── Alert Banner navigation ───────────────────────────────────────────────

    it("calls setView with 'privacy' when alert banner is clicked", async () => {
        const user = setupUser();
        const setView = vi.fn();
        render(<Dashboard setView={setView} />);

        const banner = screen.getByText("Privacy Intervention Recommended").closest("div")!;
        await user.click(banner);

        expect(setView).toHaveBeenCalledWith("privacy");
    });
});
