import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, setupUser } from "@/test/utils";
import { ConsentModal } from "@/components/ConsentModal";

describe("ConsentModal", () => {
    it("renders consent modal with correct content", () => {
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<ConsentModal onAccept={onAccept} onDecline={onDecline} />);

        // Title
        expect(screen.getByText("Welcome to WinOpt Pro")).toBeInTheDocument();

        // Two sections
        expect(screen.getByText("What we collect")).toBeInTheDocument();
        expect(screen.getByText("Your control")).toBeInTheDocument();

        // Two buttons
        expect(screen.getByRole("button", { name: /Accept & Continue/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Decline & Exit/i })).toBeInTheDocument();
    });

    it("calls onAccept when Accept & Continue clicked", async () => {
        const user = setupUser();
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<ConsentModal onAccept={onAccept} onDecline={onDecline} />);
        await user.click(screen.getByRole("button", { name: /Accept & Continue/i }));
        expect(onAccept).toHaveBeenCalledTimes(1);
        expect(onDecline).not.toHaveBeenCalled();
    });

    it("calls onDecline when Decline & Exit clicked", async () => {
        const user = setupUser();
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<ConsentModal onAccept={onAccept} onDecline={onDecline} />);
        await user.click(screen.getByRole("button", { name: /Decline & Exit/i }));
        expect(onDecline).toHaveBeenCalledTimes(1);
        expect(onAccept).not.toHaveBeenCalled();
    });

    it("calls onDecline when Escape is pressed", () => {
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<ConsentModal onAccept={onAccept} onDecline={onDecline} />);

        fireEvent.keyDown(document, { key: "Escape" });

        expect(onDecline).toHaveBeenCalledTimes(1);
        expect(onAccept).not.toHaveBeenCalled();
    });

    it("keeps Tab focus inside the modal", () => {
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(<ConsentModal onAccept={onAccept} onDecline={onDecline} />);

        const accept = screen.getByRole("button", { name: /Accept & Continue/i });
        const decline = screen.getByRole("button", { name: /Decline & Exit/i });

        expect(accept).toHaveFocus();
        decline.focus();
        fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
        expect(accept).toHaveFocus();

        fireEvent.keyDown(document, { key: "Tab" });
        expect(decline).toHaveFocus();
    });
});
