import type { ProjectManifestOptions } from "./types";
export declare function sanitizeProjectName(input: string): string;
export declare function toPackageName(input: string): string;
export declare function buildProjectManifest(options: ProjectManifestOptions): Record<string, unknown>;
export declare function renderCmsConfig(presetId: ProjectManifestOptions["preset"], pluginPackages?: string[], framework?: ProjectManifestOptions["framework"]): string;
//# sourceMappingURL=project.d.ts.map