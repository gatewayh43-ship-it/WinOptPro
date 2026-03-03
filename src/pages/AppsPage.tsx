import { useState, useEffect } from "react";
import { useApps } from "../hooks/useApps";
import { useAppStore } from "../store/appStore";
import { useSmartStore } from "../hooks/useSmartStore";
import { AppDetailsPage } from "./AppDetailsPage";
import AppMetadata from "../data/app_metadata.json";
import { Search, Sparkles, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function AppIcon({ appId, appName, className = "" }: { appId: string, appName: string, className?: string }) {
    const domainPart = appId.split('.')[0]?.toLowerCase() || 'unknown';
    const [imgSrc, setImgSrc] = useState(`https://logo.clearbit.com/${domainPart}.com`);

    return (
        <img
            src={imgSrc}
            alt={appName}
            className={className}
            onError={() => {
                if (imgSrc.includes('clearbit')) {
                    setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(appName)}&background=random&color=fff&rounded=true&bold=true&size=128`);
                }
            }}
        />
    );
}

export function AppsPage() {
    const { userSettings } = useAppStore();
    const { installingId, installResults, installedApps, checkChocoAvailable, installApp } = useApps();

    const {
        isSearching,
        searchResults,
        searchError,
        searchApps
    } = useSmartStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [smartSearchEnabled, setSmartSearchEnabled] = useState(userSettings.aiAssistantEnabled);
    const [selectedAppId, setSelectedAppId] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        checkChocoAvailable();
    }, [checkChocoAvailable]);

    const handleSearchClick = () => {
        if (!searchQuery.trim()) {
            return;
        }
        searchApps(searchQuery, smartSearchEnabled);
    };

    const handleInstall = async (appId: string) => {
        await installApp(appId, "", appId);
    };

    if (selectedAppId) {
        return (
            <AppDetailsPage
                appId={selectedAppId.id}
                appName={selectedAppId.name}
                onBack={() => setSelectedAppId(null)}
            />
        );
    }

    const isShowingSearch = searchQuery.trim().length > 0 && searchResults.length > 0;
    const isErrorOrEmpty = searchQuery.trim().length > 0 && (searchError || searchResults.length === 0) && !isSearching;

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto min-h-screen">
            {/* Store Header & Search */}
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-6 relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl rounded-full pointer-events-none" />

                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight flex items-center gap-4 relative z-10">
                    <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse" />
                    App Store
                </h1>

                <p className="text-slate-400 max-w-lg mb-4 text-sm md:text-base relative z-10">
                    Search millions of packages via winget. Explore standard apps or enable SMART Search to find apps using natural language via AI.
                </p>

                <div className="w-full max-w-2xl relative z-10 group">
                    <div className={`absolute -inset-1 bg-gradient-to-r ${smartSearchEnabled ? 'from-primary/50 to-purple-500/50' : 'from-slate-500/20 to-slate-400/20'} rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500`} />
                    <div className="relative flex items-center bg-[#0A0A0E] border border-white/10 p-2 rounded-2xl shadow-xl">
                        <div className="pl-4 flex-1 flex items-center gap-3">
                            <Search className="w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder={smartSearchEnabled ? "E.g., An app that plays MKV videos..." : "Search packages by name or ID (e.g., VLC)"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                className="w-full bg-transparent border-none text-white focus:outline-none focus:ring-0 text-sm py-2"
                            />
                        </div>

                        <div className="flex items-center gap-3 pr-2 border-l border-white/10 pl-4 ml-2">
                            <div className="hidden sm:flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider">SMART APP SEARCH</span>
                                <button
                                    onClick={() => setSmartSearchEnabled(!smartSearchEnabled)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${smartSearchEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                >
                                    <span className="sr-only">Use AI Switch</span>
                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${smartSearchEnabled ? 'translate-x-2' : '-translate-x-2'}`} />
                                </button>
                            </div>

                            <button
                                onClick={handleSearchClick}
                                disabled={isSearching || !searchQuery.trim()}
                                className="bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results or Curated Categories Grid */}
            <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 pb-20">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="font-medium text-[15px]">Scanning package repositories...</p>
                    </div>
                ) : isErrorOrEmpty ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border border-red-500/20 bg-red-500/5 rounded-2xl mx-auto max-w-lg">
                        <MessageSquare className="w-8 h-8 text-red-500 mb-4" />
                        <h3 className="text-lg font-bold text-red-400 mb-2">{searchError ? "Search Failed" : "No results found"}</h3>
                        <p className="text-sm text-red-200/70">{searchError || "Try a different search term or check package ID spelling."}</p>
                    </div>
                ) : isShowingSearch ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {searchResults.map((app, idx) => {
                                const isInstalling = installingId === app.id;
                                const installResult = installResults[app.id];
                                const isInstalledLocally = installedApps[app.id] || installResult?.success;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        key={`${app.id}-${idx}`}
                                        className="group relative bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col gap-4 cursor-pointer"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            setSelectedAppId({ id: app.id, name: app.name });
                                        }}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-black/20 dark:bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-2">
                                                <AppIcon appId={app.id} appName={app.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors">{app.name}</h3>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{app.id}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-border text-slate-400">
                                                        v{app.version}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto border-t border-border/50 pt-4 flex items-center justify-between">
                                            <div className="flex-1">
                                                {installResult ? (
                                                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${installResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {installResult.success ? '✅ Installed' : '❌ Failed'}
                                                    </span>
                                                ) : isInstalledLocally ? (
                                                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                                        ✅ Installed
                                                    </span>
                                                ) : null}
                                            </div>
                                            <button
                                                onClick={() => handleInstall(app.id)}
                                                disabled={isInstalling || isInstalledLocally}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${(isInstalledLocally || isInstalling)
                                                    ? 'bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed'
                                                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 hover:border-primary'
                                                    }`}
                                            >
                                                {isInstalling ? <><Loader2 className="w-3 h-3 animate-spin" /> Installing</> : isInstalledLocally ? 'Installed' : 'Get'}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {AppMetadata.categories.map((category) => (
                            <div key={category.id} className="space-y-6">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                        {category.name}
                                    </h2>
                                    <p className="text-[15px] text-slate-400 font-medium mt-1">{category.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {category.apps.map((app) => {
                                        const isInstalling = installingId === app.id;
                                        const installResult = installResults[app.id];
                                        const isInstalledLocally = installedApps[app.id] || installResult?.success;

                                        return (
                                            <div
                                                key={app.id}
                                                className="group relative bg-[#0A0A0E] border border-border/50 rounded-[20px] p-6 hover:border-primary/40 hover:bg-surface hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col gap-4 cursor-pointer"
                                                onClick={(e) => {
                                                    if ((e.target as HTMLElement).closest('button')) return;
                                                    setSelectedAppId({ id: app.id, name: app.name });
                                                }}
                                            >
                                                <div className="flex gap-4">
                                                    <div className="w-16 h-16 rounded-[14px] bg-black/40 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-3">
                                                        <AppIcon appId={app.id} appName={app.name} className="w-full h-full object-contain filter group-hover:brightness-110 transition-all" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <h3 className="font-bold text-[16px] text-foreground truncate group-hover:text-primary transition-colors">{app.name}</h3>
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">{app.publisher}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed h-[36px] overflow-hidden">
                                                    {app.description}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                                                    <div className="flex-1">
                                                        {installResult ? (
                                                            <span className={`text-[11px] font-bold flex items-center gap-1.5 ${installResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {installResult.success ? '✅ Installed' : '❌ Failed'}
                                                            </span>
                                                        ) : isInstalledLocally ? (
                                                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                                                ✅ Installed
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <button
                                                        onClick={() => handleInstall(app.id)}
                                                        disabled={isInstalling || isInstalledLocally}
                                                        className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 ${(isInstalledLocally || isInstalling)
                                                            ? 'bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                                            : 'bg-white/5 text-foreground hover:bg-primary hover:text-white border border-white/10 hover:border-primary shadow-sm'
                                                            }`}
                                                    >
                                                        {isInstalling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing</> : isInstalledLocally ? 'Installed' : 'Get App'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
