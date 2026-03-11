import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { LatencyPage } from "@/pages/LatencyPage";
import { useLatency } from "@/hooks/useLatency";
import type { ReactNode } from "react";

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
        useReducedMotion: () => false,
    };
});

const mockFlushStandby = vi.fn();
const mockRefresh = vi.fn();

const mockStatus = {
    timerResolution100ns: 156_250,
    minResolution100ns: 156_250,
    maxResolution100ns: 5_000,
    standbyRamMb: 1024,
    dynamicTickDisabled: false,
    platformClockForced: false,
};

vi.mock("@/hooks/useLatency", () => ({
    useLatency: vi.fn(() => ({
        status: mockStatus,
        isLoading: false,
        isFlushing: false,
        error: null,
        flushStandby: mockFlushStandby,
        refresh: mockRefresh,
    })),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("LatencyPage", () => {
    beforeEach(() => {
        mockFlushStandby.mockReset();
        mockRefresh.mockReset();
    });

    it("renders the Latency Optimizer heading", () => {
        render(<LatencyPage />);
        expect(screen.getByText("Latency Optimizer")).toBeInTheDocument();
    });

    it("shows Timer Resolution panel", () => {
        render(<LatencyPage />);
        expect(screen.getByText("Timer Resolution")).toBeInTheDocument();
    });

    it("displays current timer resolution in ms", () => {
        render(<LatencyPage />);
        // 156250 / 10000 = 15.625ms (appears for both current and min values)
        const elements = screen.getAllByText("15.625 ms");
        expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Standby Memory panel", () => {
        render(<LatencyPage />);
        expect(screen.getByText("Standby Memory")).toBeInTheDocument();
    });

    it("shows standby RAM amount in GB", () => {
        render(<LatencyPage />);
        // 1024 MB = 1.0 GB
        expect(screen.getByText("1.0 GB")).toBeInTheDocument();
    });

    it("shows Flush Standby List button", () => {
        render(<LatencyPage />);
        expect(screen.getByRole("button", { name: /Flush Standby List/i })).toBeInTheDocument();
    });

    it("clicking Flush Standby calls flushStandby", async () => {
        const user = setupUser();
        render(<LatencyPage />);
        await user.click(screen.getByRole("button", { name: /Flush Standby List/i }));
        expect(mockFlushStandby).toHaveBeenCalledTimes(1);
    });

    it("shows Boot / BCDEdit Settings panel", () => {
        render(<LatencyPage />);
        expect(screen.getByText("Boot / BCDEdit Settings")).toBeInTheDocument();
    });

    it("shows disabledynamictick setting with Off badge when false", () => {
        render(<LatencyPage />);
        expect(screen.getByText("disabledynamictick")).toBeInTheDocument();
        expect(screen.getByText(/On \(default\)/i)).toBeInTheDocument();
    });

    it("shows loading spinner when isLoading is true", () => {
        vi.mocked(useLatency).mockReturnValueOnce({
            status: null,
            isLoading: true,
            isFlushing: false,
            error: null,
            flushStandby: mockFlushStandby,
            refresh: mockRefresh,
        });
        render(<LatencyPage />);
        expect(screen.getByText(/Reading system latency state/i)).toBeInTheDocument();
    });

    it("shows error message when error is set", () => {
        vi.mocked(useLatency).mockReturnValueOnce({
            status: null,
            isLoading: false,
            isFlushing: false,
            error: "Access denied",
            flushStandby: mockFlushStandby,
            refresh: mockRefresh,
        });
        render(<LatencyPage />);
        expect(screen.getByText("Access denied")).toBeInTheDocument();
    });
});
