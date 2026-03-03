import { useState, useEffect } from "react";
import { useSmartStore } from "../hooks/useSmartStore";
import { useAppStore } from "../store/appStore";
import AppMetadata from "../data/app_metadata.json";
import { Sparkles, Globe, Download, MessageSquare, ArrowLeft, Github, Command, Twitter, ShieldCheck } from "lucide-react";

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

    useEffect(() => {
        getAppDetails(appId, appName);
    }, [appId, appName, getAppDetails]);

    // Trigger AI generation once we have app info
    useEffect(() => {
        if (appInfo && userSettings.aiAssistantEnabled && !aiInsights.usage && !isGeneratingAi) {

            // Check offline bundle
            const staticData = (AppMetadata as Record<string, any>)[appInfo.id];
            if (staticData && staticData.insights) {
                setAiInsights({
                    usage: `Pros: ${staticData.insights.pros.join(', ')}\nCons: ${staticData.insights.cons.join(', ')}`,
                    trustScore: staticData.trust_score || 95,
                    reviews: staticData.reviews && staticData.reviews.length > 0
                        ? `"${staticData.reviews[0].text}" - ${staticData.reviews[0].author}`
                        : "Generally well-regarded by the community."
                });
                return;
            }

            setIsGeneratingAi(true);

            // Simulate calling the local LLM for insights based on the app info
            const generateInsights = async () => {
                try {
                    // In a real implementation this would call Ollama via fetch('http://127.0.0.1:11434/api/generate'...)
                    // Simulating delay and response for the UI prototype
                    await new Promise(r => setTimeout(r, 2000));

                    setAiInsights({
                        usage: `${appInfo.name} is primarily used for ${appInfo.description ? appInfo.description.toLowerCase() : 'various tasks'}. It's a standard tool in its category, suitable for both casual and power users.`,
                        trustScore: appInfo.publisher.includes("Microsoft") || appInfo.tags.includes("open-source") ? 95 : 85,
                        reviews: "Generally well-regarded by the community. Users praise its features but note occasional resource usage."
                    });
                } catch (e) {
                    console.error("Failed to generate AI insights", e);
                } finally {
                    setIsGeneratingAi(false);
                }
            };

            generateInsights();
        }
    }, [appInfo, userSettings.aiAssistantEnabled, aiInsights.usage, isGeneratingAi]);

    if (isLoadingInfo || !appInfo) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Fetching deep metadata from winget...</p>
            </div>
        );
    }

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
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{appInfo.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-medium text-slate-400">by {appInfo.publisher || "Unknown"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="text-sm font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">v{appInfo.version}</span>
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
                                    alt={`${appInfo.name} screenshot`}
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
                            About {appInfo.name}
                        </h2>
                        <p className="text-slate-300 leading-relaxed text-[15px]">
                            {appInfo.description || "No description provided by the package manifest."}
                        </p>

                        {/* Tags */}
                        {appInfo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-6">
                                {appInfo.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 text-xs font-medium text-slate-400 bg-black/20 border border-white/5 rounded-lg">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Insights Section */}
                    {userSettings.aiAssistantEnabled && (
                        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
                            <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-primary/10 rotate-12" />
                            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                AI Agent Insights
                            </h2>

                            {isGeneratingAi ? (
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    Analyzing package data and fetching community sentiment...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Usage & Capabilities</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed">{aiInsights.usage}</p>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">General Reception</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed">{aiInsights.reviews}</p>
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
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Official Links</h2>
                        <div className="flex flex-col gap-3">
                            {appInfo.homepage && (
                                <a
                                    href={appInfo.homepage}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-primary/30 transition-all group"
                                >
                                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-200">Official Website</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{appInfo.homepage}</span>
                                    </div>
                                </a>
                            )}

                            {scrapeMeta?.githubUrl && (
                                <a
                                    href={scrapeMeta.githubUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/20 transition-all group"
                                >
                                    <div className="p-2 bg-slate-700/50 text-slate-300 rounded-lg group-hover:scale-110 transition-transform">
                                        <Github className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-200">Source Code</span>
                                        <span className="text-[10px] text-slate-500">GitHub Repository</span>
                                    </div>
                                </a>
                            )}

                            {scrapeMeta?.socialLinks.map((link, i) => (
                                <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 hover:border-sky-500/30 transition-all group"
                                >
                                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg group-hover:scale-110 transition-transform">
                                        {link.includes('twitter.com') || link.includes('x.com') ? <Twitter className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-200">Community</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{link}</span>
                                    </div>
                                </a>
                            ))}

                            {(!appInfo.homepage && !scrapeMeta?.githubUrl && (!scrapeMeta || scrapeMeta.socialLinks.length === 0)) && (
                                <div className="p-4 text-center rounded-xl border border-white/5 border-dashed">
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
