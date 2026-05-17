import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    FlaskConical,
    Loader2,
    PackageCheck,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    XCircle,
} from "lucide-react";
import { useToast } from "@/components/ToastSystem";
import { useSoftwareUpdates } from "@/hooks/useSoftwareUpdates";
import type {
    ReleaseChannel,
    SoftwareUpdateItem,
    UpdateAutomationFrequency,
    UpdateAutomationScope,
} from "@/hooks/useSoftwareUpdates";

function ChannelToggle({
    item,
    value,
    onChange,
}: {
    item: SoftwareUpdateItem;
    value: ReleaseChannel;
    onChange: (channel: ReleaseChannel) => void;
}) {
    const hasBeta = Boolean(item.betaPackageId);

    return (
        <div className="inline-flex items-center rounded-lg border border-border bg-black/5 dark:bg-white/5 p-1">
            <button
                type="button"
                onClick={() => onChange("stable")}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors ${value === "stable"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-slate-500 dark:text-slate-300 hover:text-foreground"
                    }`}
            >
                <ShieldCheck className="h-3.5 w-3.5" />
                Stable
            </button>
            <button
                type="button"
                onClick={() => hasBeta && onChange("beta")}
                disabled={!hasBeta}
                title={hasBeta ? `Beta package: ${item.betaPackageId}` : "No known beta package ID for this app"}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors ${value === "beta"
                    ? "bg-amber-500/15 text-amber-500"
                    : "text-slate-500 dark:text-slate-300 hover:text-foreground"
                    } ${!hasBeta ? "cursor-not-allowed opacity-45" : ""}`}
            >
                <FlaskConical className="h-3.5 w-3.5" />
                Beta
            </button>
        </div>
    );
}

