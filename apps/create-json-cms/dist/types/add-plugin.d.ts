export interface AddPluginOptions {
    packageManager?: "npm" | "pnpm" | "yarn" | "bun";
    configPath?: string;
    installDependencies?: boolean;
}
export declare function addPluginToProject(pluginInput: string, options?: AddPluginOptions): Promise<void>;
export declare function parseAddPluginArgs(argv: string[]): {
    plugin?: string;
    options: AddPluginOptions;
};
//# sourceMappingURL=add-plugin.d.ts.map