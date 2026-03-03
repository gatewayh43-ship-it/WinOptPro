import { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft, Sparkles, Cpu, Activity, Wifi, Settings as SettingsIcon, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import tweaksData from '../data/tweaks.json';

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Performance': return <Cpu className="w-4 h-4 text-blue-400" />;
        case 'Privacy': return <ShieldAlert className="w-4 h-4 text-yellow-500" />;
        case 'Network': return <Wifi className="w-4 h-4 text-orange-400" />;
        case 'Power': return <Activity className="w-4 h-4 text-emerald-400" />;
        case 'Gaming': return <Sparkles className="w-4 h-4 text-purple-400" />;
        default: return <SettingsIcon className="w-4 h-4 text-slate-400" />;
    }
};

export function CommandPalette({ isOpen, onClose, onSelectTweak, simpleOnly = false }: { isOpen: boolean; onClose: () => void; onSelectTweak: (tweak: any) => void; simpleOnly?: boolean; }) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [filteredTweaks, setFilteredTweaks] = useState<typeof tweaksData>(tweaksData.slice(0, 8));
    const [workerState, setWorkerState] = useState<{ status: string, progress?: number, file?: string }>({ status: 'idle' });
    const workerRef = useRef<Worker | null>(null);

    // Initialize Semantic Search Worker when palette opens (skip if simpleOnly)
    useEffect(() => {
        if (!isOpen || simpleOnly) return;

        if (isOpen && !workerRef.current) {
            workerRef.current = new Worker(new URL('../lib/semanticWorker.ts', import.meta.url), { type: 'module' });

            workerRef.current.onmessage = (e) => {
                const data = e.data;
                if (data.status === 'progress') {
                    setWorkerState({ status: 'downloading', progress: data.progress.progress, file: data.progress.file });
                } else if (data.status === 'init_start') {
                    setWorkerState({ status: 'initializing' });
                } else if (data.status === 'init_ready') {
                    setWorkerState({ status: 'ready' });
                } else if (data.status === 'search_results') {
                    const topTweaks = data.results.slice(0, 8).map((res: any) =>
                        tweaksData.find(t => t.id === res.id)
                    ).filter(Boolean);
                    setFilteredTweaks(topTweaks);
                } else if (data.status === 'error') {
                    console.error("Semantic search worker error:", data.message);
                }
            };

            workerRef.current.postMessage({ type: 'INIT', payload: { tweaksData } });
        }
    }, [isOpen]);

    // Handle Search Queries
    useEffect(() => {
        if (!isOpen) return;

        if (searchQuery.trim() === '') {
            setFilteredTweaks(tweaksData.slice(0, 8));
            return;
        }

        if (!simpleOnly && workerState.status === 'ready' && workerRef.current) {
            const timer = setTimeout(() => {
                workerRef.current?.postMessage({ type: 'SEARCH', payload: { query: searchQuery } });
            }, 100); // slight debounce
            return () => clearTimeout(timer);
        } else {
            // Basic fallback while model is downloading, or if simpleOnly is enabled
            const lower = searchQuery.toLowerCase();
            const basicMatch = tweaksData.filter(t =>
                t.name.toLowerCase().includes(lower) ||
                t.description.toLowerCase().includes(lower) ||
                t.category.toLowerCase().includes(lower)
            ).slice(0, 8);
            setFilteredTweaks(basicMatch);
        }
    }, [searchQuery, isOpen, workerState.status, simpleOnly]);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredTweaks.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredTweaks[selectedIndex]) {
                    onSelectTweak(filteredTweaks[selectedIndex]);
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredTweaks, selectedIndex, onClose, onSelectTweak]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] md:pt-[20vh] pointer-events-none px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="w-full max-w-2xl bg-[#0A0A0E]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Input */}
                            <div className="flex items-center px-4 py-4 border-b border-white/5 relative">
                                <Search className="w-5 h-5 text-slate-400 mr-3" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search tweaks, optimizations, or settings..."
                                    className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-foreground placeholder-slate-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="flex items-center space-x-1.5 hidden sm:flex">
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded">ESC</span>
                                </div>
                            </div>

                            {/* AI Status Banner */}
                            {!simpleOnly && workerState.status === 'downloading' && (
                                <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center">
                                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin mr-2" />
                                    <span className="text-[11px] text-blue-400 font-medium">Downloading AI Search Model ({workerState.file})... {workerState.progress ? Math.round(workerState.progress) : 0}%</span>
                                </div>
                            )}
                            {!simpleOnly && workerState.status === 'initializing' && (
                                <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center">
                                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin mr-2" />
                                    <span className="text-[11px] text-blue-400 font-medium">Initializing AI Vector space...</span>
                                </div>
                            )}
                            {simpleOnly && (
                                <div className="px-4 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                                        <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Quick Search Mode</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded cursor-help" title="To use Semantic AI Search, use the search bar located at the top of the individual module pages.">AI Search Disabled</span>
                                </div>
                            )}

                            {/* Results */}
                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                                {filteredTweaks.length > 0 ? (
                                    <div className="space-y-1">
                                        {Object.entries(
                                            filteredTweaks.reduce((acc, tweak) => {
                                                if (!acc[tweak.category]) acc[tweak.category] = [];
                                                acc[tweak.category].push(tweak);
                                                return acc;
                                            }, {} as Record<string, typeof filteredTweaks>)
                                        ).map(([category, tweaks]) => (
                                            <div key={category}>
                                                <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    {getCategoryIcon(category)}
                                                    {category}
                                                </p>
                                                {tweaks.map(tweak => {
                                                    const i = filteredTweaks.indexOf(tweak);
                                                    return (
                                                        <button
                                                            key={tweak.id}
                                                            className={`w-full flex items-center px-3 py-3 rounded-xl outline-none transition-colors text-left group ${i === selectedIndex ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                                                            onMouseEnter={() => setSelectedIndex(i)}
                                                            onClick={() => {
                                                                onSelectTweak(tweak);
                                                                onClose();
                                                            }}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className={`text-sm font-bold truncate ${i === selectedIndex ? 'text-primary' : 'text-foreground'}`}>
                                                                    {tweak.name}
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                                                                    {tweak.description}
                                                                </p>
                                                            </div>
                                                            {i === selectedIndex && (
                                                                <div className="hidden sm:flex items-center text-primary ml-3 animate-in fade-in slide-in-from-right-2">
                                                                    <CornerDownLeft className="w-4 h-4 mr-1.5" />
                                                                    <span className="text-[11px] font-bold">Select</span>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center sm:py-12">
                                        <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                        <h3 className="text-sm font-bold text-slate-400">No optimizations found</h3>
                                        <p className="text-[11px] text-slate-500 mt-1">Try searching for "telemetry", "speed", or "gaming"</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center text-[10px] text-slate-500 font-medium font-mono">
                                        <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded mr-1.5 flex items-center">↑↓</span> Navigate
                                    </div>
                                    <div className="flex items-center text-[10px] text-slate-500 font-medium font-mono">
                                        <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded mr-1.5 flex items-center"><CornerDownLeft className="w-3 h-3" /></span> Execute
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">
                                    WinOpt Pro Command Interface
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
