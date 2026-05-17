import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, setupUser, waitFor } from "@/test/utils";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { RestorePointPrompt } from "@/components/RestorePointPrompt";
import type { ComponentProps, ReactNode } from "react";

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: { children?: ReactNode }) => <div {...props}>{children}</div>,
    },
}));

describe("RestorePointPrompt", () => {
    const onCreatedAndContinue = vi.fn();
    const onSkipAndContinue = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        onCreatedAndContinue.mockReset();
        onSkipAndContinue.mockReset();
        onCancel.mockReset();
        vi.mocked(isTauri).mockReset();
        vi.mocked(invoke).mockReset();
        vi.mocked(isTauri).mockReturnValue(true);
        vi.mocked(invoke).mockResolvedValue(true);
    });

    function renderPrompt(overrides: Partial<ComponentProps<typeof RestorePointPrompt>> = {}) {
        return render(
            <RestorePointPrompt
                isOpen
                highRiskCount={2}
                onCreatedAndContinue={onCreatedAndContinue}
                onSkipAndContinue={onSkipAndContinue}
                onCancel={onCancel}
                {...overrides}
            />
        );
    }

    it("renders nothing when closed", () => {
        renderPrompt({ isOpen: false });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders plural high-risk copy and action buttons", () => {
        renderPrompt();
        expect(screen.getByRole("dialog", { name: /high-risk tweaks selected/i })).toBeInTheDocument();
        expect(screen.getByText(/2 red-tier tweaks/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create & continue/i })).toHaveFocus();
        expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    });

    it("renders singular copy for one high-risk tweak", () => {
        renderPrompt({ highRiskCount: 1 });
        expect(screen.getByText(/1 red-tier tweak can be hard/i)).toBeInTheDocument();
    });

    it("cancels via button and Escape", async () => {
        const user = setupUser();
        renderPrompt();
        await user.click(screen.getByRole("button", { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it("skips restore point creation", async () => {
        const user = setupUser();
        renderPrompt();
        await user.click(screen.getByRole("button", { name: /skip/i }));
        expect(onSkipAndContinue).toHaveBeenCalledTimes(1);
        expect(invoke).not.toHaveBeenCalled();
    });

    it("creates a restore point in Tauri mode", async () => {
        const user = setupUser();
        renderPrompt({ highRiskCount: 3 });
        await user.click(screen.getByRole("button", { name: /create & continue/i }));

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith("create_restore_point", {
                description: "WinOpt Pro — before applying 3 high-risk tweaks",
            });
            expect(onCreatedAndContinue).toHaveBeenCalledTimes(1);
        });
    });

    it("continues without invoking in browser mode", async () => {
        vi.mocked(isTauri).mockReturnValue(false);
        const user = setupUser();
        renderPrompt();
        await user.click(screen.getByRole("button", { name: /create & continue/i }));
        expect(invoke).not.toHaveBeenCalled();
        expect(onCreatedAndContinue).toHaveBeenCalledTimes(1);
    });

});
