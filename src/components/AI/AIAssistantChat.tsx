import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, ChevronDown, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import tweaksData from '../../data/tweaks.json';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    suggestedTweaks?: string[];
}

export function AIAssistantChat() {
    const { userSettings, toggleSelectedTweak } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I am the WinOpt Pro AI Agent. Tell me what you want to optimize (e.g., "Make my internet faster" or "Best settings for Valorant") and I will recommend specific tweaks to apply.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    if (!userSettings.aiAssistantEnabled) return null;

    const parseTweaksFromResponse = (response: string): { text: string, ids: string[] } => {
        // Look for JSON array in the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        let ids: string[] = [];
        let cleanText = response;

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    // map out just the string IDs or {id: string} objects
                    ids = parsed.map((item: any) => typeof item === 'string' ? item : item.id).filter(Boolean);
                    cleanText = response.replace(jsonMatch[0], '').trim();
                }
            } catch (e) {
                // Not valid JSON, ignore
            }
        }
        return { text: cleanText, ids };
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // Simplified prompt engineering for Qwen 2.5 JSON output
            const tweakSchema = tweaksData.map((t: any) => ({ id: t.id, name: t.name, desc: t.description }));

            const systemPrompt = `You are a helpful AI PC optimizer assistant integrated into WinOpt. 
The user will ask you for help. Answer briefly and concisely.
If you know which system tweaks would help them, append a raw JSON array of tweak IDs at the end of your message. 
Available tweaks:
${JSON.stringify(tweakSchema)}

Example Response:
To improve your gaming latency, I recommend disabling Nagle's algorithm and network throttling.
["Disable Nagle's Algorithm", "Disable Network Throttling"]`;

            const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('http://127.0.0.1:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:1.5b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...chatHistory,
                        { role: 'user', content: userMsg }
                    ],
                    stream: false
                })
            });

            if (!response.ok) throw new Error("Failed to connect to AI backend.");

            const data = await response.json();
            const { text, ids } = parseTweaksFromResponse(data.message.content);

            setMessages(prev => [...prev, { role: 'assistant', content: text, suggestedTweaks: ids }]);

        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: Could not connect to the local AI daemon. Make sure it has finished downloading and initializing. (${error.message})` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating FAB */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 z-40 transition-opacity ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <Sparkles className="w-6 h-6" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-[#0A0A0E] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Pro AI Assistant</h3>
                                    <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Qwen 2.5 (1.5B) Local
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 dark:text-slate-200 hover:text-white">
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white/5 text-slate-200 rounded-bl-sm border border-white/5'}`}>
                                        {msg.content}
                                    </div>

                                    {/* Suggested Tweaks UI */}
                                    {msg.suggestedTweaks && msg.suggestedTweaks.length > 0 && (
                                        <div className="mt-2 w-[85%] space-y-1.5">
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider ml-1">Suggested Actions</p>
                                            {msg.suggestedTweaks.map(id => {
                                                const tweak = tweaksData.find((t: any) => t.id === id);
                                                if (!tweak) return null;
                                                return (
                                                    <div key={id} className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-2.5 rounded-xl">
                                                        <div className="min-w-0 pr-2">
                                                            <p className="text-[12px] font-bold text-white truncate">{tweak.name}</p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-200 truncate mt-0.5">{tweak.category}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleSelectedTweak(tweak.id)}
                                                            className="shrink-0 px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-[11px] font-bold rounded-lg transition-colors"
                                                        >
                                                            Select
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300 text-[12px] font-medium px-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI is thinking...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white/5 border-t border-white/5">
                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5 focus-within:border-primary/50 transition-colors">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask for optimization advice..."
                                    className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-[13px] text-white placeholder-slate-500"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="p-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
