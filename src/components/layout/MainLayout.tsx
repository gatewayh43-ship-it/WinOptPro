import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";

export function MainLayout({
    currentView,
    setView,
    children
}: {
    currentView: string;
    setView: (v: string) => void;
    children: ReactNode;
}) {
    return (
        <div className="flex h-screen app-wrapper overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* AI-Generated Dynamic Mesh Background Layer */}
            <div className="nano-mesh-bg pointer-events-none"></div>

            <Sidebar currentView={currentView} setView={setView} />

            <main className="flex-1 flex flex-col relative h-full">
                {/* Subtle top ambient light */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent z-20"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10 relative z-10 w-full">
                    <div className="max-w-6xl mx-auto h-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentView}
                                initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
