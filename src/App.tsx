import React, { useState, useEffect, useRef } from "react";
import type { Tweak } from "./store/appStore";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { MainLayout } from "./components/layout/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { HomePage } from "./pages/HomePage";
import { TweaksPage } from "./pages/TweaksPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { StartupPage } from "./pages/StartupPage";
import { StoragePage } from "./pages/StoragePage";
import { ProcessPage } from "./pages/ProcessPage";
import { NetworkAnalyzerPage } from "./pages/NetworkAnalyzerPage";
import { AppsPage } from "./pages/AppsPage";
import { BundlesPage } from "./pages/BundlesPage";
import { PowerPage } from "./pages/PowerPage";
import { DefenderPage } from "./pages/DefenderPage";
import { PrivacyAuditPage } from "./pages/PrivacyAuditPage";
import { DriverManagerPage } from "./pages/DriverManagerPage";
import { SystemReportPage } from "./pages/SystemReportPage";
import { GamingPage } from "./pages/GamingPage";
import { GamingOverlayPage } from "./pages/GamingOverlayPage";
import { LatencyPage } from "./pages/LatencyPage";
import { GpuDriverPage } from "./pages/GpuDriverPage";
import { WslPage } from "./pages/WslPage";
import { HelpPage } from "./pages/HelpPage";
import { PrebuiltDebloatPage } from "./pages/PrebuiltDebloatPage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { ConsentModal } from "./components/ConsentModal";
import { ThemeProvider } from "./hooks/useTheme";
import { useGlobalCache } from "./hooks/useGlobalCache";
import { GlobalLoadingScreen } from "./components/GlobalLoadingScreen";
import { CommandPalette } from "./components/CommandPalette";
import { ToastProvider, useToast } from "./components/ToastSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AIAssistantChat } from "./components/AI/AIAssistantChat";
import { STORAGE_KEYS, hasItem, setItem, getString } from "./lib/storage";

// Detect if this webview is the gaming overlay window (hash set by Rust at window creation)
const IS_GAMING_OVERLAY = window.location.hash === "#gaming-overlay";

// Overlay shell — renders independently, no sidebar or chrome
function OverlayApp() {
  return (
    <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
      <GamingOverlayPage />
    </ThemeProvider>
  );
}

// Checks admin privileges once on mount and warns if not elevated.
// Must be rendered inside ToastProvider.
function AdminChecker() {
  const { addToast } = useToast();
  useEffect(() => {
    if (isTauri()) {
      invoke<boolean>("get_is_admin")
        .then((admin) => {
          if (!admin) {
            addToast({
              type: "warning",
              title: "Not running as Administrator",
              message: "WinOpt Pro requires administrator privileges for most features. Restart as Admin for full functionality.",
            });
          }
        })
        .catch((err) => {
          console.warn("[admin-check] failed:", err);
        });
    }
  }, [addToast]);
  return null;
}

// Surfaces accumulated bootErrors via toast, once, after the app has mounted.
// Boot-time IPC failures are non-fatal (we render with stale/empty caches),
// but the user should know which subsystems are degraded.
function BootErrorReporter() {
  const { addToast } = useToast();
  const bootErrors = useGlobalCache((s) => s.bootErrors);
  const clearBootErrors = useGlobalCache((s) => s.clearBootErrors);
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current || bootErrors.length === 0) return;
    reported.current = true;
    addToast({
      type: "warning",
      title: "Some system data unavailable",
      message: `Failed to load: ${bootErrors.join(", ")}. Affected pages may show empty or stale data.`,
    });
    clearBootErrors();
  }, [bootErrors, addToast, clearBootErrors]);
  return null;
}

