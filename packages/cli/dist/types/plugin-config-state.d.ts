export interface PluginProjectState {
    readonly plugins: readonly string[];
}
export declare function readPluginState(source: string): PluginProjectState;
export declare function writePluginState(source: string, state: PluginProjectState): string;
export declare function addPluginToState(source: string, pluginName: string): string;
export declare function removePluginFromState(source: string, pluginName: string): string;
//# sourceMappingURL=plugin-config-state.d.ts.map