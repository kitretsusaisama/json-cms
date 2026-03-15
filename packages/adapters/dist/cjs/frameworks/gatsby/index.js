"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatsbyAdapterDescriptor = void 0;
exports.createGatsbyAdapterPlaceholder = createGatsbyAdapterPlaceholder;
exports.gatsbyAdapterDescriptor = {
    id: "gatsby",
    framework: "gatsby",
    packageName: "@upflame/adapters",
    displayName: "Gatsby Adapter",
    versionRange: ">=5.0.0",
    capabilities: ["ssr", "ssg", "preview", "component-hydration"],
    entrypoint: "@upflame/adapters/gatsby",
};
function createGatsbyAdapterPlaceholder() {
    return {
        status: "planned",
        message: "Gatsby adapter implementation is scaffolded but not yet published.",
    };
}
//# sourceMappingURL=index.js.map