import { useMemo, useState } from "react";
import {
    Activity,
    CalendarClock,
    HardDrive,
    Loader2,
    Play,
    RefreshCw,
    Save,
    Search,
    Shield,
    Trash2,
} from "lucide-react";
import { AutomationFrequency, FeatureAutomationState, useFeatureAutomations } from "@/hooks/useFeatureAutomations";

const categoryIcons: Record<string, React.ElementType> = {
    Storage: HardDrive,
    Security: Shield,
    Network: Activity,
};

function AutomationCard({
    item,
    working,
    onSave,
    onRemove,
    onRun,
}: {
    item: FeatureAutomationState;
    working: boolean;
    onSave: (id: string, enabled: boolean, frequency: AutomationFrequency, time: string) => void;
    onRemove: (id: string) => void;
    onRun: (id: string) => void;
}) {
    const [enabled, setEnabled] = useState(item.config?.enabled ?? Boolean(item.task?.enabled));
    const [frequency, setFrequency] = useState<AutomationFrequency>(item.config?.frequency ?? item.preset.defaultFrequency);
    const [time, setTime] = useState(item.config?.time ?? "03:00");
    const Icon = categoryIcons[item.preset.category] ?? CalendarClock;

    return (
        <div className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/25">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-foreground">{item.preset.label}</h3>
                            <span className="rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
                                {item.preset.category}
                            </span>
                            {item.preset.requiresAdmin && (
                                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                                    Admin
                                </span>
                            )}
                        </div>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                            {item.preset.description}
                        </p>
                        {item.task && (
                            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                                {item.task.enabled ? "Enabled" : "Disabled"} · Last: {item.task.last_run} · Next: {item.task.next_run}
                            </p>
                        )}
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                    Enabled
                    <input
                        aria-label={`Enable ${item.preset.label}`}
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => setEnabled(event.target.checked)}
                        className="h-4 w-4 accent-primary"
                    />
                </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Frequency</span>
                    <select
                        value={frequency}
                        onChange={(event) => setFrequency(event.target.value as AutomationFrequency)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                    >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Time</span>
                    <input
                        type="time"
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                    />
                </label>
                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={() => onSave(item.preset.id, enabled, frequency, time)}
                        disabled={working}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => onRun(item.preset.id)}
                        disabled={working}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Play className="h-4 w-4" />
                        Run
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(item.preset.id)}
                        disabled={working || !item.config}
                        className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:border-red-500/30 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${item.preset.label}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AutomationPage() {
    const { automations, isLoading, workingIds, fetchAutomations, configureAutomation, deleteAutomation, runAutomationNow } = useFeatureAutomations();
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(automations.map((item) => item.preset.category))).sort()],
        [automations]
    );

    const filtered = useMemo(() => {
        const clean = query.trim().toLowerCase();
        return automations.filter((item) => {
            const matchesCategory = category === "All" || item.preset.category === category;
            const haystack = `${item.preset.label} ${item.preset.category} ${item.preset.description}`.toLowerCase();
            return matchesCategory && (!clean || haystack.includes(clean));
        });
    }, [automations, category, query]);

    return (
        <div className="flex min-h-full flex-col gap-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Task Scheduler
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Automation Center</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                        Schedule the WinOpt jobs that make sense to run repeatedly: updates, cleanup, security scans, inventories, health reports, and diagnostics.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchAutomations}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Available</div>
                    <div className="mt-2 text-2xl font-black text-foreground">{automations.length}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Configured</div>
                    <div className="mt-2 text-2xl font-black text-foreground">{automations.filter((item) => item.config).length}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Enabled</div>
                    <div className="mt-2 text-2xl font-black text-foreground">{automations.filter((item) => item.task?.enabled).length}</div>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter automations..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-slate-500 focus:border-primary/40"
                    />
                </div>
                <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                >
                    {categories.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-slate-500 dark:text-slate-300">
                    <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold">Loading automations...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map((item) => (
                        <AutomationCard
                            key={item.preset.id}
                            item={item}
                            working={Boolean(workingIds[item.preset.id])}
                            onSave={(id, enabled, frequency, time) => configureAutomation({ id, enabled, frequency, time })}
                            onRemove={deleteAutomation}
                            onRun={runAutomationNow}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
