import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

interface ElevationResult {
    success: boolean;
    output: string;
    error: string;
}

export function useElevation() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [isElevating, setIsElevating] = useState(false);

    const checkAdmin = useCallback(async () => {
        if (!isTauri()) { setIsAdmin(false); return false; }
        try {
            const admin = await invoke<boolean>("is_admin");
            setIsAdmin(admin);
            return admin;
        } catch {
            setIsAdmin(false);
            return false;
        }
    }, []);

    const elevateAndExecute = useCallback(async (code: string): Promise<ElevationResult> => {
        if (!isTauri()) return { success: false, output: "", error: "Not running in Tauri" };
        setIsElevating(true);
        try {
            const result = await invoke<ElevationResult>("elevate_and_execute", { code });
            return result;
        } catch (e) {
            return {
                success: false,
                output: "",
                error: String(e),
            };
        } finally {
            setIsElevating(false);
        }
    }, []);

    return {
        isAdmin,
        isElevating,
        checkAdmin,
        elevateAndExecute,
    };
}
