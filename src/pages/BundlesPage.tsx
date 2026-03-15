import { useState, useCallback } from "react";
import { Search, Plus, Trash2, Edit3, Package, Boxes } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useBundles } from "@/hooks/useBundles";
import { useApps } from "@/hooks/useApps";
import { BundleInstallModal } from "@/components/BundleInstallModal";
import type { Bundle, ResolvedBundle } from "@/types/bundles";

const GROUP_ORDER = [
  "Starters",
  "Gaming",
  "Power Users",
  "Creative",
  "Community Picks",
  "Curated Collections",
];

const ICON_OPTIONS = [
  "Star", "Zap", "Rocket", "Shield", "Code2", "Gamepad2",
  "Music", "Video", "Briefcase", "Terminal", "Globe", "Lock",
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
];

function BundleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return Icon ? <Icon size={20} className={className} /> : <Package size={20} className={className} />;
}

function BundleCard({
  bundle,
  onInstall,
  onDelete,
  onEdit,
  resolvedApps,
}: {
  bundle: Bundle;
  onInstall: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  resolvedApps: Array<{ appId: string; metadata: { name: string } | null }>;
}) {
  const firstThree = resolvedApps.slice(0, 3);
  const overflow = resolvedApps.length - 3;
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-400/10",
    green: "text-green-400 bg-green-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    red: "text-red-400 bg-red-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    cyan: "text-cyan-400 bg-cyan-400/10",
    orange: "text-orange-400 bg-orange-400/10",
    rose: "text-rose-400 bg-rose-400/10",
    pink: "text-pink-400 bg-pink-400/10",
    teal: "text-teal-400 bg-teal-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    indigo: "text-indigo-400 bg-indigo-400/10",
    fuchsia: "text-fuchsia-400 bg-fuchsia-400/10",
    slate: "text-slate-400 bg-slate-400/10",
    sky: "text-sky-400 bg-sky-400/10",
    purple: "text-purple-400 bg-purple-400/10",
    zinc: "text-zinc-400 bg-zinc-400/10",
    gray: "text-gray-400 bg-gray-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
  };
  const iconColor = colorMap[bundle.color] ?? "text-primary bg-primary/10";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <BundleIcon name={bundle.icon} />
        </div>
        <div className="flex gap-1 ml-auto">
          {bundle.type === "custom" && onEdit && (
            <button data-testid={`edit-bundle-${bundle.id}`} onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Edit3 size={14} />
            </button>
          )}
          {bundle.type === "custom" && onDelete && (
            <button data-testid={`delete-bundle-${bundle.id}`} onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{bundle.name}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bundle.description}</p>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">{resolvedApps.length} apps</span>
        {firstThree.map(({ appId, metadata }) => (
          <span key={appId} className="text-xs px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
            {metadata?.name ?? appId}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-xs text-muted-foreground">+{overflow} more</span>
        )}
      </div>

      <button
        onClick={onInstall}
        className="w-full mt-auto py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Install Bundle
      </button>
    </div>
  );
}

