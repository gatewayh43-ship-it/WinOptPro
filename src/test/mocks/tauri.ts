import { vi } from "vitest";
import * as tauriCore from "@tauri-apps/api/core";

/**
 * Tauri IPC handler registry for tests.
 *
 * Usage:
 *   import { tauriHandlers } from "@/test/mocks/tauri";
 *   tauriHandlers["get_system_vitals"] = vi.fn().mockResolvedValue(mockVitals);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tauriHandlers: Record<string, any> = {};

/**
 * Configures the `@tauri-apps/api/core` mock to dispatch calls to tauriHandlers.
 * Call inside a beforeEach or at the top of a describe block that needs IPC.
 */
export function setupTauriMock() {
    vi.mocked(tauriCore.invoke).mockImplementation(
        (cmd: string, args?: unknown) => {
            if (tauriHandlers[cmd]) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return Promise.resolve((tauriHandlers[cmd] as (a: unknown) => unknown)(args));
            }
            return Promise.resolve(null);
        }
    );
}

/** Reset all handler mocks between tests */
export function resetTauriMocks() {
    Object.values(tauriHandlers).forEach((fn) => fn.mockReset());
}
