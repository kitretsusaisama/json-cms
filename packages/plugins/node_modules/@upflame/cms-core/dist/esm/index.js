const DEFAULT_FEATURES = ["content", "components", "plugins", "schema"];
export function createCmsCore(options) {
    const enabledFeatures = options.enabledFeatures ?? DEFAULT_FEATURES;
    return {
        projectName: options.projectName,
        enabledFeatures,
        hasFeature(feature) {
            return enabledFeatures.includes(feature);
        },
    };
}
//# sourceMappingURL=index.js.map