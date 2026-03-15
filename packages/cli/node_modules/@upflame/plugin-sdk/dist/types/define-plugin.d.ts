import type { PluginDefinition, PluginLifecycle, SdkPluginManifest } from "./types";
export declare function definePlugin(definition: {
    manifest: SdkPluginManifest;
    lifecycle: PluginLifecycle;
}): PluginDefinition;
export declare const createPlugin: typeof definePlugin;
//# sourceMappingURL=define-plugin.d.ts.map