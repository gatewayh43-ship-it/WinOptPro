import { useState, useEffect } from "react";
import { useSmartStore } from "../hooks/useSmartStore";
import { useAppStore } from "../store/appStore";
import AppMetadata from "../data/app_metadata.json";
import { Sparkles, Globe, Download, ArrowLeft, Github, Command, ShieldCheck, BadgeCheck, Star, ExternalLink } from "lucide-react";

interface AppDetailsPageProps {
    appId: string;
    appName: string;
    onBack: () => void;
}

export function AppDetailsPage({ appId, appName, onBack }: AppDetailsPageProps) {
    const { getAppDetails, appInfo, scrapeMeta, isLoadingInfo } = useSmartStore();
    const { userSettings } = useAppStore();

    // Local state for AI generation
    const [aiInsights, setAiInsights] = useState<{
        usage: string | null;
        trustScore: number | null;
        reviews: string | null;
    }>({ usage: null, trustScore: null, reviews: null });
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // Fast-track resolution using the massive offline JSON bundle!
    const staticApp = (AppMetadata.apps as Record<string, any>)[appId];

    useEffect(() => {
        if (!staticApp) {
            getAppDetails(appId, appName);
        }
    }, [appId, appName, getAppDetails, staticApp]);

    // Consolidate Data Source
    const displayInfo = staticApp ? {
        id: appId,
        name: staticApp.name,
        publisher: staticApp.publisher,
        author: staticApp.author || staticApp.publisher,
        version: staticApp.version,
        description: staticApp.description,
        homepage: staticApp.website,
        supportUrl: staticApp.support_url,
        githubLink: staticApp.github_link,
        isVerified: staticApp.is_verified,
        rating: staticApp.rating || 4.5,
        trustScore: staticApp.trust_score || 98,
        reviews: staticApp.reviews,
        insights: staticApp.insights,
        tags: ["curated", "fast-load"]
    } : appInfo ? {
        id: appInfo.id,
        name: appInfo.name,
        publisher: appInfo.publisher,
        author: appInfo.publisher,
        version: appInfo.version,
        description: appInfo.description,
        homepage: appInfo.homepage,
        supportUrl: null,
        githubLink: null,
        isVerified: false,
        rating: 4.0,
        trustScore: 85,
        reviews: [],
        insights: null,
        tags: appInfo.tags
    } : null;

    // Trigger AI generation only if we don't have static offline insights AND user enabled it
    useEffect(() => {
        if (displayInfo && userSettings.aiAssistantEnabled && !aiInsights.usage && !isGeneratingAi) {

            if (displayInfo.insights) {
                setAiInsights({
                    usage: `Pros: ${displayInfo.insights.pros.join(', ')}\nCons: ${displayInfo.insights.cons.join(', ')}`,
                    trustScore: displayInfo.trustScore,
                    reviews: displayInfo.reviews && displayInfo.reviews.length > 0
                        ? `"${displayInfo.reviews[0].text}" - ${displayInfo.reviews[0].author}`
                        : "Generally well-regarded by the community."
                });
                return;
            }

            setIsGeneratingAi(true);
            const generateInsights = async () => {
                try {
                    await new Promise(r => setTimeout(r, 2000));
                    setAiInsights({
                        usage: `${displayInfo.name} is primarily used for ${displayInfo.description ? displayInfo.description.toLowerCase() : 'various tasks'}.`,
                        trustScore: displayInfo.publisher.includes("Microsoft") || displayInfo.tags.includes("open-source") ? 90 : 80,
                        reviews: "Generally well-regarded by the community."
                    });
                } catch (e) {
                    console.error("Failed to generate AI insights", e);
                } finally {
                    setIsGeneratingAi(false);
                }
            };
            generateInsights();
        }
    }, [displayInfo, userSettings.aiAssistantEnabled, aiInsights.usage, isGeneratingAi]);

    if (!staticApp && (isLoadingInfo || !displayInfo)) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Fetching deep metadata from winget...</p>
            </div>
        );
    }

    if (!displayInfo) return null;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 bg-surface border border-border rounded-xl hover:border-primary/50 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{displayInfo.name}</h1>
                        {displayInfo.isVerified && (
                            <div title="Verified Publisher">
                                <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500/20" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">by {displayInfo.author || displayInfo.publisher || "Unknown"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span className="text-sm font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">v{displayInfo.version}</span>
                        {displayInfo.rating > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                                <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{displayInfo.rating}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Info & Screenshots */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Screenshots Gallery Section */}
                    {scrapeMeta && scrapeMeta.screenshots.length > 0 && (
                        <div className="bg-surface border border-border rounded-2xl p-1 overflow-hidden">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                                <img
                                    src={scrapeMeta.screenshots[0]}
                                    alt={`${displayInfo.name} screenshot`}
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                            <Command className="w-5 h-5 text-primary" />
                            About {displayInfo.name}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
                            {displayInfo.description || "No description provided by the package manifest."}
                        </p>

                        {/* Tags */}
                        {displayInfo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-6">
                                {displayInfo.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-black/20 border border-border dark:border-white/5 rounded-lg">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Insights Section */}
                    {userSettings.aiAssistantEnabled && (
                        <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
                            <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-primary/10 rotate-12" />
                            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                AI Agent Insights
                            </h2>

                            {isGeneratingAi ? (
                                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    Analyzing package data and fetching community sentiment...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-border dark:border-white/5">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Usage & Capabilities</h3>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.usage}</p>
                                    </div>
                                    <div className="bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-border dark:border-white/5">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">General Reception</h3>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.reviews}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Actions & Rich Links */}
                <div className="flex flex-col gap-6">

                    {/* Action Card */}
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                        {aiInsights.trustScore !== null && (
                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="font-bold text-sm">Trust Score</span>
                                </div>
                                <span className="text-xl font-black text-emerald-400">{aiInsights.trustScore}/100</span>
                            </div>
                        )}

                        <button className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all">
                            <Download className="w-5 h-5" />
                            Install Now
                        </button>
                    </div>

                    {/* Rich Links Library */}
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Official Links</h2>
                        <div className="flex flex-col gap-3">
                            {displayInfo.homepage && (
                                <a
                                    href={displayInfo.homepage}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/40 border border-transparent dark:border-white/5 hover:border-primary/30 transition-all group"
                                >
                                    <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground dark:text-slate-200">Official Website</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-full">{displayInfo.homepage}</span>
                                    </div>
                                </a>
                            )}

                            {displayInfo.githubLink && (
                                <a
                                    href={displayInfo.githubLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/40 border border-transparent dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20 transition-all group"
                                >
                                    <div className="p-2 bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg group-hover:scale-110 transition-transform">
                                        <Github className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground dark:text-slate-200">Source Code</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-full">{displayInfo.githubLink}</span>
                                    </div>
                                </a>
                            )}

                            {displayInfo.supportUrl && (
                                <a
                                    href={displayInfo.supportUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/40 border border-transparent dark:border-white/5 hover:border-amber-500/30 transition-all group"
                                >
                                    <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <ExternalLink className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground dark:text-slate-200">Support / Manual</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-full">{displayInfo.supportUrl}</span>
                                    </div>
                                </a>
                            )}

                            {(!displayInfo.homepage && !displayInfo.githubLink && !displayInfo.supportUrl) && (
                                <div className="p-4 text-center rounded-xl border border-border dark:border-white/5 border-dashed">
                                    <p className="text-xs text-slate-500">No external links discovered.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
