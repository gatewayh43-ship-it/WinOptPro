import { ReactNode, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalCache } from "../../hooks/useGlobalCache";

export function MainLayout({
    currentView,
    setView,
    onOpenSearch,
    children
}: {
    currentView: string;
    setView: (v: string) => void;
    onOpenSearch: () => void;
    children: ReactNode;
}) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const viewToCacheKey: Record<string, string[]> = {
            network: ['network'],
            storage: ['storage_items', 'storage_health'],
            wsl_manager: ['wsl_status', 'wsl_config', 'wsl_setup'],
            drivers: ['drivers'],
            processes: ['processes'],
            startup: ['startup_items'],
            power_manager: ['power_plans', 'battery_health']
        };

        const keys = viewToCacheKey[currentView];
        if (keys) {
            keys.forEach(k => useGlobalCache.getState().clearCache(k));
        }

        // Increment key to trigger a complete remount of the page
        setRefreshKey(k => k + 1);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div className="flex h-screen app-wrapper overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* AI-Generated Dynamic Mesh Background Layer */}
            <div className="nano-mesh-bg pointer-events-none"></div>

            <Sidebar currentView={currentView} setView={setView} />

            <main className="flex-1 flex flex-col relative h-full">
                {/* Subtle top ambient light */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent z-20"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                {/* Centred search bar — appears above every page */}
                <div className="relative z-20 flex-shrink-0 px-4 sm:px-6 lg:px-10 pt-5 pb-1 flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-2xl mx-auto flex items-center gap-3">
                        <button
                            onClick={onOpenSearch}
                            className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-primary/20 text-slate-500 dark:text-slate-300 hover:text-slate-400 transition-all duration-200 group shadow-sm"
                        >
                            <Search className="w-4 h-4 shrink-0 group-hover:text-primary transition-colors duration-200" />
                            <span className="flex-1 text-left text-[13px] font-medium select-none">
                                Search tweaks, settings, pages…
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-white/5 border border-white/10 rounded-md text-slate-600 leading-none">Ctrl</kbd>
                                <kbd className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-white/5 border border-white/10 rounded-md text-slate-600 leading-none">K</kbd>
                            </div>
                        </button>

                        <button
                            onClick={handleRefresh}
                            className={`p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.1] hover:text-primary transition-all shadow-sm ${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
                            title="Refresh Page Data"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-400 dark:text-slate-200 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-10 pt-5 pb-4 sm:pb-6 lg:pb-10 relative z-10 w-full">
                    <div className="max-w-6xl mx-auto h-full">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={`${currentView}-${refreshKey}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
