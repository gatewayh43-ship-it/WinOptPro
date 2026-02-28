import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { PowerPage } from "@/pages/PowerPage";
import type { ReactNode } from "react";

// Mock usePower so we don't need fake timers or Tauri env
vi.mock("@/hooks/usePower", () => {
    const setActivePlan = vi.fn().mockResolvedValue(true);
    const fetchPlans = vi.fn();
    return {
        usePower: () => ({
            plans: [
                { guid: "aaa-111", name: "Balanced", is_active: false },
                { guid: "bbb-222", name: "High performance", is_active: true },
                { guid: "ccc-333", name: "Power saver", is_active: false },
            ],
            isLoading: false,
            isChanging: false,
            setActivePlan,
            fetchPlans,
        }),
    };
});

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

describe("PowerPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the Power Manager heading", () => {
        render(<PowerPage />);
        expect(screen.getByText("Manager")).toBeInTheDocument();
    });

    it("shows Current Active Profile section", () => {
        render(<PowerPage />);
        expect(screen.getByText("Current Active Profile")).toBeInTheDocument();
    });

    it("displays the active plan name in the header", () => {
        render(<PowerPage />);
        // "High performance" appears in header + card — use getAllByText
        const matches = screen.getAllByText("High performance");
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("renders all power plan cards", () => {
        render(<PowerPage />);
        expect(screen.getByText("Balanced")).toBeInTheDocument();
        // High performance appears in header AND card
        expect(screen.getAllByText("High performance").length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText("Power saver")).toBeInTheDocument();
    });

    it("shows Available Profiles section", () => {
        render(<PowerPage />);
        expect(screen.getByText("Available Profiles")).toBeInTheDocument();
    });

    it("shows Active badge on the currently active plan", () => {
        render(<PowerPage />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows GUIDs for each plan", () => {
        render(<PowerPage />);
        expect(screen.getByText("aaa-111")).toBeInTheDocument();
        expect(screen.getByText("bbb-222")).toBeInTheDocument();
    });

    it("clicking an inactive plan card calls setActivePlan", async () => {
        const user = setupUser();
        const { usePower } = await import("@/hooks/usePower");
        const { setActivePlan } = usePower();

        render(<PowerPage />);

        // Click on "Balanced" card (inactive)
        const balancedCard = screen.getByText("aaa-111").closest("div[class]")!;
        await user.click(balancedCard as HTMLElement);

        await waitFor(() => {
            expect(setActivePlan).toHaveBeenCalledWith("aaa-111");
        });
    });

    it("does not show loading skeleton when isLoading is false", () => {
        render(<PowerPage />);
        // When not loading, the plan name heading should be visible
        expect(screen.getAllByText("High performance").length).toBeGreaterThanOrEqual(1);
        // And the plan cards grid should be present (not skeleton)
        expect(screen.getByText("aaa-111")).toBeInTheDocument();
    });
});
