import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import AppMetadata from "../data/app_metadata.json";

export interface WingetSearchResult {
    id: string;
    name: string;
    version: string;
    matchType: string;
}

export interface WingetAppInfo {
    id: string;
    name: string;
    publisher: string;
    description: string;
    homepage: string;
    version: string;
    tags: string[];
}

export interface AppScrapeMetadata {
    screenshots: string[];
    githubUrl: string | null;
    socialLinks: string[];
    alternativeDownloads: string[];
}

export function useSmartStore() {
    const { userSettings } = useAppStore();
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<WingetSearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [appInfo, setAppInfo] = useState<WingetAppInfo | null>(null);
    const [scrapeMeta, setScrapeMeta] = useState<AppScrapeMetadata | null>(null);

    const searchApps = useCallback(async (query: string, smartSearch: boolean = false) => {
        if (!isTauri() || !query.trim()) {
            setSearchResults([]);
            return [];
        }

        setIsSearching(true);
        setSearchError(null);
        try {
            let actualQuery = query;

            // TODO: Implement actual SMART search (call local AI to translate query)
            if (smartSearch && userSettings.aiAssistantEnabled) {
                // Here we would call Ollama to get the actual winget query
                console.log("SMART Search enabled, parsing query with AI...", query);
            }

            const results = await invoke<WingetSearchResult[]>("search_winget", { query: actualQuery });

            // Filter out empty names or generic SDKs to clean up the output
            const filtered = results.filter(r =>
                r.name &&
                r.id &&
                !r.name.includes("SDK") &&
                !r.id.includes("Tools")
            ).slice(0, 30); // limit to 30 for performance

            setSearchResults(filtered);
            return filtered;
        } catch (e) {
            console.error("Winget search failed", e);
            setSearchError(String(e));
            return [];
        } finally {
            setIsSearching(false);
        }
    }, [userSettings.aiAssistantEnabled]);

    const getAppDetails = useCallback(async (id: string, name: string) => {
        // 1. Check Offline App Metadata bundle first
        const staticData = (AppMetadata.apps as Record<string, any>)[id];
        if (staticData) {
            const bundledInfo: WingetAppInfo = {
                id: staticData.id,
                name: staticData.name,
                publisher: staticData.publisher,
                description: staticData.description,
                homepage: staticData.website || "",
                version: staticData.version,
                tags: staticData.is_verified ? ["verified", "top-app"] : []
            };
            const bundledMeta: AppScrapeMetadata = {
                screenshots: [],
                githubUrl: null,
                socialLinks: [],
                alternativeDownloads: []
            };
            setAppInfo(bundledInfo);
            setScrapeMeta(bundledMeta);
            return bundledInfo;
        }

        // 2. Check durable local storage cache
        try {
            const cachedInfo = localStorage.getItem(`appcache_info_${id}`);
            const cachedMeta = localStorage.getItem(`appcache_meta_${id}`);
            if (cachedInfo) {
                const parsedInfo = JSON.parse(cachedInfo);
                setAppInfo(parsedInfo);
                if (cachedMeta) setScrapeMeta(JSON.parse(cachedMeta));
                return parsedInfo;
            }
        } catch (e) {
            console.warn("Local cache corrupt", e);
        }

        if (!isTauri()) return null;

        setIsLoadingInfo(true);
        setAppInfo(null);
        setScrapeMeta(null);

        try {
            const info = await invoke<WingetAppInfo>("get_winget_info", { id });
            setAppInfo(info);
            localStorage.setItem(`appcache_info_${id}`, JSON.stringify(info));

            // Background fetch the scraped data
            invoke<AppScrapeMetadata>("scrape_app_metadata", {
                appName: name || info.name,
                publisher: info.publisher || "",
                homepage: info.homepage || ""
            }).then(meta => {
                setScrapeMeta(meta);
                localStorage.setItem(`appcache_meta_${id}`, JSON.stringify(meta));
            }).catch(console.error);

            return info;
        } catch (e) {
            console.error("Failed to fetch app details", e);
            return null;
        } finally {
            setIsLoadingInfo(false);
        }
    }, []);

    return {
        isSearching,
        searchResults,
        searchError,
        searchApps,

        isLoadingInfo,
        appInfo,
        scrapeMeta,
        getAppDetails
    };
}
