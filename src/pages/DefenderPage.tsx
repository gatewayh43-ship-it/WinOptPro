import { Shield, ShieldAlert, ShieldCheck, Activity, RefreshCw, ScanSearch } from "lucide-react";
import { useDefender } from "../hooks/useDefender";

export function DefenderPage() {
    const { status, loading, actionLoading, runScan, updateSignatures, setRealtime } = useDefender();

    if (loading && !status) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    const isProtected = status?.realtimeProtectionEnabled && !status?.signatureOutOfDate;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border/40 bg-card/30 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-foreground tracking-tight flex items-center gap-3">
                        <Shield className="w-6 h-6 text-primary" />
                        Windows Defender
                    </h1>
                    <p className="text-[14px] text-slate-500 dark:text-slate-300 mt-1 font-medium">
                        Manage your antivirus protection, scans, and system security directly from here.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${isProtected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                        {isProtected ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                        <span className="text-sm font-semibold">{isProtected ? "System Protected" : "Action Needed"}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Status Section */}
                    <section>
                        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-4">Protection Status</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Real-time Protection */}
                            <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status?.realtimeProtectionEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-foreground">Real-Time Protection</h3>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={status?.realtimeProtectionEnabled || false}
                                                onChange={(e) => setRealtime(e.target.checked)}
                                                disabled={actionLoading}
                                            />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-80 peer-disabled:opacity-50"></div>
                                        </label>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Locates and stops malware from installing or running on your device.</p>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!status?.signatureOutOfDate ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"}`}>
                                        <RefreshCw className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Security Intelligence</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Signature Age: {status?.antivirusSignatureAge} days</p>
                                        {status?.signatureOutOfDate && <p className="text-xs text-amber-500 font-semibold mt-1">Updates are out of date!</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={updateSignatures}
                                    disabled={actionLoading}
                                    className="mt-4 w-full py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-border rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    Check for Updates
                                </button>
                            </div>

                        </div>
                    </section>

                    {/* Scanner Section */}
                    <section className="mt-8">
                        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-4">Virus & Threat Scans</h2>
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">

                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <ScanSearch className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Quick Scan</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-300">Checks folders in your system where threats are commonly found.</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-200 mt-1">Last run: {status?.quickScanAge === 4294967295 ? 'Never' : `${status?.quickScanAge} days ago`}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => runScan("Quick")}
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    Quick Scan
                                </button>
                            </div>

                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Full Scan</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-300">Checks all files and running programs on your hard disk. This could take longer.</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-200 mt-1">Last run: {status?.fullScanAge === 4294967295 ? 'Never' : `${status?.fullScanAge} days ago`}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => runScan("Full")}
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-border font-semibold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Full Scan
                                </button>
                            </div>

                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
