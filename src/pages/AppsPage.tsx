import { useState, useEffect, useMemo } from "react";
import { useApps } from "../hooks/useApps";
import { Search, Package, CheckCircle2, Loader2 } from "lucide-react";
import appsData from "../data/apps.json";

interface App {
    id: string;
    name: string;
    description: string;
    category: string;
    wingetId: string;
    chocoId: string;
    website: string;
    tags: string[];
}

const ALL_APPS = appsData as App[];

export function AppsPage() {
    const { installingId, installResults, installedApps, chocoAvailable, checkChocoAvailable, installApp } = useApps();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    useEffect(() => {
        checkChocoAvailable();
    }, [checkChocoAvailable]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(ALL_APPS.map(a => a.category)));
        return ["All", ...cats];
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return ALL_APPS.filter(app => {
            const matchesCategory = activeCategory === "All" || app.category === activeCategory;
            const matchesSearch = !q ||
                app.name.toLowerCase().includes(q) ||
                app.description.toLowerCase().includes(q) ||
                app.tags.some(t => t.toLowerCase().includes(q));
            return matchesCategory && matchesSearch;
        });
    }, [search, activeCategory]);

    const handleInstall = async (app: App) => {
        await installApp(app.wingetId, app.chocoId, app.id);
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" />
                        Recommended Apps
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Curated selection of essential Windows software</p>
                </div>
                <div className="flex items-center gap-2">
                    {chocoAvailable === true && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Chocolatey
                        </span>
                    )}
                    {chocoAvailable === false && (
                        <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
                            Chocolatey not detected
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search apps or tags..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary/40 transition-colors"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeCategory === cat
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-black/5 dark:bg-white/5 border-border text-slate-400 hover:text-foreground"}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Package className="w-12 h-12 opacity-20 mb-3" />
                    <p className="font-medium">No apps match your search</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(app => {
                    const isInstalling = installingId === app.id;
                    const isInstalled = installedApps[app.id];
                    const result = installResults[app.id];
                    return (
                        <div key={app.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">{app.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{app.description}</p>
                            </div>
                            <div className="mt-auto">
                                <button
                                    onClick={() => handleInstall(app)}
                                    disabled={isInstalling || !!isInstalled}
                                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isInstalled
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                                        : isInstalling
                                            ? "bg-primary/10 text-primary border border-primary/20 cursor-wait"
                                            : "bg-primary text-white hover:bg-primary/90"}`}
                                >
                                    {isInstalling
                                        ? <span className="flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing...</span>
                                        : isInstalled ? "Installed" : "Install"}
                                </button>
                                {result?.success && (
                                    <p className="text-[11px] text-emerald-400 mt-2 text-center">Installed via {result.method}</p>
                                )}
                                {result && !result.success && result.error && (
                                    <p className="text-[11px] text-red-400 mt-2 text-center">{result.error}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
