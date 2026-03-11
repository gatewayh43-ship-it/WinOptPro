import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { AppDetailsPage } from "@/pages/AppDetailsPage";
import { useSmartStore } from "@/hooks/useSmartStore";

const mockGetAppDetails = vi.fn();
const mockScrapeMeta = null;

const mockAppInfo = {
    id: "Google.Chrome",
    name: "Google Chrome",
    publisher: "Google LLC",
    description: "Chrome is the official web browser from Google.",
    homepage: "https://www.google.com/",
    version: "120.0.0.0",
    tags: ["browser", "web"],
};

vi.mock("@/hooks/useSmartStore", () => ({
    useSmartStore: vi.fn(() => ({
        getAppDetails: mockGetAppDetails,
        appInfo: mockAppInfo,
        scrapeMeta: mockScrapeMeta,
        isLoadingInfo: false,
        isSearching: false,
        searchResults: [],
        searchError: null,
        searchApps: vi.fn(),
    })),
}));

const mockStore = {
    appliedTweaks: [],
    userSettings: { expertModeEnabled: false, aiAssistantEnabled: false },
    tweakFilterRisk: "All",
    tweakFilterCategory: "All",
    tweakSearchQuery: "",
    updateSettings: vi.fn(),
    setTweakFilter: vi.fn(),
    addAppliedTweak: vi.fn(),
    removeAppliedTweak: vi.fn(),
};

vi.mock("@/store/appStore", () => ({
    useAppStore: vi.fn((sel?: (s: any) => any) => {
        if (typeof sel === "function") return sel(mockStore);
        return mockStore;
    }),
}));

describe("AppDetailsPage", () => {
    const onBack = vi.fn();

    beforeEach(() => {
        onBack.mockReset();
        mockGetAppDetails.mockReset();
    });

    it("renders the app name in the header", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        expect(await screen.findByText("Google Chrome")).toBeInTheDocument();
    });

    it("displays the publisher / author", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        expect(await screen.findByText(/by Google LLC/i)).toBeInTheDocument();
    });

    it("displays the app version in the header area", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        // Find app name first to ensure render
        await screen.findByText("Google Chrome");
        // The component uses static app_metadata.json for Google.Chrome; version is from that data
        const versionSpan = document.querySelector(".font-mono.text-primary\\/80");
        expect(versionSpan).toBeTruthy();
        // Version span should contain a version number
        expect(versionSpan?.textContent).toMatch(/v\d+\.\d+/);
    });

    it("shows the About section with the app description", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        expect(await screen.findByText(/About Google Chrome/i)).toBeInTheDocument();
        expect(screen.getByText(/Chrome is the official web browser/i)).toBeInTheDocument();
    });

    it("shows Install Now button", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        expect(await screen.findByRole("button", { name: /Install Now/i })).toBeInTheDocument();
    });

    it("clicking the back button calls onBack", async () => {
        const user = setupUser();
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        await screen.findByText("Google Chrome");
        await user.click(screen.getByRole("button", { name: "" }).closest("button") ?? screen.getAllByRole("button")[0]);
        // The ArrowLeft back button is the first button in the header
        const buttons = screen.getAllByRole("button");
        await user.click(buttons[0]);
        expect(onBack).toHaveBeenCalled();
    });

    it("shows Official Links section with homepage link", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        expect(await screen.findByText("Official Website")).toBeInTheDocument();
        expect(screen.getByText("https://www.google.com/")).toBeInTheDocument();
    });

    it("shows loading spinner when data is loading", () => {
        vi.mocked(useSmartStore).mockReturnValueOnce({
            getAppDetails: mockGetAppDetails,
            appInfo: null,
            scrapeMeta: null,
            isLoadingInfo: true,
            isSearching: false,
            searchResults: [],
            searchError: null,
            searchApps: vi.fn(),
        });
        render(<AppDetailsPage appId="SomeApp" appName="Some App" onBack={onBack} />);
        expect(screen.getByText(/Fetching deep metadata/i)).toBeInTheDocument();
    });

    it("tags are rendered as hashtag pills", async () => {
        render(<AppDetailsPage appId="Google.Chrome" appName="Google Chrome" onBack={onBack} />);
        await screen.findByText("Google Chrome");
        // When using static data, tags are ["curated", "fast-load"]
        expect(screen.getByText("#curated")).toBeInTheDocument();
    });
});
