import { render, screen, fireEvent, waitFor } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BundleInstallModal } from "@/components/BundleInstallModal";
import type { ResolvedBundle, AppInstallResult } from "@/types/bundles";

// framer-motion mock
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockInstallApp = vi.fn();
const mockOnClose = vi.fn();

const RESOLVED_BUNDLE: ResolvedBundle = {
  id: "test",
  type: "curated",
  group: "Starters",
  name: "Test Bundle",
  description: "desc",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip", "Unknown.App"],
  resolvedApps: [
    { appId: "Mozilla.Firefox", metadata: { id: "Mozilla.Firefox", name: "Firefox", description: "Browser", logo: "/logo.png", license: "MPL-2.0" } },
    { appId: "7zip.7zip", metadata: { id: "7zip.7zip", name: "7-Zip", description: "Archiver", logo: "/logo.png", license: "LGPL" } },
    { appId: "Unknown.App", metadata: null },
  ],
};

const SUCCESS_RESULT: AppInstallResult = { success: true, method: "winget", output: "Installed", error: "" };
const FAIL_RESULT: AppInstallResult = { success: false, method: "none", output: "", error: "Install failed" };

describe("BundleInstallModal", () => {
  beforeEach(() => {
    mockInstallApp.mockReset();
    mockOnClose.mockReset();
  });

  it("renders modal header with bundle name", () => {
    render(
      <BundleInstallModal
        bundle={RESOLVED_BUNDLE}
        isOpen={true}
        onClose={mockOnClose}
        installApp={mockInstallApp}
        installedApps={{}}
      />
    );
    expect(screen.getByText("Install: Test Bundle")).toBeInTheDocument();
  });

  it("shows app rows for resolved apps", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.getByText("Firefox")).toBeInTheDocument();
    expect(screen.getByText("7-Zip")).toBeInTheDocument();
  });

  it("shows warning badge and disables checkbox for unavailable apps", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.getByText("Unknown.App")).toBeInTheDocument();
    expect(screen.getByTestId("unavailable-Unknown.App")).toBeInTheDocument();
  });

  it("shows Installed badge for already-installed apps and excludes from count", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{ "Mozilla.Firefox": true }} />
    );
    expect(screen.getByTestId("installed-badge-Mozilla.Firefox")).toBeInTheDocument();
    expect(screen.getByText(/Install 1 app/)).toBeInTheDocument();
  });

  it("install count updates live when user ticks/unticks", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.getByText(/Install 2 apps/)).toBeInTheDocument();

    const firefoxCheckbox = screen.getByTestId("checkbox-Mozilla.Firefox");
    fireEvent.click(firefoxCheckbox);
    expect(screen.getByText(/Install 1 app/)).toBeInTheDocument();
  });

  it("expand row reveals description", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    const expandBtn = screen.getByTestId("expand-Mozilla.Firefox");
    expect(screen.queryByText("Browser")).not.toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(screen.getByText("Browser")).toBeInTheDocument();
  });

  it("clicking Install calls installApp sequentially for selected non-installed apps", async () => {
    mockInstallApp.mockResolvedValue(SUCCESS_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(mockInstallApp).toHaveBeenCalledTimes(2);
    });
    expect(mockInstallApp).toHaveBeenNthCalledWith(1, "Mozilla.Firefox", "", "Mozilla.Firefox");
    expect(mockInstallApp).toHaveBeenNthCalledWith(2, "7zip.7zip", "", "7zip.7zip");
  });

  it("shows green success status after successful install", async () => {
    mockInstallApp.mockResolvedValue(SUCCESS_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(screen.getByTestId("result-success-Mozilla.Firefox")).toBeInTheDocument();
    });
  });

  it("shows red error status after failed install", async () => {
    mockInstallApp.mockResolvedValue(FAIL_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(screen.getByTestId("result-error-Mozilla.Firefox")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("does not render when isOpen is false", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={false} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.queryByText("Install: Test Bundle")).not.toBeInTheDocument();
  });
});
