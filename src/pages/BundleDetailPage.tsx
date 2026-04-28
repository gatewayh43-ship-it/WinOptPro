import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import {
  ArrowLeft, Package, CheckCircle2, Circle, Download,
  ExternalLink, ChevronRight, Loader2, CheckCheck, AlertTriangle, Star
} from "lucide-react";
import { useBundles } from "@/hooks/useBundles";
import { useApps } from "@/hooks/useApps";
import type { Bundle, AppMetadata } from "@/types/bundles";

// Per-app reason map explaining WHY each app is included in each bundle
const APP_REASONS: Record<string, Record<string, string>> = {
  "beginner-essentials": {
    "Mozilla.Firefox": "The most trusted privacy-respecting browser. A safer default than Edge.",
    "7zip.7zip": "Open-source archive manager. Handles ZIP, RAR, 7z, and more — for free.",
    "VideoLAN.VLC": "Plays literally any video or audio format without extra codecs.",
    "Notepad.Notepad-plus-plus": "A vastly superior replacement for Windows Notepad with syntax highlighting.",
    "voidtools.Everything": "Instant file search across your whole drive. Indispensable.",
    "Microsoft.PowerToys": "Microsoft's own power-user toolkit — window snapping, quick rename, colour picker, and more.",
    "Bitwarden.Bitwarden": "Free, open-source, end-to-end encrypted password manager."
  },
  "gamers-setup": {
    "Valve.Steam": "The world's largest PC game store and launcher.",
    "EpicGames.EpicGamesLauncher": "Free games every week, plus exclusive titles like Fortnite.",
    "GOG.Galaxy": "DRM-free games and a unified library across all launchers.",
    "Discord.Discord": "The de-facto voice and text chat app for gamers.",
    "Playnite.Playnite": "Unified front-end for all your game libraries in one place.",
    "Guru3D.Afterburner": "Industry-standard GPU monitoring and overclocking utility.",
    "OBSProject.OBSStudio": "Free, open-source broadcasting and recording software."
  },
  "developer-workstation": {
    "Microsoft.VisualStudioCode": "The dominant code editor — fast, extensible, and free.",
    "Git.Git": "Version control. Non-negotiable for any developer.",
    "Microsoft.WindowsTerminal": "A modern tabbed terminal supporting PowerShell, CMD, WSL, and SSH.",
    "OpenJS.NodeJS": "JavaScript runtime for backend, scripts, and tooling.",
    "Python.Python.3.14": "The second most popular language for scripting, data, and automation.",
    "Docker.DockerDesktop": "Spin up containerised dev environments in seconds.",
    "Postman.Postman": "Test and document REST APIs visually.",
    "WinSCP.WinSCP": "Graphical SFTP/FTP client for remote file transfer."
  },
  "overclocker-suite": {
    "CPUID.CPU-Z": "Real-time CPU, memory, and motherboard telemetry.",
    "TechPowerUp.GPU-Z": "Detailed GPU sensor and spec readout.",
    "REALiX.HWiNFO": "Deep-dive hardware monitoring with per-core, per-sensor data.",
    "OCBase.OCCT": "The standard stability test for overclocked systems.",
    "Geeks3D.FurMark": "Extreme GPU stress test — the 'melting donut'.",
    "Guru3D.Afterburner": "Overclocking and fan curve control for any GPU.",
    "BitSum.ProcessLasso": "Real-time CPU priority management to reduce stutters.",
    "CrystalDewWorld.CrystalDiskInfo": "SSD/HDD health monitoring and SMART data."
  },
  "privacy-first": {
    "Mozilla.Firefox": "Open-source browser with strong privacy defaults and extensions like uBlock Origin.",
    "Brave.Brave": "Chromium-based browser with built-in ad and tracker blocking.",
    "Bitwarden.Bitwarden": "The gold standard open-source password manager.",
    "ProtonTechnologies.ProtonVPN": "A no-log VPN from the makers of ProtonMail.",
    "OpenWhisperSystems.Signal": "End-to-end encrypted messaging. The most private messenger available.",
    "KeePassXCTeam.KeePassXC": "Local-only password vault — nothing ever hits the cloud."
  },
  "content-creator": {
    "OBSProject.OBSStudio": "Stream to Twitch/YouTube and record your screen simultaneously.",
    "BlackmagicDesign.DaVinciResolve": "Professional-grade free video editor and colour grading suite.",
    "Audacity.Audacity": "Record and edit audio tracks for commentary, podcasts, or music.",
    "GIMP.GIMP.3": "Free Photoshop alternative for thumbnail, graphics, and photo editing.",
    "Discord.Discord": "Manage your community and collaborate with other creators.",
    "HandBrake.HandBrake": "Convert and compress videos for upload-ready output."
  }
};

