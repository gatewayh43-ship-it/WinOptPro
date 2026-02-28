import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { CommandPalette } from "@/components/CommandPalette";

// Mock Web Worker — JSDOM doesn't support it
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage(_msg: unknown) {}
    terminate() {}
}
vi.stubGlobal("Worker", MockWorker);

// Framer Motion animates layout in DOM — stub out to keep tests deterministic
vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTweak: vi.fn(),
};

describe("CommandPalette", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the search input when open", () => {
        render(<CommandPalette {...defaultProps} />);
        expect(screen.getByPlaceholderText(/search tweaks/i)).toBeInTheDocument();
    });

    it("renders nothing when closed", () => {
        render(<CommandPalette {...defaultProps} isOpen={false} />);
        expect(screen.queryByPlaceholderText(/search tweaks/i)).not.toBeInTheDocument();
    });

    it("shows tweak results when query matches", async () => {
        const user = setupUser();
        render(<CommandPalette {...defaultProps} />);
        await user.type(screen.getByPlaceholderText(/search tweaks/i), "sysmain");
        await waitFor(() => {
            expect(screen.getByText(/sysmain/i)).toBeInTheDocument();
        });
    });

    it("shows empty state when no results match", async () => {
        const user = setupUser();
        render(<CommandPalette {...defaultProps} />);
        await user.type(screen.getByPlaceholderText(/search tweaks/i), "xyzzy_nothing_matches");
        await waitFor(() => {
            expect(screen.getByText(/no optimizations found/i)).toBeInTheDocument();
        });
    });

    it("calls onClose when Escape is pressed", async () => {
        const user = setupUser();
        render(<CommandPalette {...defaultProps} />);
        await user.keyboard("{Escape}");
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSelectTweak and onClose when Enter is pressed on selected result", async () => {
        const user = setupUser();
        render(<CommandPalette {...defaultProps} />);
        const input = screen.getByPlaceholderText(/search tweaks/i);
        await user.type(input, "sysmain");
        await waitFor(() => expect(screen.getByText(/sysmain/i)).toBeInTheDocument());
        await user.keyboard("{Enter}");
        expect(defaultProps.onSelectTweak).toHaveBeenCalledTimes(1);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("groups results by category", async () => {
        const user = setupUser();
        render(<CommandPalette {...defaultProps} />);
        // Search for something with multiple categories
        await user.type(screen.getByPlaceholderText(/search tweaks/i), "disable");
        await waitFor(() => {
            // Category headers should appear as uppercase labels
            const categories = screen.queryAllByText(/performance|privacy|network|gaming/i);
            expect(categories.length).toBeGreaterThan(0);
        });
    });
});
