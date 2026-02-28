import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, setupUser, waitFor, act, fireEvent } from "@/test/utils";
import { ToastProvider, useToast } from "@/components/ToastSystem";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

// Helper component that uses useToast to trigger toasts
function ToastTrigger({ type, title, message, duration }: {
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    duration?: number;
}) {
    const { addToast } = useToast();
    return (
        <button onClick={() => addToast({ type, title, message, duration })}>
            Add Toast
        </button>
    );
}

// RemoveTrigger component kept for reference but not used in tests
// (was used to verify removeToast but tests use direct dismiss button clicks instead)

describe("ToastSystem", () => {
    describe("useToast fallback (outside provider)", () => {
        it("returns no-op functions when used outside ToastProvider", () => {
            function FallbackComponent() {
                const { addToast, removeToast } = useToast();
                // Should not throw
                addToast({ type: "info", title: "test" });
                removeToast("fake-id");
                return <p>Rendered</p>;
            }
            render(<FallbackComponent />);
            expect(screen.getByText("Rendered")).toBeInTheDocument();
        });
    });

    describe("ToastProvider + useToast", () => {
        it("renders children without showing toasts initially", () => {
            render(
                <ToastProvider>
                    <p>App content</p>
                </ToastProvider>
            );
            expect(screen.getByText("App content")).toBeInTheDocument();
        });

        it("shows a success toast when addToast is called", async () => {
            const user = setupUser();
            render(
                <ToastProvider>
                    <ToastTrigger type="success" title="Saved!" />
                </ToastProvider>
            );

            await user.click(screen.getByRole("button", { name: /add toast/i }));
            expect(await screen.findByText("Saved!")).toBeInTheDocument();
        });

        it("shows an error toast", async () => {
            const user = setupUser();
            render(
                <ToastProvider>
                    <ToastTrigger type="error" title="Something failed" />
                </ToastProvider>
            );

            await user.click(screen.getByRole("button", { name: /add toast/i }));
            expect(await screen.findByText("Something failed")).toBeInTheDocument();
        });

        it("shows a warning toast", async () => {
            const user = setupUser();
            render(
                <ToastProvider>
                    <ToastTrigger type="warning" title="Watch out" />
                </ToastProvider>
            );

            await user.click(screen.getByRole("button", { name: /add toast/i }));
            expect(await screen.findByText("Watch out")).toBeInTheDocument();
        });

        it("shows an info toast with message body", async () => {
            const user = setupUser();
            render(
                <ToastProvider>
                    <ToastTrigger type="info" title="Info title" message="Info detail message" />
                </ToastProvider>
            );

            await user.click(screen.getByRole("button", { name: /add toast/i }));
            expect(await screen.findByText("Info title")).toBeInTheDocument();
            expect(screen.getByText("Info detail message")).toBeInTheDocument();
        });

        it("clicking the dismiss X removes the toast", async () => {
            const user = setupUser();
            render(
                <ToastProvider>
                    <ToastTrigger type="info" title="Dismiss me" duration={0} />
                </ToastProvider>
            );

            await user.click(screen.getByRole("button", { name: /add toast/i }));
            expect(await screen.findByText("Dismiss me")).toBeInTheDocument();

            // Find the small X button (not the Add Toast button)
            const allBtns = screen.getAllByRole("button");
            const xBtn = allBtns.find((b) => !b.textContent?.includes("Add Toast"));
            expect(xBtn).toBeTruthy();
            await user.click(xBtn!);

            await waitFor(() => {
                expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
            });
        });

        it("auto-dismisses toast after duration elapses", () => {
            vi.useFakeTimers();
            render(
                <ToastProvider>
                    <ToastTrigger type="success" title="Auto dismiss" duration={500} />
                </ToastProvider>
            );

            // Use fireEvent + act so fake timers work predictably
            act(() => {
                fireEvent.click(screen.getByRole("button", { name: /add toast/i }));
            });
            expect(screen.getByText("Auto dismiss")).toBeInTheDocument();

            // Advance past the 500ms duration
            act(() => {
                vi.advanceTimersByTime(600);
            });

            // After timer fires the removeToast callback, toast should be gone
            expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument();

            vi.useRealTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("multiple toasts can be shown at once", () => {
            render(
                <ToastProvider>
                    <ToastTrigger type="success" title="Toast B" duration={0} />
                </ToastProvider>
            );

            const btn = screen.getByRole("button", { name: /add toast/i });
            fireEvent.click(btn);
            fireEvent.click(btn);

            const toasts = screen.getAllByText("Toast B");
            expect(toasts.length).toBe(2);
        });
    });
});
