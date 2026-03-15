import { type DependencyDiagnostic } from "./plugin-installer-service";
export interface CliCommandContext {
    readonly cwd: string;
}
export type PluginSubcommand = "add" | "remove" | "list" | "doctor";
export interface PluginCommandResult {
    readonly command: "plugin";
    readonly subcommand: PluginSubcommand;
    readonly plugin?: string;
    readonly args: readonly string[];
    readonly cwd: string;
}
export interface CliCommandResult {
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
}
export declare function parseCliCommand(argv: readonly string[], context: CliCommandContext): CliCommandResult | PluginCommandResult;
export interface PluginExecutionInput {
    readonly subcommand: PluginSubcommand;
    readonly pluginInput?: string;
    readonly configSource: string;
    readonly manifest?: unknown;
    readonly manifestsByPackage?: Readonly<Record<string, unknown>>;
    readonly installedVersions?: Readonly<Record<string, string>>;
}
export interface PluginExecutionOutput {
    readonly nextConfigSource: string;
    readonly pluginPackages: readonly string[];
    readonly message: string;
    readonly diagnostics?: readonly DependencyDiagnostic[];
}
export declare function executePluginCommand(input: PluginExecutionInput): PluginExecutionOutput;
export * from "./plugin-alias";
export * from "./plugin-config-state";
export * from "./plugin-installer-service";
//# sourceMappingURL=index.d.ts.map