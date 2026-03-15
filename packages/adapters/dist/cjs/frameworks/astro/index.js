"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astroAdapterDescriptor = void 0;
exports.createAstroAdapterPlaceholder = createAstroAdapterPlaceholder;
exports.astroAdapterDescriptor = {
    id: "astro",
    framework: "astro",
    packageName: "@upflame/adapters",
    displayName: "Astro Adapter",
    versionRange: ">=4.0.0",
    capabilities: ["ssr", "ssg", "isr", "component-hydration"],
    entrypoint: "@upflame/adapters/astro",
};
function createAstroAdapterPlaceholder() {
    return {
        status: "planned",
        message: "Astro adapter implementation is scaffolded but not yet published.",
    };
}
//# sourceMappingURL=index.js.map