const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", gradient: "from-blue-500/20 to-transparent" },
  green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", gradient: "from-green-500/20 to-transparent" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", gradient: "from-violet-500/20 to-transparent" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", gradient: "from-red-500/20 to-transparent" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", gradient: "from-amber-500/20 to-transparent" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", gradient: "from-cyan-500/20 to-transparent" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", gradient: "from-orange-500/20 to-transparent" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", gradient: "from-rose-500/20 to-transparent" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", gradient: "from-pink-500/20 to-transparent" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30", gradient: "from-teal-500/20 to-transparent" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", gradient: "from-yellow-500/20 to-transparent" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", gradient: "from-indigo-500/20 to-transparent" },
  fuchsia: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/30", gradient: "from-fuchsia-500/20 to-transparent" },
  slate: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", gradient: "from-slate-500/20 to-transparent" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", gradient: "from-sky-500/20 to-transparent" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", gradient: "from-purple-500/20 to-transparent" },
  zinc: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30", gradient: "from-zinc-500/20 to-transparent" },
  gray: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30", gradient: "from-gray-500/20 to-transparent" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", gradient: "from-emerald-500/20 to-transparent" },
};

function BundleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Icon ? <Icon className={className} /> : <Package className={className} />;
}

type InstallStatus = "idle" | "installing" | "done" | "error";

interface AppRowProps {
  appId: string;
  metadata: AppMetadata | null;
  reason?: string;
  selected: boolean;
  onToggle: () => void;
  installStatus: InstallStatus;
  isInstalled: boolean;
}

function AppRow({ appId, metadata, reason, selected, onToggle, installStatus, isInstalled }: AppRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-border/70 hover:bg-card/80"
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        {installStatus === "installing" ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : installStatus === "done" || isInstalled ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : installStatus === "error" ? (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        ) : selected ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
        )}
      </div>

      {/* App logo */}
      {metadata?.logo ? (
        <img
          src={metadata.logo}
          alt={metadata.name}
          className="w-10 h-10 rounded-xl object-contain bg-white p-1 shrink-0"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {metadata?.name ?? appId}
          </span>
          {metadata?.publisher && (
            <span className="text-xs text-muted-foreground">{metadata.publisher}</span>
          )}
          {isInstalled && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Installed
            </span>
          )}
          {metadata?.is_verified && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Why it's included */}
        {reason && (
          <p className="text-xs text-primary/80 mt-1 font-medium italic">
            💡 {reason}
          </p>
        )}

        {/* App description */}
        {metadata?.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {metadata.description}
          </p>
        )}

        {/* Trust score */}
        {metadata?.trust_score !== undefined && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-muted-foreground">{metadata.trust_score}/100 trust score</span>
          </div>
        )}
      </div>

      {/* Right arrow hint */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1 hidden sm:block" />
    </motion.div>
  );
}

interface BundleDetailPageProps {
  bundle: Bundle;
  onBack: () => void;
}

