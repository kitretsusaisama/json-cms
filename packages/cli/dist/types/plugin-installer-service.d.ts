import type { ValidatedManifest } from "../../plugin-sdk/src/manifest";
export interface DependencyDiagnostic {
    readonly dependency: string;
    readonly expectedRange: string;
    readonly installedVersion?: string;
    readonly message: string;
    readonly remediation: string;
}
export interface PluginDoctorReport {
    readonly pluginName: string;
    readonly diagnostics: readonly DependencyDiagnostic[];
}
export interface PreparePluginRegistrationResult {
    readonly packageName: string;
    readonly aliasUsed: boolean;
    readonly manifest: ValidatedManifest;
}
export declare function preparePluginRegistration(input: string, rawManifest: unknown): PreparePluginRegistrationResult;
export declare function runPluginDoctor(manifest: ValidatedManifest, installedVersions: Readonly<Record<string, string>>): PluginDoctorReport;
//# sourceMappingURL=plugin-installer-service.d.ts.map