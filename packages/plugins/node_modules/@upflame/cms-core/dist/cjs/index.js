"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCmsCore = createCmsCore;
const DEFAULT_FEATURES = ["content", "components", "plugins", "schema"];
function createCmsCore(options) {
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