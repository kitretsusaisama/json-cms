export function bootstrapRuntime(options) {
    const plugins = options.plugins ?? [];
    return {
        projectRoot: options.projectRoot,
        plugins,
        stages: ["config-loaded", "plugins-registered", "schema-compiled", "started"],
    };
}
//# sourceMappingURL=index.js.map