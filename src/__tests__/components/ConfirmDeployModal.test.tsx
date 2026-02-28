import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { ConfirmDeployModal } from "@/components/ConfirmDeployModal";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, onClick, className }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

const baseTweak = {
    id: "tweak-1",
    name: "Disable SysMain",
    riskLevel: "Green",
    execution: { code: "Set-Service -Name SysMain -StartupType Disabled", revertCode: "Set-Service -Name SysMain -StartupType Automatic" },
    estimatedExecutionTimeMs: 500,
};

const yellowTweak = { ...baseTweak, id: "tweak-2", name: "Disable Search Indexer", riskLevel: "Yellow" };
const redTweak = { ...baseTweak, id: "tweak-3", name: "Disable Defender", riskLevel: "Red" };

describe("ConfirmDeployModal", () => {
    it("renders nothing when isOpen is false", () => {
        render(<ConfirmDeployModal isOpen={false} tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.queryByText("Confirm Deploy")).not.toBeInTheDocument();
    });

    it("renders header with tweak count", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak, yellowTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("Confirm Deploy")).toBeInTheDocument();
        expect(screen.getByText("2 tweaks ready")).toBeInTheDocument();
    });

    it("uses singular 'tweak' for a single item", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("1 tweak ready")).toBeInTheDocument();
    });

    it("renders each tweak name", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak, yellowTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("Disable SysMain")).toBeInTheDocument();
        expect(screen.getByText("Disable Search Indexer")).toBeInTheDocument();
    });

    it("shows Safe badge for Green tweaks", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("shows Moderate badge for Yellow tweaks", () => {
        render(<ConfirmDeployModal isOpen tweaks={[yellowTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("Moderate")).toBeInTheDocument();
    });

    it("shows High Risk badge for Red tweaks", () => {
        render(<ConfirmDeployModal isOpen tweaks={[redTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("High Risk")).toBeInTheDocument();
    });

    it("shows Red warning banner for Red tweaks", () => {
        render(<ConfirmDeployModal isOpen tweaks={[redTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText(/high-risk tweaks that may affect system stability/i)).toBeInTheDocument();
    });

    it("shows Yellow warning banner for Yellow tweaks (no Red)", () => {
        render(<ConfirmDeployModal isOpen tweaks={[yellowTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText(/moderate-risk tweaks/i)).toBeInTheDocument();
    });

    it("shows no warning banner for Green-only tweaks", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.queryByText(/high-risk|moderate-risk/i)).not.toBeInTheDocument();
    });

    it("calls onCancel when Cancel button clicked", async () => {
        const onCancel = vi.fn();
        const user = setupUser();
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={onCancel} />);
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("calls onConfirm when Confirm & Deploy clicked", async () => {
        const onConfirm = vi.fn();
        const user = setupUser();
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={onConfirm} onCancel={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /confirm.*deploy/i }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("shows Deploying spinner when isExecuting", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} isExecuting />);
        expect(screen.getByText("Deploying\u2026")).toBeInTheDocument();
    });

    it("disables buttons when isExecuting", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} isExecuting />);
        const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });
        const deployBtn = screen.getByRole("button", { name: /deploying/i });
        expect(cancelBtn).toBeDisabled();
        expect(deployBtn).toBeDisabled();
    });

    it("shows risk summary in footer", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak, yellowTweak, redTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText(/1 Safe/)).toBeInTheDocument();
        expect(screen.getByText(/1 Moderate/)).toBeInTheDocument();
        expect(screen.getByText(/1 High Risk/)).toBeInTheDocument();
    });

    it("renders tweak execution code snippet", () => {
        render(<ConfirmDeployModal isOpen tweaks={[baseTweak]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("Set-Service -Name SysMain -StartupType Disabled")).toBeInTheDocument();
    });
});
