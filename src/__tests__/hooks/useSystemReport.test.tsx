import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useSystemReport } from "@/hooks/useSystemReport";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

const REPORT_HTML = `<!DOCTYPE html><html><head><title>System Report</title></head><body><h1>Test</h1></body></html>`;

describe("useSystemReport", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        vi.mocked(tauriCore.invoke).mockReset();
    });

    // ── isTauri=false ─────────────────────────────────────────────────────────

    describe("isTauri=false (desktop runtime unavailable)", () => {
        it("initial state: reportHtml=null, isGenerating=false, error=null", () => {
            const { result } = renderHook(() => useSystemReport());
            expect(result.current.reportHtml).toBeNull();
            expect(result.current.isGenerating).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it("generateReport reports the missing desktop runtime without invoking Tauri", async () => {
            const { result } = renderHook(() => useSystemReport());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(result.current.reportHtml).toBeNull();
            expect(result.current.error).toContain("desktop runtime");
            expect(tauriCore.invoke).not.toHaveBeenCalledWith("generate_system_report");
        });

        it("generateReport sets isGenerating=false after completion", async () => {
            const { result } = renderHook(() => useSystemReport());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(result.current.isGenerating).toBe(false);
        });

        it("saveReport returns false when reportHtml is null", async () => {
            const { result } = renderHook(() => useSystemReport());

            // No generate call — reportHtml is null
            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.saveReport("C:\\report.html");
            });

            expect(returnValue).toBe(false);
        });
    });

    // ── isTauri=true — tested via dynamic import with window stub ─────────────

    describe("isTauri=true (dynamic import with window stub)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            (window as any).__TAURI_INTERNALS__ = {};
            vi.resetModules();
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "generate_system_report") return REPORT_HTML;
                if (cmd === "save_system_report") return undefined;
                return null;
            });
        });

        afterEach(() => {
            delete (window as any).__TAURI_INTERNALS__;
            vi.resetModules();
        });

        it("generateReport calls invoke('generate_system_report')", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("generate_system_report");
        });

        it("generateReport populates reportHtml with invoke result", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(result.current.reportHtml).toBe(REPORT_HTML);
        });

        it("generateReport sets isGenerating=false after success", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(result.current.isGenerating).toBe(false);
        });

        it("generateReport sets isGenerating=true during generation", async () => {
            let wasGeneratingDuring = false;
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "generate_system_report") {
                    wasGeneratingDuring = true;
                    return REPORT_HTML;
                }
                return null;
            });

            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(wasGeneratingDuring).toBe(true);
            expect(result.current.isGenerating).toBe(false);
        });

        it("generateReport sets error when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI query failed"));

            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            expect(result.current.error).toContain("WMI query failed");
            expect(result.current.isGenerating).toBe(false);
        });

        it("saveReport calls invoke('save_system_report') with path and html", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            // Generate first
            await act(async () => {
                await result.current.generateReport();
            });

            await act(async () => {
                await result.current.saveReport("C:\\my-report.html");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("save_system_report", {
                path: "C:\\my-report.html",
                html: REPORT_HTML,
            });
        });

        it("saveReport returns true on success", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.saveReport("C:\\report.html");
            });

            expect(returnValue).toBe(true);
        });

        it("saveReport returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "generate_system_report") return REPORT_HTML;
                if (cmd === "save_system_report") throw new Error("permission denied");
                return null;
            });

            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            await act(async () => {
                await result.current.generateReport();
            });

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.saveReport("C:\\report.html");
            });

            expect(returnValue).toBe(false);
        });

        it("saveReport returns false if reportHtml is null (no generation yet)", async () => {
            const { useSystemReport: useSystemReportFresh } = await import("@/hooks/useSystemReport");
            const { result } = renderHook(() => useSystemReportFresh());

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.saveReport("C:\\report.html");
            });

            expect(returnValue).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalledWith(
                "save_system_report",
                expect.anything()
            );
        });
    });
});
