import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Suppress React's console.error for expected error boundary catches
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
});
afterEach(() => {
    console.error = originalConsoleError;
});

function BrokenComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
    if (shouldThrow) throw new Error("Test render error");
    return <p>Children render fine</p>;
}

describe("ErrorBoundary", () => {
    it("renders children normally when no error occurs", () => {
        render(
            <ErrorBoundary>
                <p>Safe content</p>
            </ErrorBoundary>
        );
        expect(screen.getByText("Safe content")).toBeInTheDocument();
    });

    it("catches a render error and shows 'Something went wrong'", () => {
        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("displays the error message in the fallback UI", () => {
        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );
        expect(screen.getByText("Test render error")).toBeInTheDocument();
    });

    it("renders a Try Again button in the fallback UI", () => {
        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("renders custom fallback when provided", () => {
        render(
            <ErrorBoundary fallback={<p>Custom fallback</p>}>
                <BrokenComponent />
            </ErrorBoundary>
        );
        expect(screen.getByText("Custom fallback")).toBeInTheDocument();
        expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("does not show error UI when no error occurs", () => {
        render(
            <ErrorBoundary>
                <p>Working content</p>
            </ErrorBoundary>
        );
        expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    });

    it("Try Again button click does not crash the component", async () => {
        const user = setupUser();

        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();

        // Clicking Try Again resets the error state (component will re-catch since
        // BrokenComponent always throws, but it should not crash the test runner)
        await user.click(screen.getByRole("button", { name: /try again/i }));

        // The fallback UI should still be visible (child re-throws)
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("shows the 'An unexpected error occurred' description", () => {
        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );
        expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    });
});
