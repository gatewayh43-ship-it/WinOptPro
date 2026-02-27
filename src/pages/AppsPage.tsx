import { useState, useEffect, useMemo } from "react";
import { useApps } from "../hooks/useApps";
import appsData from "../data/apps.json";

interface AppEntry {
    id: string;
    name: string;
    description: string;
    category: string;
    wingetId: string;
    chocoId: string;
    website: string;
    tags: string[];
}

export function AppsPage() {
    const apps = appsData as AppEntry[];
    const {
        installingId,
        installResults,
        installedApps,
        chocoAvailable,
        checkChocoAvailable,
        installApp,
    } = useApps();

    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Check Chocolatey availability on mount
    useEffect(() => {
        checkChocoAvailable();
    }, [checkChocoAvailable]);

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = Array.from(new Set(apps.map((a) => a.category)));
        return ["All", ...cats.sort()];
    }, [apps]);

    // Filter apps
    const filteredApps = useMemo(() => {
        return apps.filter((app) => {
            const matchCategory =
                activeCategory === "All" || app.category === activeCategory;
            const query = searchQuery.toLowerCase();
            const matchSearch =
                !query ||
                app.name.toLowerCase().includes(query) ||
                app.description.toLowerCase().includes(query) ||
                app.tags.some((t) => t.includes(query));
            return matchCategory && matchSearch;
        });
    }, [apps, activeCategory, searchQuery]);

    // Group filtered apps by category
    const grouped = useMemo(() => {
        const groups: Record<string, AppEntry[]> = {};
        for (const app of filteredApps) {
            if (!groups[app.category]) groups[app.category] = [];
            groups[app.category].push(app);
        }
        return groups;
    }, [filteredApps]);

    const handleInstall = async (app: AppEntry) => {
        await installApp(app.wingetId, app.chocoId, app.id);
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg
                            className="w-5 h-5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                        </svg>
                    </div>
                    Recommended Apps
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Curated essential software for a clean Windows setup. Install via{" "}
                    <span className="font-semibold text-blue-400">winget</span>
                    {chocoAvailable ? (
                        <>
                            {" "}
                            or{" "}
                            <span className="font-semibold text-amber-400">
                                Chocolatey
                            </span>{" "}
                            (fallback)
                        </>
                    ) : (
                        <span className="text-slate-600 ml-1">
                            · Chocolatey not detected
                        </span>
                    )}
                </p>
            </div>

            {/* Search + Category Tabs */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search apps or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${activeCategory === cat
                                ? "bg-primary/20 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                : "bg-surface border-border text-slate-500 hover:text-foreground hover:border-primary/20"
                                }`}
                        >
                            {cat}
                            {cat !== "All" && (
                                <span className="ml-1 opacity-60">
                                    (
                                    {
                                        apps.filter(
                                            (a) => a.category === cat
                                        ).length
                                    }
                                    )
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* App Grid */}
            {Object.entries(grouped).map(([category, categoryApps]) => (
                <div key={category} className="flex flex-col gap-3">
                    {activeCategory === "All" && (
                        <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-2 mt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {category}
                            <span className="text-xs font-normal text-slate-600">
                                ({categoryApps.length})
                            </span>
                        </h2>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {categoryApps.map((app) => {
                            const isInstalling = installingId === app.id;
                            const isInstalled = installedApps[app.id];
                            const result = installResults[app.id];

                            return (
                                <div
                                    key={app.id}
                                    className={`group relative flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 ${isInstalled
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-surface border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                                        }`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm text-foreground truncate">
                                                    {app.name}
                                                </h3>
                                                {isInstalled && (
                                                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">
                                                        INSTALLED
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                {app.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1">
                                        {app.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500 bg-slate-500/10 border border-slate-500/20 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Error/success message */}
                                    {result && !result.success && result.error && (
                                        <p className="text-[10px] text-red-400 bg-red-500/10 rounded-md px-2 py-1 border border-red-500/20">
                                            {result.error.length > 120
                                                ? result.error.slice(0, 120) +
                                                "..."
                                                : result.error}
                                        </p>
                                    )}
                                    {result && result.success && (
                                        <p className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1 border border-emerald-500/20">
                                            ✓ Installed via{" "}
                                            <span className="font-bold">
                                                {result.method}
                                            </span>
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-auto pt-1">
                                        <button
                                            onClick={() => handleInstall(app)}
                                            disabled={isInstalling || isInstalled}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isInstalled
                                                ? "bg-emerald-500/10 text-emerald-500 cursor-default border border-emerald-500/20"
                                                : isInstalling
                                                    ? "bg-primary/10 text-primary border border-primary/20 cursor-wait"
                                                    : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 hover:shadow-sm hover:shadow-primary/10"
                                                }`}
                                        >
                                            {isInstalling ? (
                                                <>
                                                    <svg
                                                        className="w-3.5 h-3.5 animate-spin"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                    >
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="3"
                                                            strokeDasharray="32"
                                                            strokeDashoffset="12"
                                                        />
                                                    </svg>
                                                    Installing...
                                                </>
                                            ) : isInstalled ? (
                                                <>
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2.5}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                    Installed
                                                </>
                                            ) : (
                                                <>
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                        />
                                                    </svg>
                                                    Install
                                                </>
                                            )}
                                        </button>
                                        <a
                                            href={app.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg border border-border hover:border-primary/30 text-slate-500 hover:text-primary transition-all"
                                            title="Visit website"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                                                />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {filteredApps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-4">
                        <svg
                            className="w-6 h-6 text-slate-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        No apps match your search.
                    </p>
                </div>
            )}
        </div>
    );
}
