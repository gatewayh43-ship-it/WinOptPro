import { vi } from "vitest";

/**
 * Tauri IPC handler registry for tests.
 *
 * Usage:
 *   import { tauriHandlers } from "@/test/mocks/tauri";
 *   tauriHandlers["get_system_vitals"] = vi.fn().mockResolvedValue(mockVitals);
 */
export const tauriHandlers: Record<string, any> = {};

/**
 * Configures the `@tauri-apps/api/core` mock to dispatch calls to tauriHandlers.
 * Call inside a beforeEach or at the top of a describe block that needs IPC.
 */
export function setupTauriMock() {
    const { invoke } = require("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation(
        (cmd: string, args?: unknown) => {
            if (tauriHandlers[cmd]) {
                return (tauriHandlers[cmd] as any)(args);
            }
            return Promise.resolve(null);
        }
    );
}

/** Reset all handler mocks between tests */
export function resetTauriMocks() {
    Object.values(tauriHandlers).forEach((fn) => fn.mockReset());
}
