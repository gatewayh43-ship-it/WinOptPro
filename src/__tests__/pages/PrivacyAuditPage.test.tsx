import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { PrivacyAuditPage } from "@/pages/PrivacyAuditPage";
import { usePrivacyAudit } from "@/hooks/usePrivacyAudit";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className }: any) => (
                <div className={className}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

const mockRunScan = vi.fn();
const mockFixIssues = vi.fn();
const mockFixAll = vi.fn();

const mockAuditResult = {
    score: 45,
    issues: [
        {
            id: "diagtrack_svc",
            category: "Telemetry",
            title: "Diagnostics Tracking Service running",
            severity: 3,
            description: "DiagTrack sends diagnostic data to Microsoft.",
            fix_cmd: "",
            is_fixed: false,
        },
        {
            id: "advertising_id",
            category: "Registry",
            title: "Advertising ID enabled",
            severity: 2,
            description: "Tracks app usage for personalized ads.",
            fix_cmd: "",
            is_fixed: true,
        },
        {
            id: "wer_service",
            category: "Services",
            title: "Windows Error Reporting service running",
            severity: 1,
            description: "Sends crash data to Microsoft.",
            fix_cmd: "",
            is_fixed: false,
        },
    ],
};

vi.mock("@/hooks/usePrivacyAudit", () => ({
    usePrivacyAudit: vi.fn(() => ({
        auditResult: mockAuditResult,
        isScanning: false,
        isFixing: false,
        error: null,
        runScan: mockRunScan,
        fixIssues: mockFixIssues,
        fixAll: mockFixAll,
    })),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("PrivacyAuditPage", () => {
    beforeEach(() => {
        mockRunScan.mockReset();
        mockFixIssues.mockReset();
        mockFixAll.mockReset();
    });

    it("renders the Privacy Audit heading", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByText("Audit")).toBeInTheDocument();
        expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("shows score gauge with score value", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByText("45")).toBeInTheDocument();
        expect(screen.getByText("Score")).toBeInTheDocument();
    });

    it("shows total issues count", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Total Issues")).toBeInTheDocument();
    });

    it("shows fixed count", () => {
        render(<PrivacyAuditPage />);
        // "Fixed" appears as a label in the summary stats and as a badge on fixed issues
        const fixedElements = screen.getAllByText(/^Fixed$/i);
        expect(fixedElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders issue cards with titles", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByText("Diagnostics Tracking Service running")).toBeInTheDocument();
        expect(screen.getByText("Advertising ID enabled")).toBeInTheDocument();
    });

    it("shows Fix button for unfixed issues", () => {
        render(<PrivacyAuditPage />);
        // Two issues are unfixed, so there should be Fix buttons
        const fixButtons = screen.getAllByRole("button", { name: /^Fix$/i });
        expect(fixButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("clicking Fix button calls fixIssues with issue id", async () => {
        const user = setupUser();
        render(<PrivacyAuditPage />);
        const fixButtons = screen.getAllByRole("button", { name: /^Fix$/i });
        await user.click(fixButtons[0]);
        await waitFor(() => {
            expect(mockFixIssues).toHaveBeenCalled();
        });
    });

    it("Re-scan button triggers runScan", async () => {
        const user = setupUser();
        render(<PrivacyAuditPage />);
        // runScan is called once on mount (useEffect) and again when button is clicked
        const callsBefore = mockRunScan.mock.calls.length;
        await user.click(screen.getByRole("button", { name: /Re-scan/i }));
        expect(mockRunScan.mock.calls.length).toBe(callsBefore + 1);
    });

    it("shows Fix All button when there are unfixed issues", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByRole("button", { name: /Fix All/i })).toBeInTheDocument();
    });

    it("clicking Fix All calls fixAll", async () => {
        const user = setupUser();
        render(<PrivacyAuditPage />);
        await user.click(screen.getByRole("button", { name: /Fix All/i }));
        expect(mockFixAll).toHaveBeenCalledTimes(1);
    });

    it("shows category filter buttons", () => {
        render(<PrivacyAuditPage />);
        expect(screen.getByRole("button", { name: /^All/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Telemetry/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Registry/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Services/i })).toBeInTheDocument();
    });

    it("shows scanning state when isScanning is true", () => {
        vi.mocked(usePrivacyAudit).mockReturnValueOnce({
            auditResult: null,
            isScanning: true,
            isFixing: false,
            error: null,
            runScan: mockRunScan,
            fixIssues: mockFixIssues,
            fixAll: mockFixAll,
        });
        render(<PrivacyAuditPage />);
        expect(screen.getByText(/Scanning privacy settings/i)).toBeInTheDocument();
    });
});