interface CreatePanelProps {
  onSave: (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => void;
  onCancel: () => void;
}

function CreateBundlePanel({ onSave, onCancel }: CreatePanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState("blue");
  const [group, setGroup] = useState("Other");
  const [appSearch, setAppSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const canSave = name.trim().length > 0 && selectedApps.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), description, icon, color, group, apps: selectedApps });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const srcIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (srcIdx === targetIdx) return;
    const updated = [...selectedApps];
    const [removed] = updated.splice(srcIdx, 1);
    updated.splice(targetIdx, 0, removed);
    setSelectedApps(updated);
    setDragOver(null);
  };

  return (
    <div className="border border-primary/30 rounded-2xl p-5 bg-primary/5 space-y-4">
      <h3 className="font-semibold">Create Bundle</h3>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Bundle Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bundle name..."
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this bundle for?"
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Group</label>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {[...GROUP_ORDER, "Other"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
        <div className="flex gap-2 flex-wrap">
          {ICON_OPTIONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={`p-2 rounded-xl border transition-colors ${icon === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            >
              <BundleIcon name={i} className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full ${c.class} ${color === c.value ? "ring-2 ring-offset-2 ring-primary" : ""}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Add Apps</label>
        <input
          value={appSearch}
          onChange={(e) => setAppSearch(e.target.value)}
          placeholder="Type an app ID (e.g. Mozilla.Firefox)"
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {appSearch.trim() && (
          <button
            onClick={() => {
              const id = appSearch.trim();
              if (!selectedApps.includes(id)) setSelectedApps((prev) => [...prev, id]);
              setAppSearch("");
            }}
            className="mt-1.5 text-xs text-primary hover:underline"
          >
            + Add "{appSearch.trim()}"
          </button>
        )}
      </div>

      {selectedApps.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Selected Apps ({selectedApps.length})</label>
          <div className="space-y-1">
            {selectedApps.map((appId, idx) => (
              <div
                key={appId}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDrop={(e) => handleDrop(e, idx)}
                onDragLeave={() => setDragOver(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm cursor-grab ${dragOver === idx ? "ring-2 ring-primary" : ""}`}
              >
                <span className="text-muted-foreground">⠿</span>
                <span className="flex-1 font-mono text-xs">{appId}</span>
                <button
                  onClick={() => setSelectedApps((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Bundle
        </button>
      </div>
    </div>
  );
}

export function BundlesPage({ setView }: { setView?: (view: string) => void }) {
  const {
    curatedBundles,
    customBundles,
    saveCustomBundle,
    deleteCustomBundle,
    resolveBundle,
    searchQuery,
    setSearchQuery,
    filteredBundles,
  } = useBundles();

  const { installApp, installedApps, checkInstalled } = useApps();

  const [showCreate, setShowCreate] = useState(false);
  const [modalBundle, setModalBundle] = useState<ResolvedBundle | null>(null);

  const openModal = useCallback(
    (bundle: Bundle) => {
      const resolved = resolveBundle(bundle);
      // Prefetch install status in the background — don't block modal open
      Promise.all(
        resolved.resolvedApps
          .filter(({ metadata }) => metadata !== null)
          .map(({ appId }) => checkInstalled(appId, appId))
      ).catch(() => {/* silent */});
      setModalBundle(resolved);
    },
    [resolveBundle, checkInstalled]
  );

  const isSearching = searchQuery.trim().length > 0;

  const groupedCurated: Record<string, Bundle[]> = {};
  curatedBundles.forEach((b) => {
    if (!groupedCurated[b.group]) groupedCurated[b.group] = [];
    groupedCurated[b.group].push(b);
  });

  return (
    <div className="flex-1 w-full max-w-[1300px] mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <Boxes size={24} className="text-primary" />
            <h1 className="text-2xl font-bold">App Bundles</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Curated app collections for every setup. Install in one click.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          + Create Bundle
        </button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="mb-6">
          <CreateBundlePanel
            onSave={(bundle) => {
              saveCustomBundle(bundle);
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bundles..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Bundle list */}
      {isSearching ? (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Search Results <span className="font-normal normal-case">({filteredBundles.length})</span>
          </h2>
          {filteredBundles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No bundles match "{searchQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="mt-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBundles.map((bundle) => {
                const resolved = resolveBundle(bundle);
                return (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    resolvedApps={resolved.resolvedApps}
                    onInstall={() => openModal(bundle)}
                    onDelete={bundle.type === "custom" ? () => deleteCustomBundle(bundle.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* My Bundles */}
          {customBundles.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Bundles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customBundles.map((bundle) => {
                  const resolved = resolveBundle(bundle);
                  return (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      resolvedApps={resolved.resolvedApps}
                      onInstall={() => openModal(bundle)}
                      onDelete={() => deleteCustomBundle(bundle.id)}
                      onEdit={undefined}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Curated groups */}
          {GROUP_ORDER.map((group) => {
            const bundles = groupedCurated[group];
            if (!bundles?.length) return null;
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundles.map((bundle) => {
                    const resolved = resolveBundle(bundle);
                    return (
                      <BundleCard
                        key={bundle.id}
                        bundle={bundle}
                        resolvedApps={resolved.resolvedApps}
                        onInstall={() => openModal(bundle)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Install modal */}
      {modalBundle && (
        <BundleInstallModal
          bundle={modalBundle}
          isOpen={true}
          onClose={() => setModalBundle(null)}
          installApp={installApp}
          installedApps={installedApps}
        />
      )}
    </div>
  );
}
