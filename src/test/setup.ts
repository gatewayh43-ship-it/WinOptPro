import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";

// ── Tauri API global mock ────────────────────────────────────────────────────
// Tauri's IPC bridge is unavailable in jsdom; stub the entire module.
vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
    open: vi.fn(() => Promise.resolve()),
}));

// ── localStorage ─────────────────────────────────────────────────────────────
// jsdom 28 + Node 22 uses native localStorage which may lack .clear().
// Provide a consistent in-memory mock.
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
    };
})();
vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
    localStorageMock.clear();
});

// ── matchMedia (JSDOM doesn't implement it) ───────────────────────────────────
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// ── ResizeObserver ────────────────────────────────────────────────────────────
globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
