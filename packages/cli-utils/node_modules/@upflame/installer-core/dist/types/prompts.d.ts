import type { BootstrapSafetyPolicy } from "./policy/bootstrap-safety-policy";
import type { FrameworkId, PackageManager, ProjectPreset } from "./types";
export interface BootstrapPromptOptions {
    projectName: string;
    targetDir: string;
    framework: FrameworkId;
    packageManager: PackageManager;
    preset: ProjectPreset;
    includeExampleContent: boolean;
    installDependencies: boolean;
    force?: boolean;
}
export declare function promptForBootstrapOptions(partial: Partial<BootstrapPromptOptions>, defaults: {
    packageManager: PackageManager;
    sanitizeProjectName: (name: string) => string;
    policy?: BootstrapSafetyPolicy;
}): Promise<BootstrapPromptOptions>;
//# sourceMappingURL=prompts.d.ts.map