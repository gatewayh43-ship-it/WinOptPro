import type { AppInstallResult } from "@/hooks/useApps";
export type { AppInstallResult };

export interface Bundle {
  id: string;
  type: "persona" | "curated" | "custom";
  group: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  apps: string[];
  createdAt?: string;
}

export interface AppMetadata {
  id: string;
  name: string;
  publisher?: string;
  author?: string;
  description: string;
  version?: string;
  license?: string;
  logo: string;
  website?: string;
  support_url?: string;
  github_link?: string;
  is_verified?: boolean;
  trust_score?: number;
  rating?: number;
  reviews?: Array<{ author: string; rating: number; text: string; date: string }>;
  insights?: { pros: string[]; cons: string[] };
}

export interface ResolvedBundle extends Bundle {
  resolvedApps: Array<{
    appId: string;
    metadata: AppMetadata | null;
  }>;
}

export interface BundleInstallModalProps {
  bundle: ResolvedBundle;
  isOpen: boolean;
  onClose: () => void;
  installApp: (wingetId: string, chocoId: string, appId: string) => Promise<AppInstallResult>;
  installedApps: Record<string, boolean>;
}
