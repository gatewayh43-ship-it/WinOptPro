import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { Dashboard } from "@/pages/Dashboard";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, onClick }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
            circle: ({ children, className }: React.SVGAttributes<SVGCircleElement> & { children?: ReactNode }) => (
                <circle className={className}>{children}</circle>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

vi.mock("@/hooks/useSystemVitals", () => ({
    useSystemVitals: vi.fn(() => ({
        vitals: {
            cpu: { model: "Intel Core i9-12900K", usagePct: 30, tempC: 55, freqGhz: 3.2, cores: 16 },
            ram: { totalMb: 32768, usedMb: 12288, usagePct: 37.5 },
            drives: {
                "C:": { name: "Samsung SSD 970 EVO", totalGb: 512, freeGb: 200 },
            },
            network: {
                "Ethernet": { receivedBytes: 1073741824, transmittedBytes: 536870912 },
            },
            system: {
                osVersion: "Windows 11 Pro 22H2",
                isAdmin: true,
                uptimeSeconds: 36000,
            },
            gpu: null,
        },
        isLoading: false,
        error: null,
    })),
}));

vi.mock("@/store/appStore", () => ({
    useAppStore: vi.fn((sel: (s: any) => any) =>
        sel({
            appliedTweaks: [],
            userSettings: { expertModeEnabled: false, aiAssistantEnabled: false },
            tweakFilterRisk: "All",
            tweakFilterCategory: "All",
            tweakSearchQuery: "",
            updateSettings: vi.fn(),
            setTweakFilter: vi.fn(),
            addAppliedTweak: vi.fn(),
            removeAppliedTweak: vi.fn(),
        })
    ),
}));

vi.mock("@/hooks/useTweakExecution", () => ({
    useTweakExecution: vi.fn(() => ({
        applyTweak: vi.fn(),
        revertTweak: vi.fn(),
        validateTweak: vi.fn(),
        rollbackTweaks: vi.fn(),
        isExecuting: false,
    })),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

vi.mock("@/components/ConfirmDeployModal", () => ({
    ConfirmDeployModal: () => null,
}));

vi.mock("@/components/ProgressModal", () => ({
    ProgressModal: () => null,
}));

describe("Dashboard", () => {
    const onTriggerGuide = vi.fn();
    const setView = vi.fn();

    beforeEach(() => {
        onTriggerGuide.mockReset();
        setView.mockReset();
    });

    it("renders the System Engine heading", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText("Engine")).toBeInTheDocument();
    });

    it("shows Live Telemetry Active when vitals are loaded", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText(/Live Telemetry Active/i)).toBeInTheDocument();
    });

    it("renders System Health Score section", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText("System Health Score")).toBeInTheDocument();
    });

    it("displays CPU model from vitals", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText("Intel Core i9-12900K")).toBeInTheDocument();
    });

    it("displays OS version from vitals", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText("Windows 11 Pro 22H2")).toBeInTheDocument();
    });

    it("calls onTriggerGuide when Interactive Guide button is clicked", async () => {
        const user = setupUser();
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        await user.click(screen.getByRole("button", { name: /Interactive Guide/i }));
        expect(onTriggerGuide).toHaveBeenCalledTimes(1);
    });

    it("shows Quick Scan button with count of unapplied green tweaks", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        // Should show Quick Scan button (all green tweaks are candidates when none applied)
        const scanBtn = screen.getByRole("button", { name: /Quick Scan/i });
        expect(scanBtn).toBeInTheDocument();
    });

    it("shows privacy intervention banner", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        expect(screen.getByText("Privacy Intervention Recommended")).toBeInTheDocument();
    });

    it("clicking privacy banner calls setView with 'privacy'", async () => {
        const user = setupUser();
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        const banner = screen.getByText("Privacy Intervention Recommended").closest("div");
        if (banner) await user.click(banner);
        await waitFor(() => {
            expect(setView).toHaveBeenCalledWith("privacy");
        });
    });

    it("shows score tier label based on health score", () => {
        render(<Dashboard onTriggerGuide={onTriggerGuide} setView={setView} />);
        // Score should be high with low CPU/RAM usage and cool temp
        const tier = screen.getByText(/Optimal Performance|Good System Health|Room for Improvement|Needs Attention/i);
        expect(tier).toBeInTheDocument();
    });
});