export function SoftwareUpdatesPage() {
    const { addToast } = useToast();
    const {
        updates,
        isScanning,
        scanError,
        updatingIds,
        updateResults,
        automation,
        isLoadingAutomation,
        isSavingAutomation,
        scanUpdates,
        updatePackage,
        loadAutomation,
        saveAutomation,
        deleteAutomation,
    } = useSoftwareUpdates();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [channels, setChannels] = useState<Record<string, ReleaseChannel>>({});
    const [query, setQuery] = useState("");
    const [isUpdatingQueue, setIsUpdatingQueue] = useState(false);
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [autoFrequency, setAutoFrequency] = useState<UpdateAutomationFrequency>("WEEKLY");
    const [autoTime, setAutoTime] = useState("03:00");
    const [autoChannel, setAutoChannel] = useState<ReleaseChannel>("stable");
    const [autoScope, setAutoScope] = useState<UpdateAutomationScope>("all");
    const [autoIncludePinned, setAutoIncludePinned] = useState(false);
    const [autoAllowReboot, setAutoAllowReboot] = useState(false);

    useEffect(() => {
        scanUpdates();
        loadAutomation();
    }, [loadAutomation, scanUpdates]);

    useEffect(() => {
        if (!automation?.settings) return;
        setAutoEnabled(automation.settings.enabled);
        setAutoFrequency(automation.settings.frequency);
        setAutoTime(automation.settings.time);
        setAutoChannel(automation.settings.channel);
        setAutoScope(automation.settings.scope);
        setAutoIncludePinned(automation.settings.includePinned);
        setAutoAllowReboot(automation.settings.allowReboot);
    }, [automation]);

    useEffect(() => {
        setSelectedIds((prev) => new Set([...prev].filter((id) => updates.some((item) => item.packageId === id))));
    }, [updates]);

    const filteredUpdates = useMemo(() => {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return updates;
        return updates.filter((item) =>
            `${item.name} ${item.packageId} ${item.currentVersion} ${item.availableVersion}`
                .toLowerCase()
                .includes(cleanQuery)
        );
    }, [query, updates]);

    const selectedItems = useMemo(
        () => updates.filter((item) => selectedIds.has(item.packageId)),
        [selectedIds, updates]
    );

    const betaCapableCount = updates.filter((item) => item.betaPackageId).length;
    const selectedCount = selectedItems.length;
    const allFilteredSelected = filteredUpdates.length > 0 && filteredUpdates.every((item) => selectedIds.has(item.packageId));

    const toggleSelected = (packageId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(packageId)) {
                next.delete(packageId);
            } else {
                next.add(packageId);
            }
            return next;
        });
    };

    const toggleAllFiltered = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) {
                filteredUpdates.forEach((item) => next.delete(item.packageId));
            } else {
                filteredUpdates.forEach((item) => next.add(item.packageId));
            }
            return next;
        });
    };

    const setChannel = (packageId: string, channel: ReleaseChannel) => {
        setChannels((prev) => ({ ...prev, [packageId]: channel }));
    };

    const updateSelected = async () => {
        if (selectedItems.length === 0 || isUpdatingQueue) return;
        setIsUpdatingQueue(true);

        let successCount = 0;
        for (const item of selectedItems) {
            const channel = channels[item.packageId] ?? "stable";
            const result = await updatePackage(item, channel);
            if (result.success) {
                successCount += 1;
            }
        }

        setIsUpdatingQueue(false);
        addToast({
            type: successCount === selectedItems.length ? "success" : "warning",
            title: "Update queue finished",
            message: `${successCount}/${selectedItems.length} packages updated successfully.`,
        });
    };

    const buildAutomationPackages = () => {
        const sourceItems = autoScope === "selected" ? selectedItems : updates;
        return sourceItems
            .filter((item) => autoChannel === "stable" || item.betaPackageId)
            .map((item) => ({
                packageId: item.packageId,
                betaPackageId: item.betaPackageId ?? null,
            }));
    };

    const saveAutomationSettings = async () => {
        const packages = buildAutomationPackages();
        if (autoScope === "selected" && selectedItems.length === 0) {
            addToast({ type: "warning", title: "Choose packages first", message: "Select at least one package for selected-package automation." });
            return;
        }
        if (autoChannel === "beta" && packages.length === 0) {
            addToast({ type: "warning", title: "No beta channels available", message: "Select at least one package with a known beta channel." });
            return;
        }

        try {
            await saveAutomation({
                enabled: autoEnabled,
                frequency: autoFrequency,
                time: autoTime,
                channel: autoChannel,
                scope: autoScope,
                includePinned: autoIncludePinned,
                allowReboot: autoAllowReboot,
                packages,
            });

            addToast({
                type: autoEnabled ? "success" : "info",
                title: autoEnabled ? "Auto updates scheduled" : "Auto updates saved disabled",
                message: autoEnabled ? `${autoFrequency.toLowerCase()} at ${autoTime}` : "The task is disabled until you turn it on.",
            });
        } catch (error) {
            addToast({ type: "error", title: "Failed to save schedule", message: String(error) });
        }
    };

    const removeAutomation = async () => {
        try {
            await deleteAutomation();
            setAutoEnabled(false);
            addToast({ type: "success", title: "Auto updates removed" });
        } catch (error) {
            addToast({ type: "error", title: "Failed to remove schedule", message: String(error) });
        }
    };

    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            <PackageCheck className="h-3.5 w-3.5" />
                            Apps & Packages
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Software Updates</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                            Scan installed WinGet-detectable apps, choose the exact packages to update, and keep each one on Stable unless a known beta channel is available.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={scanUpdates}
                            disabled={isScanning || isUpdatingQueue}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
                            Scan
                        </button>
                        <button
                            type="button"
                            onClick={updateSelected}
                            disabled={selectedCount === 0 || isUpdatingQueue || isScanning}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isUpdatingQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                            Update selected
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-surface p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Available</div>
                        <div className="mt-2 text-2xl font-black text-foreground">{updates.length}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Selected</div>
                        <div className="mt-2 text-2xl font-black text-foreground">{selectedCount}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Beta Known</div>
                        <div className="mt-2 text-2xl font-black text-foreground">{betaCapableCount}</div>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-xl">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                            <CalendarClock className="h-4 w-4 text-primary" />
                            Auto-update script
                        </div>
                        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                            Create a Windows Task Scheduler job that runs WinGet in the background using these settings. Stable can update all future detected packages; beta automation uses the known beta package IDs from the current selection.
                        </p>
                        {automation?.task && (
                            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                                Current task: {automation.task.enabled ? "enabled" : "disabled"} · Next run: {automation.task.next_run}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={saveAutomationSettings}
                            disabled={isSavingAutomation || isLoadingAutomation}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSavingAutomation ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                            Save schedule
                        </button>
                        <button
                            type="button"
                            onClick={removeAutomation}
                            disabled={isSavingAutomation || !automation}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-red-500/30 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Remove
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                        <span className="text-sm font-bold text-foreground">Enabled</span>
                        <input
                            type="checkbox"
                            checked={autoEnabled}
                            onChange={(event) => setAutoEnabled(event.target.checked)}
                            className="h-4 w-4 accent-primary"
                        />
                    </label>

                    <label className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Frequency</span>
                        <select
                            value={autoFrequency}
                            onChange={(event) => setAutoFrequency(event.target.value as UpdateAutomationFrequency)}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                        >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Run time</span>
                        <input
                            type="time"
                            value={autoTime}
                            onChange={(event) => setAutoTime(event.target.value)}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                        />
                    </label>

                    <label className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Scope</span>
                        <select
                            value={autoScope}
                            onChange={(event) => setAutoScope(event.target.value as UpdateAutomationScope)}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                        >
                            <option value="all">All detected updates</option>
                            <option value="selected">Selected packages only</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Channel</span>
                        <select
                            value={autoChannel}
                            onChange={(event) => setAutoChannel(event.target.value as ReleaseChannel)}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                        >
                            <option value="stable">Stable</option>
                            <option value="beta">Beta where known</option>
                        </select>
                    </label>

                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2 lg:grid-cols-1">
                        <label className="flex items-center justify-between gap-3 text-sm font-bold text-foreground">
                            Include pinned
                            <input
                                type="checkbox"
                                checked={autoIncludePinned}
                                onChange={(event) => setAutoIncludePinned(event.target.checked)}
                                className="h-4 w-4 accent-primary"
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm font-bold text-foreground">
                            Allow reboot
                            <input
                                type="checkbox"
                                checked={autoAllowReboot}
                                onChange={(event) => setAutoAllowReboot(event.target.checked)}
                                className="h-4 w-4 accent-primary"
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Filter updates..."
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-slate-500 focus:border-primary/40"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={toggleAllFiltered}
                        disabled={filteredUpdates.length === 0}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {allFilteredSelected ? "Clear shown" : "Select shown"}
                    </button>
                </div>

                {scanError && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <span>{scanError}</span>
                    </div>
                )}

                {isScanning ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-slate-500 dark:text-slate-300">
                        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-bold">Scanning installed software...</p>
                    </div>
                ) : filteredUpdates.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                        <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-500" />
                        <h2 className="text-lg font-bold text-foreground">No updateable packages found</h2>
                        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-300">
                            WinGet did not report any installed apps with available package updates.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] border-separate border-spacing-0">
                            <thead>
                                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                    <th className="w-10 border-b border-border px-2 py-3"></th>
                                    <th className="border-b border-border px-3 py-3">Package</th>
                                    <th className="border-b border-border px-3 py-3">Current</th>
                                    <th className="border-b border-border px-3 py-3">Available</th>
                                    <th className="border-b border-border px-3 py-3">Channel</th>
                                    <th className="border-b border-border px-3 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUpdates.map((item) => {
                                    const channel = channels[item.packageId] ?? "stable";
                                    const result = updateResults[item.packageId];
                                    const isUpdating = Boolean(updatingIds[item.packageId]);

                                    return (
                                        <tr key={item.packageId} className="group">
                                            <td className="border-b border-border/70 px-2 py-3 align-middle">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Select ${item.name}`}
                                                    checked={selectedIds.has(item.packageId)}
                                                    onChange={() => toggleSelected(item.packageId)}
                                                    className="h-4 w-4 rounded border-border accent-primary"
                                                />
                                            </td>
                                            <td className="border-b border-border/70 px-3 py-3 align-middle">
                                                <div className="font-bold text-foreground">{item.name}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                                                    <span className="font-mono">{item.packageId}</span>
                                                    {item.source && <span className="rounded-md bg-black/5 px-1.5 py-0.5 dark:bg-white/5">{item.source}</span>}
                                                </div>
                                            </td>
                                            <td className="border-b border-border/70 px-3 py-3 align-middle text-sm text-slate-500 dark:text-slate-300">
                                                {item.currentVersion}
                                            </td>
                                            <td className="border-b border-border/70 px-3 py-3 align-middle text-sm font-bold text-foreground">
                                                {item.availableVersion}
                                            </td>
                                            <td className="border-b border-border/70 px-3 py-3 align-middle">
                                                <ChannelToggle item={item} value={channel} onChange={(next) => setChannel(item.packageId, next)} />
                                            </td>
                                            <td className="border-b border-border/70 px-3 py-3 align-middle text-right">
                                                {isUpdating ? (
                                                    <span className="inline-flex items-center gap-2 text-xs font-bold text-primary">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Updating
                                                    </span>
                                                ) : result ? (
                                                    <span className={`inline-flex items-center gap-2 text-xs font-bold ${result.success ? "text-emerald-500" : "text-red-500"}`}>
                                                        {result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                                        {result.success ? "Updated" : "Failed"}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Ready</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
