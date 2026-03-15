import { useState, useCallback, useEffect } from "react";
import { X, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import type { ResolvedBundle, AppInstallResult, BundleInstallModalProps } from "@/types/bundles";

export function BundleInstallModal({
  bundle,
  isOpen,
  onClose,
  installApp,
  installedApps,
}: BundleInstallModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    bundle.resolvedApps.forEach(({ appId, metadata }) => {
      if (metadata && !installedApps[appId]) {
        init[appId] = true;
      }
    });
    return init;
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [results, setResults] = useState<Record<string, AppInstallResult>>({});

  // Reset selected state when the bundle changes (modal reused for different bundle)
  useEffect(() => {
    const init: Record<string, boolean> = {};
    bundle.resolvedApps.forEach(({ appId, metadata }) => {
      if (metadata && !installedApps[appId]) {
        init[appId] = true;
      }
    });
    setSelected(init);
    setExpanded(new Set());
    setResults({});
  }, [bundle.id]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleSelect = useCallback((appId: string) => {
    setSelected((prev) => ({ ...prev, [appId]: !prev[appId] }));
  }, []);

  const toggleExpand = useCallback((appId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  }, []);

  const handleInstall = useCallback(async () => {
    if (installing) return;
    const toInstall = bundle.resolvedApps.filter(
      ({ appId, metadata }) => metadata && selected[appId] && !installedApps[appId]
    );
    setInstalling(true);
    for (const { appId } of toInstall) {
      const result = await installApp(appId, "", appId);
      setResults((prev) => ({ ...prev, [appId]: result }));
    }
    setInstalling(false);
  }, [bundle.resolvedApps, selected, installedApps, installApp]);

  if (!isOpen) return null;

  const buttonLabel = installing
    ? "Installing…"
    : selectedCount === 0
    ? "No apps selected"
    : `Install ${selectedCount} app${selectedCount === 1 ? "" : "s"} →`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Install: {bundle.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* App list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {bundle.resolvedApps.map(({ appId, metadata }) => {
            const isInstalled = installedApps[appId] === true;
            const isUnavailable = metadata === null;
            const isExpanded = expanded.has(appId);
            const result = results[appId];

            return (
              <div key={appId} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    data-testid={`checkbox-${appId}`}
                    checked={!isUnavailable && !isInstalled && (selected[appId] ?? false)}
                    disabled={isUnavailable || isInstalled || installing}
                    onChange={() => toggleSelect(appId)}
                    className="w-4 h-4 rounded accent-primary"
                  />

                  {/* Logo */}
                  {metadata?.logo ? (
                    <img src={metadata.logo} alt={metadata.name} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {(metadata?.name ?? appId).slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${isUnavailable ? "text-muted-foreground line-through" : isInstalled ? "text-muted-foreground" : ""}`}>
                      {metadata?.name ?? appId}
                    </span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {isUnavailable && (
                        <span data-testid={`unavailable-${appId}`} className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          Not available
                        </span>
                      )}
                      {isInstalled && (
                        <span data-testid={`installed-badge-${appId}`} className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={10} />
                          Installed ✓
                        </span>
                      )}
                      {result?.success === true && (
                        <span data-testid={`result-success-${appId}`} className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={10} />
                          Done
                        </span>
                      )}
                      {result?.success === false && (
                        <span data-testid={`result-error-${appId}`} className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          <XCircle size={10} />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand button */}
                  {metadata && (
                    <button
                      data-testid={`expand-${appId}`}
                      onClick={() => toggleExpand(appId)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && metadata && (
                  <div className="px-4 pb-3 border-t border-border/50 pt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground">{metadata.description}</p>
                    {metadata.license && (
                      <p className="text-xs text-muted-foreground">License: <span className="font-medium">{metadata.license}</span></p>
                    )}
                    {metadata.website && (
                      <a href={metadata.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink size={10} /> Website
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {selectedCount} app{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={selectedCount === 0 || installing}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
