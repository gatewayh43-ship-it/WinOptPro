import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { HomePage } from "@/pages/HomePage";
import type { ReactNode } from "react";

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) =>
            <div {...p}>{children}</div>,
        circle: ({ children, ...p }: React.SVGAttributes<SVGCircleElement> & { children?: ReactNode }) =>
            <circle {...p}>{children}</circle>,
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
}));

// Mock useSystemVitals — controlled per-test via Zustand store
// The hook reads from the Zustand store; we mock the hook return directly
const mockUseSystemVitals = vi.fn();
vi.mock("@/hooks/useSystemVitals", () => ({
    useSystemVitals: () => mockUseSystemVitals(),
}));

const addToast = vi.fn();
vi.mock("@/components/ToastSystem", () => ({ useToast: () => ({ addToast }) }));

// Fixtures
const NULL_VITALS = { vitals: null, refresh: vi.fn() };

const HEALTHY_VITALS = {
    vitals: {
        cpu: { tempC: 50, usagePct: 30, model: "i9-12900K", freqGhz: 3.2, cores: 8 },
        ram: { usagePct: 40, usedMb: 4096, totalMb: 16384 },
        drives: { "C:": { freeGb: 200, totalGb: 512, name: "SSD", mountPoint: "C:" } },
        network: {},
        gpu: null,
        system: { uptimeSeconds: 3600, osVersion: "Windows 11", isAdmin: true },
    },
    refresh: vi.fn(),
};

const HOT_CPU_VITALS = {
    vitals: {
        cpu: { tempC: 95, usagePct: 95, model: "i9-12900K", freqGhz: 3.2, cores: 8 },
        ram: { usagePct: 40, usedMb: 4096, totalMb: 16384 },
        drives: {},
        network: {},
        gpu: null,
        system: { uptimeSeconds: 3600, osVersion: "Windows 11", isAdmin: true },
    },
    refresh: vi.fn(),
};

const HIGH_RAM_VITALS = {
    vitals: {
        cpu: { tempC: 50, usagePct: 30, model: "i9-12900K", freqGhz: 3.2, cores: 8 },
        ram: { usagePct: 92, usedMb: 14746, totalMb: 16384 },
        drives: {},
        network: {},
        gpu: null,
        system: { uptimeSeconds: 3600, osVersion: "Windows 11", isAdmin: true },
    },
    refresh: vi.fn(),
};

