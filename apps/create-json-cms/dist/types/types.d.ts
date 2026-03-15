import type { FrameworkId, PackageManager, ProjectPreset } from "@upflame/installer-core";
export interface CreateJsonCmsOptions {
    projectName: string;
    targetDir: string;
    framework: FrameworkId;
    packageManager: PackageManager;
    preset: ProjectPreset;
    plugins?: string[];
    includeExampleContent: boolean;
    installDependencies: boolean;
    force?: boolean;
}
//# sourceMappingURL=types.d.ts.map