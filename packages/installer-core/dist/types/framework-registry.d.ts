import type { FrameworkAdapter, FrameworkId, PackageManager } from "./types";
export interface FrameworkRegistry {
    register(adapter: FrameworkAdapter): void;
    get(id: string): FrameworkAdapter | undefined;
    list(): FrameworkAdapter[];
}
export interface FrameworkDetectionCandidate {
    id: FrameworkId | (string & {});
    packageName: string;
    supported: boolean;
    capabilities: string[];
    score: number;
    confidence: number;
    matches: {
        dependencies: string[];
        configFiles: string[];
        directories: string[];
        scripts: string[];
    };
}
export interface WorkspaceTopology {
    monorepo: boolean;
    kind: "single" | "pnpm-workspace" | "turborepo" | "nx" | "lerna" | "workspaces";
    rootDir: string;
    signals: string[];
}
export interface ProjectIntelligenceReport {
    cwd: string;
    packageManager: PackageManager;
    workspace: WorkspaceTopology;
    frameworkCandidates: FrameworkDetectionCandidate[];
    detectedFramework?: FrameworkId;
}
export declare function createFrameworkRegistry(initial?: FrameworkAdapter[]): FrameworkRegistry;
export declare const defaultFrameworkAdapters: FrameworkAdapter[];
export declare const frameworkIntelligenceAdapters: FrameworkAdapter[];
export declare function detectFrameworkFromDependencies(cwd: string, registry?: FrameworkRegistry): Promise<FrameworkId | undefined>;
export declare function detectWorkspaceTopology(cwd: string): Promise<WorkspaceTopology>;
export declare function detectPackageManager(cwd: string): Promise<PackageManager>;
export declare function scoreFrameworkCandidates(cwd: string, registry?: FrameworkRegistry): Promise<FrameworkDetectionCandidate[]>;
export declare function detectFrameworkFromSignals(cwd: string, registry?: FrameworkRegistry, options?: {
    supportedOnly?: boolean;
    minScore?: number;
}): Promise<FrameworkId | undefined>;
export declare function inspectProjectIntelligence(cwd: string): Promise<ProjectIntelligenceReport>;
//# sourceMappingURL=framework-registry.d.ts.map