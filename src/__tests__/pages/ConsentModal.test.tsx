import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
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
});