function App() {
  const [currentView, setCurrentView] = useState("home");
  const [showConsent, setShowConsent] = useState(() => !hasItem(STORAGE_KEYS.CONSENT));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { isAppReady, setAppReady, setCacheObject, updateLoadingProgress } = useGlobalCache();
  const addBootError = useGlobalCache((s) => s.addBootError);

  // App-wide Boot Sequence
  useEffect(() => {
    if (isAppReady) return;

    // Helper: invoke, log + record on failure, return fallback so boot continues.
    async function safeInvoke<T>(cmd: string, label: string, fallback: T): Promise<T> {
      try {
        return await invoke<T>(cmd);
      } catch (err) {
        console.warn(`[boot] ${cmd} failed:`, err);
        addBootError(label);
        return fallback;
      }
    }

    async function bootSequence() {
      try {
        if (!isTauri()) {
          setTimeout(() => setAppReady(true), 1500); // Mock boot
          return;
        }

        updateLoadingProgress(10, "Fetching System Drivers...");
        setCacheObject("drivers", await safeInvoke("list_drivers", "drivers", [] as unknown[]));

        updateLoadingProgress(25, "Inspecting Network Interfaces...");
        setCacheObject("network", await safeInvoke("get_network_interfaces", "network", [] as unknown[]));

        updateLoadingProgress(40, "Checking disk health...");
        setCacheObject("storage_items", await safeInvoke("scan_junk_files", "storage scan", [] as unknown[]));
        setCacheObject("storage_health", await safeInvoke("get_disk_health", "disk health", [] as unknown[]));

        updateLoadingProgress(60, "Reticulating splines...");
        setCacheObject("wsl_status", await safeInvoke<unknown>("get_wsl_status", "WSL status", null));
        setCacheObject("wsl_config", await safeInvoke<unknown>("get_wsl_config", "WSL config", null));
        setCacheObject("wsl_setup", await safeInvoke<unknown>("get_wsl_setup_state", "WSL setup", null));

        updateLoadingProgress(75, "Overclocking progress bar...");
        setCacheObject("power_plans", await safeInvoke("get_power_plans", "power plans", [] as unknown[]));
        setCacheObject("battery_health", await safeInvoke<unknown>("get_battery_health", "battery health", null));

        updateLoadingProgress(85, "Analyzing processes...");
        setCacheObject("processes", await safeInvoke("get_processes", "processes", [] as unknown[]));

        updateLoadingProgress(95, "Syncing RGB lighting...");
        setCacheObject("startup_items", await safeInvoke("get_startup_items", "startup items", [] as unknown[]));

        updateLoadingProgress(100, "Optimization Complete.");
        setTimeout(() => setAppReady(true), 400);

      } catch (e) {
        console.error("Boot error:", e);
        addBootError("boot sequence");
        setAppReady(true);
      }
    }
    bootSequence();
  }, [isAppReady, setAppReady, setCacheObject, updateLoadingProgress, addBootError]);

  // Show onboarding only on first visit
  useEffect(() => {
    setShowOnboarding(!hasItem(STORAGE_KEYS.ONBOARDING));
  }, []);

  // Wire installer model selection on first launch
  useEffect(() => {
    const stored = getString(STORAGE_KEYS.AI_MODEL);
    if (!stored && isTauri()) {
      invoke<string | null>('read_installer_config')
        .then(model => {
          if (model) {
            // Write to localStorage before invoking to prevent race on multi-window launch
            setItem(STORAGE_KEYS.AI_MODEL, model);
            invoke('pull_model', { model }).catch((err) => {
              console.warn("[boot] pull_model failed:", err);
            });
          }
        })
        .catch((err) => {
          console.warn("[boot] read_installer_config failed:", err);
        });
    }
  }, []);

  const handleOnboardingClose = () => {
    setItem(STORAGE_KEYS.ONBOARDING, "true");
    setShowOnboarding(false);
  };

  // Global Command+K / Ctrl+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const views: Record<string, React.ReactNode> = {
    home: <HomePage setView={setCurrentView} />,
    dashboard: <Dashboard onTriggerGuide={() => setShowOnboarding(true)} setView={setCurrentView} />,
    performance: <TweaksPage categoryTitle="Performance" />,
    privacy: <TweaksPage categoryTitle="Privacy" />,
    network_tweaks: <TweaksPage categoryTitle="Network" />,
    tools: <TweaksPage categoryTitle="Tools" />,
    gaming: <TweaksPage categoryTitle="Gaming" />,
    gaming_optimizer: <GamingPage />,
    latency: <LatencyPage setView={setCurrentView} />,
    power: <TweaksPage categoryTitle="Power" />,
    security: <TweaksPage categoryTitle="Security" />,
    debloat: <TweaksPage categoryTitle="Debloat" />,
    windowsui: <TweaksPage categoryTitle="Windows UI" />,
    windowsupdate: <TweaksPage categoryTitle="Windows Update" />,
    history: <HistoryPage />,
    startup: <StartupPage />,
    storage: <StoragePage />,
    processes: <ProcessPage />,
    network: <NetworkAnalyzerPage />,
    settings: <SettingsPage onTriggerGuide={() => setShowOnboarding(true)} />,
    profiles: <ProfilesPage />,
    apps: <AppsPage setView={setCurrentView} />,
    bundles: <BundlesPage setView={setCurrentView} />,
    power_manager: <PowerPage />,
    defender: <DefenderPage />,
    privacy_audit: <PrivacyAuditPage />,
    drivers: <DriverManagerPage />,
    system_report: <SystemReportPage />,
    gpu_driver: <GpuDriverPage />,
    wsl_manager: <WslPage />,
    prebuilt_debloater: <PrebuiltDebloatPage />,
    benchmark: <BenchmarkPage />,
    help: <HelpPage />,
  };

  const handleSelectTweak = (tweak: Tweak) => {
    const categoryLower = tweak.category.toLowerCase();
    setCurrentView(categoryLower);

    // We optionally could dispatch a custom event to select the specific tweak
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cmd-select-tweak', { detail: tweak.id }));
    }, 100);
  };

  const handleConsentAccept = () => {
    setItem(STORAGE_KEYS.CONSENT, "true");
    if (isTauri()) {
      invoke('record_consent', { accepted: true }).catch((err) => {
        console.warn("[consent] record_consent failed:", err);
      });
    }
    setShowConsent(false);
  };

  const handleConsentDecline = () => {
    if (isTauri()) {
      invoke('exit_app').catch((err) => {
        console.warn("[consent] exit_app failed:", err);
      });
    } else {
      // In dev/browser mode just proceed without consent
      setShowConsent(false);
    }
  };

  if (!isAppReady) {
    return <GlobalLoadingScreen />;
  }

  if (showConsent) {
    return (
      <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
        <ConsentModal onAccept={handleConsentAccept} onDecline={handleConsentDecline} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
      <ToastProvider>
        <AdminChecker />
        <BootErrorReporter />
        <ErrorBoundary>
          <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />
          <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} onSelectTweak={handleSelectTweak} simpleOnly={true} />
          <AIAssistantChat />
          <MainLayout currentView={currentView} setView={setCurrentView} onOpenSearch={() => setShowCommandPalette(true)}>
            <ErrorBoundary>
              {views[currentView] || (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8 select-none">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-primary opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Module Under Development</h3>
                  <p className="text-[14px] text-slate-500 dark:text-slate-300 max-w-xs leading-relaxed font-medium">
                    This module is being engineered. Check back in the next release.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-600 font-mono bg-black/5 dark:bg-white/5 px-4 py-2 rounded-full border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    In progress
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </MainLayout>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

// Root: render overlay or full app depending on window context
function Root() {
  if (IS_GAMING_OVERLAY) return <OverlayApp />;
  return <App />;
}

export default Root;
