import { render, screen, fireEvent } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BundlesPage } from "@/pages/BundlesPage";
import type { Bundle, ResolvedBundle } from "@/types/bundles";

vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useBundles hook
const mockSaveCustomBundle = vi.fn();
const mockDeleteCustomBundle = vi.fn();
const mockUpdateCustomBundle = vi.fn();
const mockResolveBundle = vi.fn((b: Bundle): ResolvedBundle => ({
  ...b,
  resolvedApps: b.apps.map(appId => ({ appId, metadata: { id: appId, name: appId, description: "desc", logo: "/logo.png", license: "Free" } })),
}));
const mockSetSearchQuery = vi.fn();

const STARTERS_BUNDLE: Bundle = {
  id: "beginner-essentials", type: "curated", group: "Starters",
  name: "Beginner Essentials", description: "desc", icon: "Star", color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip"],
};
const GAMING_BUNDLE: Bundle = {
  id: "gamers-setup", type: "curated", group: "Gaming",
  name: "The Gamer's Setup", description: "desc", icon: "Gamepad2", color: "green",
  apps: ["Valve.Steam"],
};
const CUSTOM_BUNDLE: Bundle = {
  id: "custom-1", type: "custom", group: "Other",
  name: "My Custom Bundle", description: "my bundle", icon: "Star", color: "red",
  apps: ["Mozilla.Firefox"],
};

let mockUseBundlesReturn: ReturnType<typeof import("@/hooks/useBundles").useBundles>;

vi.mock("@/hooks/useBundles", () => ({
  useBundles: () => mockUseBundlesReturn,
}));

vi.mock("@/components/BundleInstallModal", () => ({
  BundleInstallModal: ({ isOpen, bundle }: any) =>
    isOpen ? <div data-testid="install-modal">{bundle.name}</div> : null,
}));

vi.mock("@/hooks/useApps", () => ({
  useApps: () => ({
    installApp: vi.fn().mockResolvedValue({ success: true, method: "winget", output: "", error: "" }),
    installedApps: {},
    checkInstalled: vi.fn(),
  }),
}));

function makeUseBundles(overrides: Partial<typeof mockUseBundlesReturn> = {}) {
  mockUseBundlesReturn = {
    curatedBundles: [STARTERS_BUNDLE, GAMING_BUNDLE],
    customBundles: [],
    saveCustomBundle: mockSaveCustomBundle,
    deleteCustomBundle: mockDeleteCustomBundle,
    updateCustomBundle: mockUpdateCustomBundle,
    resolveBundle: mockResolveBundle,
    searchQuery: "",
    setSearchQuery: mockSetSearchQuery,
    filteredBundles: [STARTERS_BUNDLE, GAMING_BUNDLE],
    ...overrides,
  } as any;
}

describe("BundlesPage", () => {
  beforeEach(() => {
    makeUseBundles();
    mockSaveCustomBundle.mockReset();
  });

  it("renders Starters group section", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Starters")).toBeInTheDocument();
  });

  it("renders Gaming group section", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Gaming")).toBeInTheDocument();
  });

  it("renders bundle cards with name and app count", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Beginner Essentials")).toBeInTheDocument();
    expect(screen.getByText("2 apps")).toBeInTheDocument();
  });

  it("shows My Bundles section when custom bundles exist", () => {
    makeUseBundles({ customBundles: [CUSTOM_BUNDLE], filteredBundles: [CUSTOM_BUNDLE, STARTERS_BUNDLE, GAMING_BUNDLE] });
    render(<BundlesPage />);
    expect(screen.getByText("My Bundles")).toBeInTheDocument();
    expect(screen.getByText("My Custom Bundle")).toBeInTheDocument();
  });

  it("does not show My Bundles section when no custom bundles", () => {
    render(<BundlesPage />);
    expect(screen.queryByText("My Bundles")).not.toBeInTheDocument();
  });

  it("search input calls setSearchQuery", () => {
    render(<BundlesPage />);
    const input = screen.getByPlaceholderText(/search bundles/i);
    fireEvent.change(input, { target: { value: "gamer" } });
    expect(mockSetSearchQuery).toHaveBeenCalledWith("gamer");
  });

  it("shows flat Search Results list when searchQuery is set", () => {
    makeUseBundles({
      searchQuery: "gamer",
      filteredBundles: [GAMING_BUNDLE],
    });
    render(<BundlesPage />);
    expect(screen.getByText("Search Results")).toBeInTheDocument();
    expect(screen.queryByText("Starters")).not.toBeInTheDocument();
  });

  it("opens install modal when Install Bundle is clicked", () => {
    render(<BundlesPage />);
    const installBtns = screen.getAllByText("Install Bundle");
    fireEvent.click(installBtns[0]);
    expect(screen.getByTestId("install-modal")).toBeInTheDocument();
  });

  it("shows create bundle panel when + Create Bundle clicked", () => {
    render(<BundlesPage />);
    fireEvent.click(screen.getByText("+ Create Bundle"));
    expect(screen.getByPlaceholderText(/bundle name/i)).toBeInTheDocument();
  });

  it("create bundle save button disabled until name and ≥1 app entered", () => {
    render(<BundlesPage />);
    fireEvent.click(screen.getByText("+ Create Bundle"));
    const saveBtn = screen.getByRole("button", { name: /save bundle/i });
    expect(saveBtn).toBeDisabled();
  });

  it("delete button on custom bundle card calls deleteCustomBundle", () => {
    makeUseBundles({ customBundles: [CUSTOM_BUNDLE], filteredBundles: [CUSTOM_BUNDLE] });
    render(<BundlesPage />);
    fireEvent.click(screen.getByTestId(`delete-bundle-${CUSTOM_BUNDLE.id}`));
    expect(mockDeleteCustomBundle).toHaveBeenCalledWith(CUSTOM_BUNDLE.id);
  });
});