describe("HomePage", () => {
    const setView = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSystemVitals.mockReturnValue(NULL_VITALS);
    });

    describe("null vitals state", () => {
        it("renders without crash when vitals are null", () => {
            expect(() => render(<HomePage setView={setView} />)).not.toThrow();
        });

        it("shows 'Analyzing…' status badge when vitals are null", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
        });

        it("shows health score of 0 when vitals are null", () => {
            render(<HomePage setView={setView} />);
            // computeHealthScore returns 0 when vitals is null
            expect(screen.getByText("0")).toBeInTheDocument();
        });

        it("shows dash placeholders for CPU temp when vitals are null", () => {
            render(<HomePage setView={setView} />);
            // vitals?.cpu.tempC is null → shows "—"
            const dashes = screen.getAllByText("—");
            expect(dashes.length).toBeGreaterThan(0);
        });

        it("renders a greeting text containing 'Commander'", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/commander/i)).toBeInTheDocument();
        });
    });

    describe("healthy vitals state", () => {
        it("renders without crash when vitals are present", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            expect(() => render(<HomePage setView={setView} />)).not.toThrow();
        });

        it("shows 'System Optimal' status badge when vitals are present", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/system optimal/i)).toBeInTheDocument();
        });

        it("shows CPU temperature value when vitals present", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            // tempC=50 → shows "50" in the big number display
            expect(screen.getByText("50")).toBeInTheDocument();
        });

        it("shows RAM usage percentage when vitals present", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            // usagePct=40 → shows "40"
            expect(screen.getByText("40")).toBeInTheDocument();
        });

        it("shows C: drive free space when vitals present", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            // freeGb=200 → shows "200"
            expect(screen.getByText("200")).toBeInTheDocument();
        });

        it("shows health score of 100 when CPU/RAM are healthy", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            // cpu=50°C(30%), ram=40% → score=100
            expect(screen.getByText("100")).toBeInTheDocument();
        });

        it("shows 'Cool' CPU temperature badge when temp is 50°C", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            expect(screen.getByText("Cool")).toBeInTheDocument();
        });

        it("shows 'Optimal' RAM badge when RAM is at 40%", () => {
            mockUseSystemVitals.mockReturnValue(HEALTHY_VITALS);
            render(<HomePage setView={setView} />);
            expect(screen.getByText("Optimal")).toBeInTheDocument();
        });
    });

    describe("high resource usage", () => {
        it("renders without crash with hot CPU vitals", () => {
            mockUseSystemVitals.mockReturnValue(HOT_CPU_VITALS);
            expect(() => render(<HomePage setView={setView} />)).not.toThrow();
        });

        it("shows 'High Temp' badge when CPU is 95°C", () => {
            mockUseSystemVitals.mockReturnValue(HOT_CPU_VITALS);
            render(<HomePage setView={setView} />);
            expect(screen.getByText("High Temp")).toBeInTheDocument();
        });

        it("renders without crash with high RAM vitals", () => {
            mockUseSystemVitals.mockReturnValue(HIGH_RAM_VITALS);
            expect(() => render(<HomePage setView={setView} />)).not.toThrow();
        });

        it("shows 'High Usage' badge when RAM is at 92%", () => {
            mockUseSystemVitals.mockReturnValue(HIGH_RAM_VITALS);
            render(<HomePage setView={setView} />);
            expect(screen.getByText("High Usage")).toBeInTheDocument();
        });
    });

    describe("greeting text", () => {
        it("renders a greeting (good morning/afternoon/evening or Welcome back)", () => {
            render(<HomePage setView={setView} />);
            const body = document.body.textContent || "";
            expect(
                /good morning|good afternoon|good evening|welcome back/i.test(body)
            ).toBe(true);
        });
    });

    describe("feature module cards", () => {
        it("renders Gaming Optimizer card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("Gaming Optimizer")).toBeInTheDocument();
        });

        it("renders Privacy Audit card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("Privacy Audit")).toBeInTheDocument();
        });

        it("renders Pre-built Debloater card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("Pre-built Debloater")).toBeInTheDocument();
        });

        it("renders App Store card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("App Store")).toBeInTheDocument();
        });

        it("renders System Tweaks card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("System Tweaks")).toBeInTheDocument();
        });

        it("renders WSL Manager card", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText("WSL Manager")).toBeInTheDocument();
        });
    });

    describe("navigation buttons", () => {
        it("'Open Dashboard' button calls setView with 'dashboard'", async () => {
            const user = setupUser();
            render(<HomePage setView={setView} />);
            await user.click(screen.getByRole("button", { name: /open dashboard/i }));
            expect(setView).toHaveBeenCalledWith("dashboard");
        });

        it("'Optimize Network' button calls setView with 'network_optimizer'", async () => {
            const user = setupUser();
            render(<HomePage setView={setView} />);
            await user.click(screen.getByRole("button", { name: /optimize network/i }));
            expect(setView).toHaveBeenCalledWith("network_optimizer");
        });

        it("Gaming Optimizer card click calls setView with 'gaming_optimizer'", async () => {
            const user = setupUser();
            render(<HomePage setView={setView} />);
            // The card is a motion.div (rendered as div) with onClick
            const gamingTitle = screen.getByText("Gaming Optimizer");
            await user.click(gamingTitle);
            expect(setView).toHaveBeenCalledWith("gaming_optimizer");
        });

        it("Privacy Audit card click calls setView with 'privacy_audit'", async () => {
            const user = setupUser();
            render(<HomePage setView={setView} />);
            await user.click(screen.getByText("Privacy Audit"));
            expect(setView).toHaveBeenCalledWith("privacy_audit");
        });

        it("Pre-built Debloater card click calls setView with 'prebuilt_debloater'", async () => {
            const user = setupUser();
            render(<HomePage setView={setView} />);
            await user.click(screen.getByText("Pre-built Debloater"));
            expect(setView).toHaveBeenCalledWith("prebuilt_debloater");
        });
    });

    describe("search bar", () => {
        it("renders the semantic search bar placeholder text", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/search.*optimize gaming/i)).toBeInTheDocument();
        });

        it("clicking search bar dispatches Ctrl+K keyboard event", async () => {
            const user = setupUser();
            const dispatchSpy = vi.spyOn(window, "dispatchEvent");
            render(<HomePage setView={setView} />);
            const searchBar = screen.getByText(/search.*optimize gaming/i).closest("[class]");
            expect(searchBar).not.toBeNull();
            await user.click(searchBar!);
            expect(dispatchSpy).toHaveBeenCalled();
            const event = dispatchSpy.mock.calls.find(
                ([e]) => e instanceof KeyboardEvent && (e as KeyboardEvent).key === "k"
            );
            expect(event).toBeTruthy();
            const [kbEvent] = event!;
            expect((kbEvent as KeyboardEvent).ctrlKey).toBe(true);
            dispatchSpy.mockRestore();
        });
    });

    describe("Health Index section", () => {
        it("renders 'Health Index' label", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/health index/i)).toBeInTheDocument();
        });

        it("renders 'Processor' label", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/processor/i)).toBeInTheDocument();
        });

        it("renders 'Memory' label", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/memory/i)).toBeInTheDocument();
        });

        it("renders 'C: Drive Free' label", () => {
            render(<HomePage setView={setView} />);
            expect(screen.getByText(/c: drive free/i)).toBeInTheDocument();
        });
    });
});
