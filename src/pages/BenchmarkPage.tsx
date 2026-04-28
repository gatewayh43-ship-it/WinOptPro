import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge, Wifi, Cpu, HardDrive, Monitor, Play, RefreshCw,
  CheckCircle2, AlertTriangle, Loader2, Download, Info,
  Zap, BarChart3, Activity
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PcScore {
  cpuScore: number; memoryScore: number; diskScore: number;
  graphicsScore: number; gamingGraphicsScore: number;
  baseScore: number; lastAssessment?: string;
}

interface SpeedTestResult {
  downloadMbps: number; pingMs?: number; jitterMs?: number;
  packetLossPct: number; serverName: string; bytesDownloaded: number;
}

interface CpuBenchResult {
  score: number; singleCoreScore: number; multiCoreScore: number;
  durationSecs: number; threadCount: number;
}

interface DiskBenchResult {
  readMbps: number; writeMbps: number;
  readIops?: number; writeIops?: number; method: string;
}

interface BlenderCheckResult {
  installed: boolean; cliPath?: string; blenderVersion?: string;
}

interface BlenderBenchResult {
  samplesPerMinute: number; deviceName: string; deviceType: string;
  scene: string; blenderVersion: string; durationSecs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Status = "idle" | "running" | "done" | "error";

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function speedRating(mbps: number): { label: string; color: string } {
  if (mbps >= 100) return { label: "Excellent", color: "text-emerald-400" };
  if (mbps >= 25) return { label: "Good", color: "text-blue-400" };
  if (mbps >= 5) return { label: "Fair", color: "text-amber-400" };
  return { label: "Poor", color: "text-red-400" };
}

// Arc gauge for WinSAT scores
function ScoreGauge({ value, label, max = 9.9 }: { value: number; label: string; max?: number }) {
  const pct = Math.min(value / max, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const arcLength = circ * 0.75; // 270° arc
  const filled = arcLength * pct;
  const rotation = -135; // start at bottom-left

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-0">
          {/* Background arc */}
          <circle
            cx="50" cy="50" r={r}
            fill="none" stroke="currentColor"
            className="text-muted/30"
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${circ}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(${rotation} 50 50)`}
          />
          {/* Filled arc */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            className={value >= 8 ? "stroke-emerald-400" : value >= 5 ? "stroke-amber-400" : "stroke-red-400"}
            strokeWidth="8"
            strokeDasharray={`${filled} ${circ}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform={`rotate(${rotation} 50 50)`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${scoreColor(value)}`}>{value.toFixed(1)}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">/ 9.9</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center">{label}</span>
    </div>
  );
}

// Stat card for speed test / disk / CPU
function StatCard({ label, value, unit, sub, icon: Icon, color = "text-primary" }: {
  label: string; value: string | number; unit?: string;
  sub?: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-black ${color}`}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── PC Score Tab ─────────────────────────────────────────────────────────────

function PcScoreTab() {
  const [score, setScore] = useState<PcScore | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [isRunningFormal, setIsRunningFormal] = useState(false);

  const readScore = useCallback(async () => {
    setStatus("running"); setError("");
    try {
      const result = await invoke<PcScore>("get_pc_score");
      setScore(result); setStatus("done");
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, []);

  const runFormal = useCallback(async () => {
    setIsRunningFormal(true); setError("");
    try {
      const result = await invoke<PcScore>("run_winsat_formal");
      setScore(result); setStatus("done");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunningFormal(false);
    }
  }, []);

  const components = score ? [
    { label: "Processor", key: "cpuScore", val: score.cpuScore },
    { label: "Memory (RAM)", key: "memoryScore", val: score.memoryScore },
    { label: "Disk (SSD)", key: "diskScore", val: score.diskScore },
    { label: "Graphics", key: "graphicsScore", val: score.graphicsScore },
    { label: "Gaming GPU", key: "gamingGraphicsScore", val: score.gamingGraphicsScore },
  ] : [];

  const bottleneck = score ? components.reduce((a, b) => a.val < b.val ? a : b) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Microsoft PC Score</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Windows System Assessment Tool (WinSAT) scores each component 1.0–9.9.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={readScore}
            disabled={status === "running" || isRunningFormal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Read Last Score
          </button>
          <button
            onClick={runFormal}
            disabled={status === "running" || isRunningFormal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunningFormal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunningFormal ? "Running (~2 min)…" : "Run Full Assessment"}
          </button>
        </div>
      </div>

      {/* Admin warning */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">
          <strong className="text-amber-400">Full Assessment</strong> requires Administrator privileges and takes ~2 minutes.
          "Read Last Score" reads the existing cached result instantly.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {score && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Overall score */}
            <div className="text-center p-6 rounded-3xl border border-border bg-card/50">
              <div className="text-6xl font-black mb-1">
                <span className={scoreColor(score.baseScore)}>{score.baseScore.toFixed(1)}</span>
                <span className="text-muted-foreground/40 text-2xl"> / 9.9</span>
              </div>
              <div className="text-muted-foreground text-sm">Base Score (limited by weakest component)</div>
              {score.lastAssessment && (
                <div className="text-xs text-muted-foreground/60 mt-1">Last assessed: {new Date(score.lastAssessment).toLocaleString()}</div>
              )}
            </div>

            {/* Component gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-6 rounded-3xl border border-border bg-card">
              {components.map(({ label, val }) => (
                <ScoreGauge key={label} value={val} label={label} />
              ))}
            </div>

            {/* Bottleneck callout */}
            {bottleneck && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-foreground">System Bottleneck: </span>
                  <span className="text-sm text-amber-400">{bottleneck.label}</span>
                  <span className="text-sm text-muted-foreground"> ({bottleneck.val.toFixed(1)}) is limiting your overall score.</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Speed Test Tab ───────────────────────────────────────────────────────────

function SpeedTestTab() {
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setStatus("running"); setError(""); setResult(null);
    try {
      const r = await invoke<SpeedTestResult>("run_speed_test");
      setResult(r); setStatus("done");
      // Store last 3 in localStorage
      const history = JSON.parse(localStorage.getItem("winopt_speed_history") || "[]");
      history.unshift({ ...r, ts: Date.now() });
      localStorage.setItem("winopt_speed_history", JSON.stringify(history.slice(0, 3)));
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, []);

  const rating = result ? speedRating(result.downloadMbps) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Internet Speed Test</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Downloads 10 MB from Cloudflare's CDN and pings 1.1.1.1. No third-party apps required.
          </p>
        </div>
        <button
          onClick={run}
          disabled={status === "running"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          {status === "running" ? "Testing…" : "Run Speed Test"}
        </button>
      </div>

      {status === "running" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
              <Wifi className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-full border-4 border-primary/40 animate-ping" />
          </div>
          <div className="text-muted-foreground text-sm">Downloading 10 MB from Cloudflare…</div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Hero speed */}
            <div className="text-center p-8 rounded-3xl border border-border bg-card/50">
              <div className={`text-7xl font-black ${rating?.color}`}>
                {result.downloadMbps.toFixed(1)}
              </div>
              <div className="text-muted-foreground mt-1">Mbps Download</div>
              <div className={`text-lg font-bold mt-2 ${rating?.color}`}>{rating?.label}</div>
              <div className="text-xs text-muted-foreground/60 mt-1">via {result.serverName}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard
                label="Ping"
                value={result.pingMs?.toFixed(0) ?? "—"}
                unit="ms"
                icon={Activity}
                color={result.pingMs && result.pingMs < 20 ? "text-emerald-400" : result.pingMs && result.pingMs < 50 ? "text-amber-400" : "text-red-400"}
              />
              <StatCard
                label="Jitter"
                value={result.jitterMs?.toFixed(1) ?? "—"}
                unit="ms"
                icon={BarChart3}
                color="text-blue-400"
              />
              <StatCard
                label="Packet Loss"
                value={result.packetLossPct.toFixed(1)}
                unit="%"
                icon={AlertTriangle}
                color={result.packetLossPct === 0 ? "text-emerald-400" : "text-red-400"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Deep Benchmark Tab ───────────────────────────────────────────────────────

type DeepTab = "cpu" | "disk" | "gpu";

function CpuBenchSection() {
  const [result, setResult] = useState<CpuBenchResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setStatus("running"); setError(""); setResult(null);
    try {
      const r = await invoke<CpuBenchResult>("run_cpu_benchmark");
      setResult(r); setStatus("done");
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">CPU Benchmark</h3>
          <p className="text-sm text-muted-foreground">Prime sieve + float workload. Runs single-core then all-core (~30 sec).</p>
        </div>
        <button onClick={run} disabled={status === "running"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {status === "running" ? "Benchmarking…" : "Run CPU Test"}
        </button>
      </div>

      {error && <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Overall Score" value={result.score.toLocaleString()} icon={Gauge} color="text-primary" />
            <StatCard label="Single Core" value={result.singleCoreScore.toLocaleString()} unit="pts" icon={Cpu} color="text-blue-400" sub={`1 thread`} />
            <StatCard label="Multi Core" value={result.multiCoreScore.toLocaleString()} unit="pts" icon={Zap} color="text-violet-400" sub={`${result.threadCount} threads`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiskBenchSection() {
  const [result, setResult] = useState<DiskBenchResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setStatus("running"); setError(""); setResult(null);
    try {
      const r = await invoke<DiskBenchResult>("run_disk_benchmark");
      setResult(r); setStatus("done");
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">Disk Benchmark</h3>
          <p className="text-sm text-muted-foreground">Measures sequential read/write speed using diskspd or native I/O (~15 sec).</p>
        </div>
        <button onClick={run} disabled={status === "running"}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {status === "running" ? "Testing…" : "Run Disk Test"}
        </button>
      </div>

      {error && <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Read Speed" value={result.readMbps.toFixed(0)} unit="MB/s" icon={Download} color="text-emerald-400"
                sub={result.readMbps >= 500 ? "NVMe class" : result.readMbps >= 100 ? "SSD class" : "HDD class"} />
              <StatCard label="Write Speed" value={result.writeMbps.toFixed(0)} unit="MB/s" icon={HardDrive} color="text-blue-400"
                sub={`Method: ${result.method}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GpuBenchSection() {
  const [checkResult, setCheckResult] = useState<BlenderCheckResult | null>(null);
  const [benchResult, setBenchResult] = useState<BlenderBenchResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [deviceType, setDeviceType] = useState("CPU");
  const [installing, setInstalling] = useState(false);

  const checkInstall = useCallback(async () => {
    setStatus("running");
    try {
      const r = await invoke<BlenderCheckResult>("check_blender_installed");
      setCheckResult(r); setStatus("done");
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, []);

  const installBlender = useCallback(async () => {
    setInstalling(true);
    try {
      await invoke("install_app", {
        wingetId: "Blender",
        chocoId: "BlenderFoundation.Blender",
        appId: "BlenderFoundation.Blender",
      });
      // Re-check after install
      await checkInstall();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  }, [checkInstall]);

  const runBench = useCallback(async () => {
    setStatus("running"); setError(""); setBenchResult(null);
    try {
      const r = await invoke<BlenderBenchResult>("run_blender_benchmark", { deviceType });
      setBenchResult(r); setStatus("done");
    } catch (e) {
      setError(String(e)); setStatus("error");
    }
  }, [deviceType]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">GPU Benchmark (Blender)</h3>
          <p className="text-sm text-muted-foreground">
            Uses Blender Benchmark CLI to measure rendering performance in samples/minute.
          </p>
        </div>
        <button onClick={checkInstall} disabled={status === "running"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Check
        </button>
      </div>

      {error && <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {/* Not checked yet */}
      {!checkResult && status !== "running" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Monitor className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Click "Check" to detect Blender installation</p>
          <button onClick={checkInstall}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Check for Blender
          </button>
        </div>
      )}

      {status === "running" && !checkResult && (
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Checking installation…
        </div>
      )}

      <AnimatePresence>
        {/* Not installed */}
        {checkResult && !checkResult.installed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Blender Benchmark Not Found</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The Blender Benchmark CLI is required for GPU benchmarking. It uses the
                  Cycles rendering engine to measure GPU/CPU rendering performance.
                </p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground font-mono border border-border">
              winget install -e --id BlenderFoundation.Blender
            </div>
            <button onClick={installBlender} disabled={installing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {installing ? "Installing via winget…" : "Install Blender via winget"}
            </button>
          </motion.div>
        )}

        {/* Installed — show benchmark controls */}
        {checkResult?.installed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Blender detected{checkResult.blenderVersion ? ` — ${checkResult.blenderVersion}` : ""}</span>
            </div>

            {/* Device selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Render Device</label>
              <div className="flex gap-2 flex-wrap">
                {["CPU", "CUDA", "OPTIX", "HIP"].map((d) => (
                  <button key={d}
                    onClick={() => setDeviceType(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${deviceType === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/70 hover:text-foreground"
                    }`}>
                    {d === "CPU" ? "CPU" : d === "CUDA" ? "CUDA (NVIDIA)" : d === "OPTIX" ? "OptiX (RTX)" : "HIP (AMD)"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {deviceType === "CPU" ? "Uses your processor — compatible with all systems."
                  : deviceType === "CUDA" ? "CUDA requires an NVIDIA GPU."
                  : deviceType === "OPTIX" ? "OptiX uses RT cores on RTX GPUs for best performance."
                  : "HIP (ROCm) requires an AMD Radeon GPU."}
              </p>
            </div>

            <button onClick={runBench} disabled={status === "running"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {status === "running" ? "Rendering benchmark scene…" : `Run GPU Benchmark (${deviceType})`}
            </button>

            {status === "running" && (
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground font-mono animate-pulse">
                Running Blender "Monster" scene benchmark via {deviceType}…
                <br />This may take 2–5 minutes depending on your hardware.
              </div>
            )}

            {benchResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Score"
                  value={Math.round(benchResult.samplesPerMinute).toLocaleString()}
                  unit="spm"
                  icon={Gauge}
                  color="text-primary"
                  sub="samples per minute"
                />
                <StatCard
                  label="Device"
                  value={benchResult.deviceName.split(" ").slice(0, 2).join(" ")}
                  icon={Monitor}
                  color="text-violet-400"
                  sub={benchResult.deviceType}
                />
                <StatCard
                  label="Duration"
                  value={benchResult.durationSecs.toFixed(0)}
                  unit="sec"
                  icon={Activity}
                  color="text-amber-400"
                  sub={`Scene: ${benchResult.scene}`}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeepBenchTab() {
  const [activeDeep, setActiveDeep] = useState<DeepTab>("cpu");

  const deepTabs: Array<{ id: DeepTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "cpu", label: "CPU", icon: Cpu },
    { id: "disk", label: "Disk", icon: HardDrive },
    { id: "gpu", label: "GPU (Blender)", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Deep Benchmark</h2>
        <p className="text-sm text-muted-foreground mt-1">In-depth component benchmarks with detailed results.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border w-fit">
        {deepTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveDeep(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDeep === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDeep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {activeDeep === "cpu" && <CpuBenchSection />}
            {activeDeep === "disk" && <DiskBenchSection />}
            {activeDeep === "gpu" && <GpuBenchSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type MainTab = "pcscore" | "speed" | "deep";

export function BenchmarkPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("pcscore");

  const tabs: Array<{ id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "pcscore", label: "PC Score", icon: Gauge },
    { id: "speed", label: "Speed Test", icon: Wifi },
    { id: "deep", label: "Deep Benchmark", icon: BarChart3 },
  ];

  return (
    <div className="flex-1 w-full max-w-[1100px] mx-auto pb-20 px-4">
      {/* Header */}
      <div className="pt-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Gauge className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Benchmark</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Measure your PC's real-world performance — CPU, GPU, disk, and internet speed.
        </p>
      </div>

      {/* Main tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 border border-border mb-8 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-4 h-4 ${activeTab === id ? "text-primary" : ""}`} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "pcscore" && <PcScoreTab />}
          {activeTab === "speed" && <SpeedTestTab />}
          {activeTab === "deep" && <DeepBenchTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
