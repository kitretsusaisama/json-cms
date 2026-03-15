export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type ProjectPreset = "blog" | "marketing" | "headless";
export type FrameworkId = "nextjs" | "astro" | "remix" | "vite" | "react" | "express" | "node";
export interface PresetDefinition {
    id: ProjectPreset;
    label: string;
    description: string;
    plugins: string[];
}
export interface ProjectManifestOptions {
    packageName: string;
    preset: ProjectPreset;
    framework: FrameworkId;
}
export interface FrameworkAdapter {
    id: FrameworkId | (string & {});
    packageName: string;
    detectDependencies: string[];
    detectConfigFiles?: string[];
    detectDirectories?: string[];
    detectScripts?: string[];
    supported?: boolean;
    capabilities?: string[];
}
//# sourceMappingURL=types.d.ts.map