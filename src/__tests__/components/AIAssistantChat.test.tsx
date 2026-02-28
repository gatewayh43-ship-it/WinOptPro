import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor, fireEvent } from "@/test/utils";
import { AIAssistantChat } from "@/components/AI/AIAssistantChat";
import { useAppStore } from "@/store/appStore";
import type { ReactNode } from "react";

// JSDOM doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, onClick }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
            button: ({ children, className, onClick, whileHover, whileTap, ...rest }: any) => (
                <button className={className} onClick={onClick} {...rest}>{children}</button>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

// Mock fetch for Ollama API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function enableAI() {
    useAppStore.setState({
        userSettings: {
            ...useAppStore.getState().userSettings,
            aiAssistantEnabled: true,
        },
    });
}

function disableAI() {
    useAppStore.setState({
        userSettings: {
            ...useAppStore.getState().userSettings,
            aiAssistantEnabled: false,
        },
    });
}

describe("AIAssistantChat", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        enableAI();
    });

    it("returns null when aiAssistantEnabled is false", () => {
        disableAI();
        const { container } = render(<AIAssistantChat />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the FAB button when enabled", () => {
        render(<AIAssistantChat />);
        // The sparkle FAB button should be present
        expect(document.querySelector("button")).toBeTruthy();
    });

    it("opens the chat window when FAB is clicked", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        const fab = screen.getAllByRole("button")[0];
        await user.click(fab);

        expect(screen.getByText("Pro AI Assistant")).toBeInTheDocument();
    });

    it("shows the initial greeting message", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);

        expect(screen.getByText(/WinOpt Pro AI Agent/i)).toBeInTheDocument();
    });

    it("shows the chat input field when open", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);

        expect(screen.getByPlaceholderText(/optimization advice/i)).toBeInTheDocument();
    });

    it("closes the chat when the chevron-down button is clicked", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);
        expect(screen.getByText("Pro AI Assistant")).toBeInTheDocument();

        // Click the close (chevron-down) button inside the chat header
        const closeBtn = screen.getAllByRole("button").find(
            (b) => b.className.includes("hover:bg-white/10") && b.className.includes("rounded-lg")
        );
        expect(closeBtn).toBeTruthy();
        await user.click(closeBtn!);

        expect(screen.queryByText("Pro AI Assistant")).not.toBeInTheDocument();
    });

    it("shows user message in chat after sending", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: { content: "Here is my recommendation." } }),
        });

        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);
        const input = screen.getByPlaceholderText(/optimization advice/i);
        await user.type(input, "Make my PC faster");
        // Use fireEvent to submit to avoid send-button ambiguity
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        await waitFor(() => {
            expect(screen.getByText("Make my PC faster")).toBeInTheDocument();
        });
    });

    it("shows AI response after successful fetch", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: { content: "Disable SysMain for better performance." } }),
        });

        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);
        const input = screen.getByPlaceholderText(/optimization advice/i);
        await user.type(input, "Speed tips");
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        await waitFor(() => {
            expect(screen.getByText("Disable SysMain for better performance.")).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("shows error message when fetch fails", async () => {
        mockFetch.mockRejectedValue(new Error("Connection refused"));

        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);
        const input = screen.getByPlaceholderText(/optimization advice/i);
        await user.type(input, "Help me");
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        await waitFor(() => {
            expect(screen.getByText(/Error: Could not connect/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("shows error when response is not ok", async () => {
        mockFetch.mockResolvedValue({ ok: false });

        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);
        const input = screen.getByPlaceholderText(/optimization advice/i);
        await user.type(input, "Boost gaming");
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        await waitFor(() => {
            expect(screen.getByText(/Error: Could not connect/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("send button is disabled when input is empty", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);

        // All buttons in the chat — the send button has disabled attr when input empty
        const buttons = screen.getAllByRole("button");
        const disabledBtns = buttons.filter((b) => b.hasAttribute("disabled"));
        expect(disabledBtns.length).toBeGreaterThan(0);
    });

    it("Qwen model label is shown in chat header", async () => {
        const user = setupUser();
        render(<AIAssistantChat />);

        await user.click(screen.getAllByRole("button")[0]);

        expect(screen.getByText(/Qwen 2\.5/i)).toBeInTheDocument();
    });
});
