import { useEffect, useState } from "react";
import { useGlobalCache } from "../hooks/useGlobalCache";
import { Cpu, Binary, HardDrive, Activity, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FUNNY_QUOTES = [
    "Reticulating splines...",
    "Downloading more RAM...",
    "Applying racing stripes to the CPU...",
    "Optimizing the optimizers...",
    "Bribing Windows Defender...",
    "Defragmenting the cloud...",
    "Overclocking the progress bar...",
    "Searching for the 'Any' key...",
    "Warming up the warp drive...",
    "Deleting System32...", // Just a joke
    "Blowing dust out of the registry...",
    "Negotiating with Microsoft...",
    "Syncing RGB lighting patterns...",
];

export function GlobalLoadingScreen() {
    const { loadingProgress, loadingMessage } = useGlobalCache();
    const [quote, setQuote] = useState(FUNNY_QUOTES[0]);

    useEffect(() => {
        // Cycle funny quotes every 2.5 seconds
        const interval = setInterval(() => {
            setQuote(FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
            {/* Background Animated Gradient / Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />

            {/* Floating Tech Icons Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <Cpu className="absolute top-[20%] left-[10%] w-12 h-12 text-blue-400 animate-pulse" style={{ animationDuration: '4s' }} />
                <Binary className="absolute top-[70%] left-[20%] w-16 h-16 text-green-400 animate-bounce" style={{ animationDuration: '6s' }} />
                <HardDrive className="absolute top-[30%] right-[15%] w-14 h-14 text-orange-400 animate-pulse" style={{ animationDuration: '5s' }} />
                <Activity className="absolute top-[60%] right-[25%] w-10 h-10 text-pink-400 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
                {/* Core Icon Pulse */}
                <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mb-10 relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl animate-pulse" />
                    <Sparkles className="w-12 h-12 text-primary relative z-10 animate-bounce" />
                </div>

                {/* Brand */}
                <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">
                    WinOpt <span className="text-primary font-mono text-xl opacity-80 border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-md ml-2 relative -top-1">PRO</span>
                </h1>

                {/* Progress Bar Container */}
                <div className="w-full max-w-sm mt-8 mb-4">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-purple-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, loadingProgress)}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm">
                        <span className="text-slate-400 font-medium font-mono">{loadingMessage}</span>
                        <span className="text-primary font-bold">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>

                {/* Funny Quotes Rotation */}
                <div className="h-8 mt-2 overflow-hidden flex items-center justify-center text-slate-500 text-sm italic w-full">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={quote}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                        >
                            {quote}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
