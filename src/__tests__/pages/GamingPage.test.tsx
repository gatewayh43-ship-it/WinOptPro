import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { GamingPage } from "@/pages/GamingPage";
import { useGaming } from "@/hooks/useGaming";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, style }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} style={style}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

const mockSetAutoOptimize = vi.fn();
const mockCaptureBaseline = vi.fn();
const mockSetGpuPowerLimit = vi.fn();
const mockShowOverlay = vi.fn();
const mockHideOverlay = vi.fn();

vi.mock("@/hooks/useGaming", () => ({
    useGaming: vi.fn(() => ({
        activeGame: "Counter-Strike 2 (mock)",
        gpuMetrics: {
            name: "NVIDIA GeForce RTX 3080",
            temperatureC: 65,
            gpuUtilPct: 78,
            memUtilPct: 44,
            memUsedMb: 4506,
            memTotalMb: 10240,
            powerDrawW: 145.5,
            powerLimitW: 250,
            powerMaxLimitW: 320,
            isNvidia: true,
        },
        cpuLoad: 34,
        isOverlayVisible: false,
        isLoadingGpu: false,
        isSettingLimit: false,
        autoOptimize: false,
        baseline: null,
        setAutoOptimize: mockSetAutoOptimize,
        captureBaseline: mockCaptureBaseline,
        setGpuPowerLimit: mockSetGpuPowerLimit,
        showOverlay: mockShowOverlay,
        hideOverlay: mockHideOverlay,
    })),
}));

describe("GamingPage", () => {
    beforeEach(() => {
        mockSetAutoOptimize.mockReset();
        mockCaptureBaseline.mockReset();
        mockShowOverlay.mockReset();
        mockHideOverlay.mockReset();
    });

    it("renders the Gaming Optimizer heading", () => {
        render(<GamingPage />);
        expect(screen.getByText("Gaming Optimizer")).toBeInTheDocument();
    });

    it("shows the active game name", () => {
        render(<GamingPage />);
        expect(screen.getByText("Counter-Strike 2 (mock)")).toBeInTheDocument();
    });

    it("shows GPU Metrics panel with GPU name", () => {
        render(<GamingPage />);
        expect(screen.getByText("GPU Metrics")).toBeInTheDocument();
        expect(screen.getByText("NVIDIA GeForce RTX 3080")).toBeInTheDocument();
    });

    it("shows GPU temperature stat card", () => {
        render(<GamingPage />);
        expect(screen.getByText("GPU Temp")).toBeInTheDocument();
    });

    it("shows Auto-Optimize on Launch toggle panel", () => {
        render(<GamingPage />);
        expect(screen.getByText("Auto-Optimize on Launch")).toBeInTheDocument();
    });

    it("clicking auto-optimize toggle calls setAutoOptimize", async () => {
        const user = setupUser();
        render(<GamingPage />);
        await user.click(screen.getByRole("button", { name: /Off/i }));
        expect(mockSetAutoOptimize).toHaveBeenCalledWith(true);
    });

    it("shows Gaming Overlay toggle panel", () => {
        render(<GamingPage />);
        expect(screen.getByText("Gaming Overlay")).toBeInTheDocument();
    });

    it("clicking Show Overlay button calls showOverlay", async () => {
        const user = setupUser();
        render(<GamingPage />);
        await user.click(screen.getByRole("button", { name: /Show Overlay/i }));
        expect(mockShowOverlay).toHaveBeenCalledTimes(1);
    });

    it("shows Before / After panel", () => {
        render(<GamingPage />);
        expect(screen.getByText("Before / After")).toBeInTheDocument();
    });

    it("shows loading spinner when isLoadingGpu is true", () => {
        vi.mocked(useGaming).mockReturnValueOnce({
            activeGame: null,
            gpuMetrics: null,
            cpuLoad: null,
            isOverlayVisible: false,
            isLoadingGpu: true,
            isSettingLimit: false,
            autoOptimize: false,
            baseline: null,
            setAutoOptimize: mockSetAutoOptimize,
            captureBaseline: mockCaptureBaseline,
            setGpuPowerLimit: mockSetGpuPowerLimit,
            showOverlay: mockShowOverlay,
            hideOverlay: mockHideOverlay,
        });
        render(<GamingPage />);
        expect(screen.getByText(/Querying GPU metrics/i)).toBeInTheDocument();
    });
});
