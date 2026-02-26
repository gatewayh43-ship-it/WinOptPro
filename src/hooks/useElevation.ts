import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * Hook for checking and handling admin elevation.
 */
export function useElevation() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    const checkAdmin = useCallback(async () => {
        setChecking(true);
        try {
            const admin = await invoke<boolean>("is_admin");
            setIsAdmin(admin);
            return admin;
        } catch (err) {
            console.error("Failed to check admin status:", err);
            setIsAdmin(false);
            return false;
        } finally {
            setChecking(false);
        }
    }, []);

    return { isAdmin, checking, checkAdmin };
}
