import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser, fireEvent, waitFor } from "@/test/utils";
import { TweaksPage } from "@/pages/TweaksPage";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

describe("TweaksPage", () => {
    // Helper: wait for skeleton validation to finish and real content to appear
    const waitForTweaks = () => waitFor(
        () => expect(document.querySelector('[class*="animate-pulse"]')).toBeNull(),
        { timeout: 3000 }
    );

    it("renders tweaks for the given category", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        // Wait for validation to finish (skeletons → real cards)
        expect(await screen.findByText("Disable SysMain (Superfetch)", {}, { timeout: 3000 })).toBeInTheDocument();
        expect(screen.getByText("Disable Windows Search Indexer")).toBeInTheDocument();
    });

    it("shows empty state for an unknown category", () => {
        render(<TweaksPage categoryTitle="__nonexistent__" />);
        // No tweaks → no validationCmd → no skeleton → empty state rendered immediately
        expect(screen.getByText(/No optimizations yet/i)).toBeInTheDocument();
    });

    it("only renders filter chips for risk levels that have tweaks", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();
        // Performance has Green(1) and Yellow(1) — chips with count > 0 are shown
        expect(screen.getByRole("button", { name: /All/ })).toBeInTheDocument();
        expect(screen.getAllByText("Green").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Yellow").length).toBeGreaterThan(0);
        // Red has count 0 → chip is hidden
        const redFilterBtns = screen.queryAllByRole("button").filter(
            btn => btn.textContent?.startsWith("Red")
        );
        expect(redFilterBtns.length).toBe(0);
    });

    it("filters tweaks so only matching risk-level items remain", async () => {
        const user = setupUser();
        render(<TweaksPage categoryTitle="Performance" />);
        // Wait for tweaks to appear after validation
        await waitForTweaks();
        expect(screen.getByText("Disable SysMain (Superfetch)")).toBeInTheDocument();
        expect(screen.getByText("Disable Windows Search Indexer")).toBeInTheDocument();

        // Click Yellow filter chip
        const yellowChip = screen.getAllByRole("button").find(btn => btn.textContent?.startsWith("Yellow"));
        expect(yellowChip).toBeTruthy();
        await user.click(yellowChip!);

        // Green tweak hidden; Yellow tweak visible
        expect(screen.queryByText("Disable SysMain (Superfetch)")).not.toBeInTheDocument();
        expect(screen.getByText("Disable Windows Search Indexer")).toBeInTheDocument();
    });

    it("resets to showing all tweaks when All chip is clicked", async () => {
        const user = setupUser();
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();
        // Filter to Yellow
        const yellowChip = screen.getAllByRole("button").find(btn => btn.textContent?.startsWith("Yellow"));
        await user.click(yellowChip!);
        expect(screen.queryByText("Disable SysMain (Superfetch)")).not.toBeInTheDocument();

        // Click "All" to reset
        const allChip = screen.getByRole("button", { name: /All/ });
        await user.click(allChip);
        expect(screen.getByText("Disable SysMain (Superfetch)")).toBeInTheDocument();
        expect(screen.getByText("Disable Windows Search Indexer")).toBeInTheDocument();
    });

    it("opens inspector panel when a tweak is clicked", async () => {
        const user = setupUser();
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();
        // Click the tweak name text — event bubbles up to the card's onClick
        await user.click(screen.getByText("Disable SysMain (Superfetch)"));
        // Inspector renders in both desktop sidebar and mobile drawer — at least one should show
        await waitFor(() => {
            expect(screen.getAllByText(/Mechanical Summary/i).length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    it("shows floating batch bar when a tweak toggle is selected", async () => {
        render(<TweaksPage categoryTitle="Performance" />);
        await waitForTweaks();
        // Toggle is the direct parent div of the 42px track
        const toggleTrack = document.querySelector('[class*="42px"]') as HTMLElement;
        expect(toggleTrack).toBeTruthy();
        // Click the outer toggle wrapper (parent of the track)
        fireEvent.click(toggleTrack.parentElement!);
        await waitFor(() => {
            expect(screen.getByText(/tweak.*ready/i)).toBeInTheDocument();
        });
    });
});