export function BundleDetailPage({ bundle, onBack }: BundleDetailPageProps) {
  const { resolveBundle } = useBundles();
  const { installApp, installedApps } = useApps();

  const resolved = useMemo(() => resolveBundle(bundle), [bundle, resolveBundle]);
  const reasons = APP_REASONS[bundle.id] ?? {};

  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    new Set(bundle.apps)
  );
  const [installStatuses, setInstallStatuses] = useState<Record<string, InstallStatus>>({});
  const [isInstallingAll, setIsInstallingAll] = useState(false);
  const [overallDone, setOverallDone] = useState(false);

  const colors = colorMap[bundle.color] ?? colorMap.blue;

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const selectAll = () => setSelectedApps(new Set(bundle.apps));
  const deselectAll = () => setSelectedApps(new Set());

  const handleInstallAll = async () => {
    const toInstall = resolved.resolvedApps.filter(
      ({ appId }) => selectedApps.has(appId) && !installedApps[appId]
    );
    if (toInstall.length === 0) return;

    setIsInstallingAll(true);
    setOverallDone(false);

    for (const { appId, metadata } of toInstall) {
      setInstallStatuses((prev) => ({ ...prev, [appId]: "installing" }));
      try {
        const result = await installApp(
          metadata?.name ?? appId,
          appId,
          appId
        );
        setInstallStatuses((prev) => ({
          ...prev,
          [appId]: result.success ? "done" : "error",
        }));
      } catch {
        setInstallStatuses((prev) => ({ ...prev, [appId]: "error" }));
      }
    }

    setIsInstallingAll(false);
    setOverallDone(true);
  };

  const selectedCount = selectedApps.size;
  const alreadyInstalledCount = resolved.resolvedApps.filter(
    ({ appId }) => selectedApps.has(appId) && installedApps[appId]
  ).length;
  const toInstallCount = selectedCount - alreadyInstalledCount;

  const successCount = Object.values(installStatuses).filter((s) => s === "done").length;
  const errorCount = Object.values(installStatuses).filter((s) => s === "error").length;

  return (
    <motion.div
      data-testid="install-modal"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 w-full max-w-[900px] mx-auto pb-20 px-4"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-6 mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Bundles
      </button>

      {/* Hero header */}
      <div className={`relative rounded-3xl border ${colors.border} overflow-hidden mb-8 p-8`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} pointer-events-none`} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colors.bg} shrink-0`}>
            <BundleIcon name={bundle.icon} className={`w-8 h-8 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                {bundle.group}
              </span>
              <span className="text-xs text-muted-foreground">{bundle.apps.length} apps</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{bundle.name}</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">{bundle.description}</p>
          </div>
        </div>
      </div>

      {/* Install summary bar */}
      <AnimatePresence>
        {overallDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border mb-6 ${
              errorCount > 0
                ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
            }`}
          >
            {errorCount > 0 ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <CheckCheck className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-medium">
              {errorCount > 0
                ? `Installed ${successCount} app${successCount !== 1 ? "s" : ""}. ${errorCount} failed — they may already be installed or unavailable.`
                : `All ${successCount} app${successCount !== 1 ? "s" : ""} installed successfully!`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} of {bundle.apps.length} selected
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Select all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            onClick={deselectAll}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Deselect all
          </button>
        </div>

        <button
          onClick={handleInstallAll}
          disabled={isInstallingAll || toInstallCount === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isInstallingAll || toInstallCount === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : `${colors.bg} ${colors.text} border ${colors.border} hover:opacity-80`
          }`}
        >
          {isInstallingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Installing…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {toInstallCount > 0
                ? `Install ${toInstallCount} App${toInstallCount !== 1 ? "s" : ""}`
                : "All Selected Already Installed"}
            </>
          )}
        </button>
      </div>

      {/* App list */}
      <div className="space-y-2">
        {resolved.resolvedApps.map(({ appId, metadata }) => (
          <AppRow
            key={appId}
            appId={appId}
            metadata={metadata}
            reason={reasons[appId]}
            selected={selectedApps.has(appId)}
            onToggle={() => toggleApp(appId)}
            installStatus={installStatuses[appId] ?? "idle"}
            isInstalled={!!installedApps[appId]}
          />
        ))}
      </div>

      {/* Pro tip */}
      <div className="mt-8 p-4 rounded-2xl border border-border bg-card/50 flex items-start gap-3">
        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> Deselect any apps you already have or don't need, then click Install to get only what's missing. Installs run sequentially in the background using winget.
        </p>
      </div>
    </motion.div>
  );
}
