export type RuntimeStage = "config-loaded" | "plugins-registered" | "schema-compiled" | "started";
export interface RuntimeBootstrapOptions {
    readonly projectRoot: string;
    readonly plugins?: readonly string[];
}
export interface RuntimeBootstrapResult {
    readonly projectRoot: string;
    readonly plugins: readonly string[];
    readonly stages: readonly RuntimeStage[];
}
export declare function bootstrapRuntime(options: RuntimeBootstrapOptions): RuntimeBootstrapResult;
//# sourceMappingURL=index.d.ts.map