import { useState, useEffect } from "react";
import { useApps } from "../hooks/useApps";
import { useSmartStore } from "../hooks/useSmartStore";
import { AppDetailsPage } from "./AppDetailsPage";
import AppMetadata from "../data/app_metadata.json";
import { Search, Sparkles, MessageSquare, ArrowRight, Loader2, LayoutGrid, List, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function AppIcon({ logoUrl, appName, className = "" }: { logoUrl: string; appName: string; className?: string }) {
    const [imgSrc, setImgSrc] = useState(logoUrl);

    useEffect(() => {
        setImgSrc(logoUrl);
    }, [logoUrl]);

    return (
        <img
            src={imgSrc}
            alt={appName}
            className={className}
            onError={() => {
                if (!imgSrc.includes("ui-avatars")) {
                    setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(appName)}&background=random&color=fff&rounded=true&bold=true&size=128`);
                }
            }}
        />
    );
}

export function AppsPage() {
    const { installingId, installResults, installedApps, checkChocoAvailable, installApp } = useApps();
    const { isSearching, searchResults, searchError, searchApps } = useSmartStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<{ id: string; name: string } | null>(null);
    const [viewMode, setViewMode] = useState<"carousel" | "list">("carousel");

    const scrollCarousel = (id: string, direction: "left" | "right") => {
        const el = document.getElementById(`carousel-${id}`);
        if (el) {
            el.scrollBy({ left: direction === "left" ? -350 : 350, behavior: "smooth" });
        }
    };

    useEffect(() => {
        checkChocoAvailable();
    }, [checkChocoAvailable]);

    const handleSearchClick = () => {
        if (!searchQuery.trim()) return;
        searchApps(searchQuery, smartSearchEnabled);
    };

    const handleInstall = async (appId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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

                <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-4 text-sm md:text-base relative z-10">
                    Search millions of packages via winget. Explore standard apps or enable SMART Search to find apps using natural language.
                </p>

                <div className="w-full max-w-2xl relative z-10 group">
                    <div className={`absolute -inset-1 bg-gradient-to-r ${smartSearchEnabled ? "from-primary/50 to-purple-500/50" : "from-slate-500/20 to-slate-400/20"} rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500`} />
                    <div className="relative flex items-center bg-surface border border-white/10 p-2 rounded-2xl shadow-xl">
                        <div className="pl-4 flex-1 flex items-center gap-3">
                            <Search className="w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder={smartSearchEnabled ? "E.g., An app that plays MKV videos..." : "Search packages by name or ID (e.g., VLC)"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                                className="w-full bg-transparent border-none text-foreground placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 text-sm py-2"
                            />
                        </div>

                        <div className="flex items-center gap-3 pr-2 border-l border-white/10 pl-4 ml-2">
                            <div className="hidden sm:flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider">SMART SEARCH</span>
                                <button
                                    onClick={() => setSmartSearchEnabled(!smartSearchEnabled)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${smartSearchEnabled ? "bg-primary" : "bg-slate-700"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${smartSearchEnabled ? "translate-x-2" : "-translate-x-2"}`} />
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

            {/* View Toggle */}
            {!isShowingSearch && !isErrorOrEmpty && !isSearching && (
                <div className="flex items-center justify-end px-6 max-w-[1300px] mx-auto w-full -mb-2 z-10">
                    <div className="flex items-center bg-black/5 dark:bg-white/5 border border-border p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("carousel")}
                            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === "carousel" ? "bg-surface shadow-sm border border-border/50 text-foreground" : "text-slate-500 hover:text-slate-400"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="text-xs font-bold">Carousel</span>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-surface shadow-sm border border-border/50 text-foreground" : "text-slate-500 hover:text-slate-400"}`}
                        >
                            <List className="w-4 h-4" />
                            <span className="text-xs font-bold">List</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Results or Curated Categories Grid */}
            <div className="flex-1 w-full max-w-[1300px] mx-auto pb-20">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 max-w-[1300px] mx-auto">
                        <AnimatePresence>
                            {searchResults.map((app, idx) => {
                                const isInstalling = installingId === app.id;
                                const installResult = installResults[app.id];
                                const isInstalledLocally = installedApps[app.id] || installResult?.success;
                                const domainPart = app.id.split(".")[0]?.toLowerCase() || "unknown";
                                const logoSrc = `https://logo.clearbit.com/${domainPart}.com`;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        key={`${app.id}-${idx}`}
                                        className="group relative bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col gap-4 cursor-pointer"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest("button")) return;
                                            setSelectedAppId({ id: app.id, name: app.name });
                                        }}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-[12px] bg-black/5 dark:bg-white/5 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-2">
                                                <AppIcon logoUrl={logoSrc} appName={app.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors">{app.name}</h3>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{app.id}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-border text-slate-500 dark:text-slate-400">v{app.version}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto border-t border-border/50 pt-4 flex items-center justify-between">
                                            <div className="flex-1">
                                                {installResult ? (
                                                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${installResult.success ? "text-emerald-500" : "text-red-500"}`}>
                                                        {installResult.success ? "✅ Installed" : "❌ Failed"}
                                                    </span>
                                                ) : isInstalledLocally ? (
                                                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5">✅ Installed</span>
                                                ) : null}
                                            </div>
                                            <button
                                                onClick={(e) => handleInstall(app.id, e)}
                                                disabled={isInstalling || isInstalledLocally}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isInstalledLocally || isInstalling
                                                    ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border border-border/50"
                                                    : "bg-primary text-white hover:opacity-90 shadow-sm border border-black/10 shadow-primary/20"
                                                    }`}
                                            >
                                                {isInstalling ? <><Loader2 className="w-3 h-3 animate-spin" /> Installing</> : isInstalledLocally ? "Installed" : "Get"}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-12 pb-12">
                        {AppMetadata.categories.map((category) => (
                            <div key={category.id} className="space-y-4">
                                <div className="flex items-end justify-between px-6">
                                    <div className="flex flex-col">
                                        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                                            {category.name}
                                        </h2>
                                        <p className="text-[14px] text-slate-500 mt-1">{category.description}</p>
                                    </div>
                                    {viewMode === "carousel" && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => scrollCarousel(category.id, "left")}
                                                className="p-1.5 rounded-full bg-surface border border-border text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => scrollCarousel(category.id, "right")}
                                                className="p-1.5 rounded-full bg-surface border border-border text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {viewMode === "carousel" ? (
                                    <div
                                        id={`carousel-${category.id}`}
                                        className="flex overflow-x-auto gap-4 px-6 pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth"
                                        onWheel={(e) => {
                                            const container = e.currentTarget;
                                            if (e.deltaY !== 0 && !e.shiftKey) {
                                                container.scrollLeft += e.deltaY;
                                            }
                                        }}
                                    >
                                        {category.apps.map((app) => {
                                            const isInstalling = installingId === app.id;
                                            const installResult = installResults[app.id];
                                            const isInstalledLocally = installedApps[app.id] || installResult?.success;

                                            return (
                                                <div
                                                    key={app.id}
                                                    className="w-[300px] shrink-0 snap-start group relative bg-surface border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col gap-4 cursor-pointer"
                                                    onClick={(e) => {
                                                        if ((e.target as HTMLElement).closest("button")) return;
                                                        setSelectedAppId({ id: app.id, name: app.name });
                                                    }}
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="w-14 h-14 rounded-[12px] bg-black/5 dark:bg-white/5 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-2.5">
                                                            <AppIcon logoUrl={app.logo} appName={app.name} className="w-full h-full object-contain filter group-hover:brightness-110 transition-all" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-1">
                                                            <h3 className="font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                                {app.name}
                                                                {app.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                                            </h3>
                                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{app.publisher}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mt-1 flex-1">
                                                        {app.description}
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
                                                        <div className="flex-1">
                                                            {installResult ? (
                                                                <span className={`text-[10px] font-bold flex items-center gap-1 ${installResult.success ? "text-emerald-500" : "text-red-500"}`}>
                                                                    {installResult.success ? "✅ Installed" : "❌ Failed"}
                                                                </span>
                                                            ) : isInstalledLocally ? (
                                                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">✅ Installed</span>
                                                            ) : null}
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleInstall(app.id, e)}
                                                            disabled={isInstalling || isInstalledLocally}
                                                            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all flex items-center gap-2 ${isInstalledLocally || isInstalling
                                                                ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border border-border/50"
                                                                : "bg-primary text-white hover:opacity-90 shadow-sm border border-black/10 shadow-primary/20"
                                                                }`}
                                                        >
                                                            {isInstalling ? <><Loader2 className="w-3 h-3 animate-spin" /> Installing</> : isInstalledLocally ? "Installed" : "Get"}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="w-[1px] shrink-0" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-6">
                                        {category.apps.map((app) => {
                                            const isInstalling = installingId === app.id;
                                            const installResult = installResults[app.id];
                                            const isInstalledLocally = installedApps[app.id] || installResult?.success;

                                            return (
                                                <div
                                                    key={app.id}
                                                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border hover:border-primary/40 hover:shadow-md cursor-pointer transition-all"
                                                    onClick={(e) => {
                                                        if ((e.target as HTMLElement).closest("button")) return;
                                                        setSelectedAppId({ id: app.id, name: app.name });
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 border border-border/50 flex items-center justify-center shrink-0 p-1.5">
                                                            <AppIcon logoUrl={app.logo} appName={app.name} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-bold text-[13px] text-foreground truncate group-hover:text-primary transition-colors">{app.name}</h3>
                                                                {app.is_verified && <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" />}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[200px] hidden sm:block">
                                                                by {app.publisher}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                                                        <div className="w-24 text-right pr-2">
                                                            {installResult ? (
                                                                <span className={`text-[11px] font-bold ${installResult.success ? "text-emerald-500" : "text-red-500"}`}>
                                                                    {installResult.success ? "Installed" : "Failed"}
                                                                </span>
                                                            ) : isInstalledLocally ? (
                                                                <span className="text-[11px] font-bold text-emerald-500">Installed</span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-600 font-medium truncate inline-block w-full">v{app.version}</span>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={(e) => handleInstall(app.id, e)}
                                                            disabled={isInstalling || isInstalledLocally}
                                                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-[70px] ${isInstalledLocally || isInstalling
                                                                ? "bg-black/5 dark:bg-white/5 text-slate-500 cursor-not-allowed border border-border/50"
                                                                : "bg-primary text-white hover:opacity-90 shadow-sm border border-black/10 shadow-primary/20"
                                                                }`}
                                                        >
                                                            {isInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : isInstalledLocally ? "Installed" : "Get"}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}
