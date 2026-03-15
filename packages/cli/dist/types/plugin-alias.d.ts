export interface PluginAliasResolution {
    readonly input: string;
    readonly packageName: string;
    readonly usedAlias: boolean;
}
export declare function resolvePluginAlias(input: string): PluginAliasResolution;
export declare function getPluginAliasMap(): Readonly<Record<string, string>>;
//# sourceMappingURL=plugin-alias.d.ts.map