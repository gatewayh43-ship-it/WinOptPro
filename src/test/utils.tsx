import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Custom render wrapper.
 * Extend with providers (ThemeProvider, QueryClientProvider, etc.) as they are added.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Create a userEvent instance with default setup options.
 * Usage:
 *   const user = setupUser();
 *   await user.click(element);
 */
function setupUser() {
    return userEvent.setup();
}

// Re-export everything from RTL so tests can import from one place
export * from "@testing-library/react";
export { customRender as render, setupUser };
