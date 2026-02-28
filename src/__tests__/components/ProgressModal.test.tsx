import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { ProgressModal, type ProgressItem } from "@/components/ProgressModal";
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
    };
});

const makeItem = (id: string, name: string, status: ProgressItem["status"]): ProgressItem => ({
    id,
    name,
    status,
});

describe("ProgressModal", () => {
    it("renders nothing when isOpen is false", () => {
        render(<ProgressModal isOpen={false} items={[]} onClose={vi.fn()} />);
        expect(screen.queryByText("Deploying\u2026")).not.toBeInTheDocument();
    });

    it("shows Deploying header while items are pending/running", () => {
        const items = [
            makeItem("1", "Tweak One", "running"),
            makeItem("2", "Tweak Two", "pending"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("Deploying\u2026")).toBeInTheDocument();
    });

    it("shows Deployment Complete when all items succeeded", () => {
        const items = [
            makeItem("1", "Tweak One", "success"),
            makeItem("2", "Tweak Two", "success"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("Deployment Complete")).toBeInTheDocument();
    });

    it("shows Deployment Partially Failed when some items failed", () => {
        const items = [
            makeItem("1", "Tweak One", "success"),
            makeItem("2", "Tweak Two", "failed"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("Deployment Partially Failed")).toBeInTheDocument();
    });

    it("renders all item names", () => {
        const items = [
            makeItem("1", "First Tweak", "pending"),
            makeItem("2", "Second Tweak", "running"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("First Tweak")).toBeInTheDocument();
        expect(screen.getByText("Second Tweak")).toBeInTheDocument();
    });

    it("shows progress counter text", () => {
        const items = [
            makeItem("1", "Tweak One", "success"),
            makeItem("2", "Tweak Two", "pending"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("1 of 2 completed")).toBeInTheDocument();
    });

    it("includes failed count in progress text", () => {
        const items = [
            makeItem("1", "Tweak One", "success"),
            makeItem("2", "Tweak Two", "failed"),
        ];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText(/1 of 2 completed.*1 failed/)).toBeInTheDocument();
    });

    it("shows failure actions section when showFailureActions=true", () => {
        const items = [makeItem("1", "Tweak One", "failed")];
        render(
            <ProgressModal
                isOpen
                items={items}
                onClose={vi.fn()}
                showFailureActions
                onRollback={vi.fn()}
                onSkipAndContinue={vi.fn()}
            />
        );
        expect(screen.getByRole("button", { name: /rollback all/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /skip.*continue/i })).toBeInTheDocument();
    });

    it("does not show failure actions when showFailureActions=false", () => {
        const items = [makeItem("1", "Tweak One", "failed")];
        render(
            <ProgressModal
                isOpen
                items={items}
                onClose={vi.fn()}
                showFailureActions={false}
                onRollback={vi.fn()}
                onSkipAndContinue={vi.fn()}
            />
        );
        expect(screen.queryByRole("button", { name: /rollback/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    });

    it("calls onRollback when Rollback button clicked", async () => {
        const onRollback = vi.fn();
        const user = setupUser();
        const items = [makeItem("1", "Tweak One", "failed")];
        render(
            <ProgressModal
                isOpen
                items={items}
                onClose={vi.fn()}
                showFailureActions
                onRollback={onRollback}
                onSkipAndContinue={vi.fn()}
            />
        );
        await user.click(screen.getByRole("button", { name: /rollback all/i }));
        expect(onRollback).toHaveBeenCalledOnce();
    });

    it("calls onSkipAndContinue when Skip button clicked", async () => {
        const onSkipAndContinue = vi.fn();
        const user = setupUser();
        const items = [makeItem("1", "Tweak One", "failed")];
        render(
            <ProgressModal
                isOpen
                items={items}
                onClose={vi.fn()}
                showFailureActions
                onRollback={vi.fn()}
                onSkipAndContinue={onSkipAndContinue}
            />
        );
        await user.click(screen.getByRole("button", { name: /skip.*continue/i }));
        expect(onSkipAndContinue).toHaveBeenCalledOnce();
    });

    it("shows Done button when all done and no failure actions", () => {
        const items = [makeItem("1", "Tweak One", "success")];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} showFailureActions={false} />);
        expect(screen.getByRole("button", { name: /^done$/i })).toBeInTheDocument();
    });

    it("calls onClose when Done button clicked", async () => {
        const onClose = vi.fn();
        const user = setupUser();
        const items = [makeItem("1", "Tweak One", "success")];
        render(<ProgressModal isOpen items={items} onClose={onClose} showFailureActions={false} />);
        await user.click(screen.getByRole("button", { name: /^done$/i }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("shows duration for successful items with result", () => {
        const items: ProgressItem[] = [{
            id: "1",
            name: "Tweak One",
            status: "success",
            result: { success: true, tweakId: "1", stdout: "", stderr: "", exitCode: 0, durationMs: 142 },
        }];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} />);
        expect(screen.getByText("142ms")).toBeInTheDocument();
    });

    it("shows error message for failed items with result", () => {
        const items: ProgressItem[] = [{
            id: "1",
            name: "Tweak One",
            status: "failed",
            result: { success: false, tweakId: "1", stdout: "", stderr: "Access denied", exitCode: 1, durationMs: 50 },
        }];
        render(<ProgressModal isOpen items={items} onClose={vi.fn()} showFailureActions />);
        expect(screen.getByText("Access denied")).toBeInTheDocument();
    });
});
