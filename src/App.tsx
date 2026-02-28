import React, { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { TweaksPage } from "./pages/TweaksPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { StartupPage } from "./pages/StartupPage";
import { StoragePage } from "./pages/StoragePage";
import { ProcessPage } from "./pages/ProcessPage";
import { NetworkAnalyzerPage } from "./pages/NetworkAnalyzerPage";
import { AppsPage } from "./pages/AppsPage";
import { PowerPage } from "./pages/PowerPage";
import { DefenderPage } from "./pages/DefenderPage";
import { PrivacyAuditPage } from "./pages/PrivacyAuditPage";
import { DriverManagerPage } from "./pages/DriverManagerPage";
import { SystemReportPage } from "./pages/SystemReportPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { ThemeProvider } from "./hooks/useTheme";
import { CommandPalette } from "./components/CommandPalette";
import { ToastProvider } from "./components/ToastSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AIAssistantChat } from "./components/AI/AIAssistantChat";

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Show onboarding only on first visit
  useEffect(() => {
    setShowOnboarding(!localStorage.getItem("onboardingComplete"));
  }, []);

  const handleOnboardingClose = () => {
    localStorage.setItem("onboardingComplete", "true");
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
    dashboard: <Dashboard onTriggerGuide={() => setShowOnboarding(true)} setView={setCurrentView} />,
    performance: <TweaksPage categoryTitle="Performance" />,
    privacy: <TweaksPage categoryTitle="Privacy" />,
    network_tweaks: <TweaksPage categoryTitle="Network" />,
    tools: <TweaksPage categoryTitle="Tools" />,
    gaming: <TweaksPage categoryTitle="Gaming" />,
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
    settings: <SettingsPage />,
    profiles: <ProfilesPage />,
    apps: <AppsPage />,
    power_manager: <PowerPage />,
    defender: <DefenderPage />,
    privacy_audit: <PrivacyAuditPage />,
    drivers: <DriverManagerPage />,
    system_report: <SystemReportPage />,
  };

  const handleSelectTweak = (tweak: any) => {
    const categoryLower = tweak.category.toLowerCase();
    setCurrentView(categoryLower);

    // We optionally could dispatch a custom event to select the specific tweak
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cmd-select-tweak', { detail: tweak.id }));
    }, 100);
  };

  return (
    <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
      <ToastProvider>
        <ErrorBoundary>
          <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />
          <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} onSelectTweak={handleSelectTweak} />
          <AIAssistantChat />
          <MainLayout currentView={currentView} setView={setCurrentView}>
            <ErrorBoundary>
              {views[currentView] || (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8 select-none">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-primary opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Module Under Development</h3>
                  <p className="text-[14px] text-slate-500 max-w-xs leading-relaxed font-medium">
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

export default App;
