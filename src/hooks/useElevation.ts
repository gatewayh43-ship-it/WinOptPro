import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export function useElevation() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

    return {
        isAdmin,
        checkAdmin,
    };
}
