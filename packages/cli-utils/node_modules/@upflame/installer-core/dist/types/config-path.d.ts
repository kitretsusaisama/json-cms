export declare const CANONICAL_CONFIG_FILE = "cms.config.ts";
export declare const LEGACY_CONFIG_FILE = "jsoncms.config.ts";
export type ConfigPathResolutionSource = "provided" | "canonical" | "legacy";
export interface ResolvedConfigPath {
    path: string;
    source: ConfigPathResolutionSource;
}
export declare function resolveConfigPath(cwd: string, provided?: string): Promise<ResolvedConfigPath>;
//# sourceMappingURL=config-path.d.ts.map