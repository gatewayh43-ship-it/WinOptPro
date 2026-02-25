import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { OnboardingModal } from "@/components/OnboardingModal";

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
};

describe("OnboardingModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the first step title when open", () => {
        render(<OnboardingModal {...defaultProps} />);
        expect(screen.getByText(/Real-time Telemetry Dashboard/i)).toBeInTheDocument();
    });

    it("renders nothing when closed", () => {
        render(<OnboardingModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Real-time Telemetry Dashboard/i)).not.toBeInTheDocument();
    });

    it("advances to the next step when Next is clicked", async () => {
        const user = setupUser();
        render(<OnboardingModal {...defaultProps} />);
        await user.click(screen.getByText(/next/i));
        expect(screen.getByText(/Granular OS Tuning/i)).toBeInTheDocument();
    });

    it("shows 'Get Started' button on the last step", async () => {
        const user = setupUser();
        render(<OnboardingModal {...defaultProps} />);
        // Step 1 → 2
        await user.click(screen.getByText(/next/i));
        // Step 2 → 3 (last)
        await user.click(screen.getByText(/next/i));
        expect(screen.getByText(/get started/i)).toBeInTheDocument();
    });

    it("calls onClose when 'Get Started' is clicked", async () => {
        const user = setupUser();
        render(<OnboardingModal {...defaultProps} />);
        await user.click(screen.getByText(/next/i));
        await user.click(screen.getByText(/next/i));
        await user.click(screen.getByText(/get started/i));
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop is clicked", async () => {
        const user = setupUser();
        const { container } = render(<OnboardingModal {...defaultProps} />);
        // The backdrop is the first fixed inset-0 div
        const backdrop = container.querySelector(".absolute.inset-0");
        if (backdrop) await user.click(backdrop as HTMLElement);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("shows step counter text", () => {
        render(<OnboardingModal {...defaultProps} />);
        expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
    });

    it("navigates directly to a step when step dot is clicked", async () => {
        const user = setupUser();
        render(<OnboardingModal {...defaultProps} />);
        // Step indicator dots have empty textContent (no text, no children).
        // Navigation/action buttons contain text ("Next", "Get Started") or icon text.
        const allButtons = screen.getAllByRole("button");
        const dots = allButtons.filter((btn) => btn.textContent?.trim() === "");
        // There should be 3 step dots
        expect(dots.length).toBeGreaterThanOrEqual(3);
        // Click the third/last dot to jump to step 3
        await user.click(dots[dots.length - 1]);
        await waitFor(() => {
            expect(screen.getByText(/Contextual Education/i)).toBeInTheDocument();
        });
    });
});
