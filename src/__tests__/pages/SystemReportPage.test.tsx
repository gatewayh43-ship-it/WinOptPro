import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { SystemReportPage } from "@/pages/SystemReportPage";
import { useSystemReport } from "@/hooks/useSystemReport";

const mockGenerateReport = vi.fn();
const mockSaveReport = vi.fn();

vi.mock("@/hooks/useSystemReport", () => ({
    useSystemReport: vi.fn(() => ({
        reportHtml: null,
        isGenerating: false,
        error: null,
        generateReport: mockGenerateReport,
        saveReport: mockSaveReport,
    })),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("SystemReportPage", () => {
    beforeEach(() => {
        mockGenerateReport.mockReset();
        mockSaveReport.mockReset();
    });

    it("renders the System Report heading", () => {
        render(<SystemReportPage />);
        expect(screen.getByText("Report")).toBeInTheDocument();
        expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("shows description text", () => {
        render(<SystemReportPage />);
        expect(screen.getByText(/Generate a comprehensive HTML report/i)).toBeInTheDocument();
    });

    it("shows Generate Report button when no report exists", () => {
        render(<SystemReportPage />);
        expect(screen.getByRole("button", { name: /Generate Report/i })).toBeInTheDocument();
    });

    it("clicking Generate Report button calls generateReport", async () => {
        const user = setupUser();
        render(<SystemReportPage />);
        await user.click(screen.getByRole("button", { name: /Generate Report/i }));
        expect(mockGenerateReport).toHaveBeenCalledTimes(1);
    });

    it("shows empty state prompt when no report and not generating", () => {
        render(<SystemReportPage />);
        expect(screen.getByText(/No report generated yet/i)).toBeInTheDocument();
    });

    it("shows loading state when isGenerating is true", () => {
        vi.mocked(useSystemReport).mockReturnValueOnce({
            reportHtml: null,
            isGenerating: true,
            error: null,
            generateReport: mockGenerateReport,
            saveReport: mockSaveReport,
        });
        render(<SystemReportPage />);
        expect(screen.getByText(/Gathering system information/i)).toBeInTheDocument();
    });

    it("shows error message when error is set", () => {
        vi.mocked(useSystemReport).mockReturnValueOnce({
            reportHtml: null,
            isGenerating: false,
            error: "Failed to collect system data",
            generateReport: mockGenerateReport,
            saveReport: mockSaveReport,
        });
        render(<SystemReportPage />);
        expect(screen.getByText(/Failed to collect system data/i)).toBeInTheDocument();
    });

    it("shows Save HTML and Export PDF buttons when report is available", () => {
        vi.mocked(useSystemReport).mockReturnValueOnce({
            reportHtml: "<html><body>Report</body></html>",
            isGenerating: false,
            error: null,
            generateReport: mockGenerateReport,
            saveReport: mockSaveReport,
        });
        render(<SystemReportPage />);
        expect(screen.getByRole("button", { name: /Save HTML/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Export as PDF/i })).toBeInTheDocument();
    });

    it("shows Regenerate button when report already exists", () => {
        vi.mocked(useSystemReport).mockReturnValueOnce({
            reportHtml: "<html><body>Report</body></html>",
            isGenerating: false,
            error: null,
            generateReport: mockGenerateReport,
            saveReport: mockSaveReport,
        });
        render(<SystemReportPage />);
        expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
    });

    it("clicking Save HTML calls saveReport with path", async () => {
        const user = setupUser();
        vi.mocked(useSystemReport).mockReturnValueOnce({
            reportHtml: "<html><body>Report</body></html>",
            isGenerating: false,
            error: null,
            generateReport: mockGenerateReport,
            saveReport: mockSaveReport,
        });
        render(<SystemReportPage />);
        await user.click(screen.getByRole("button", { name: /Save HTML/i }));
        expect(mockSaveReport).toHaveBeenCalledWith(expect.stringContaining("WinOpt-SystemReport.html"));
    });
});
