"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planIntegrationDependencies = planIntegrationDependencies;
function planIntegrationDependencies(framework, preset, registry, getPresetDefinition, pluginPackages) {
    const adapter = registry.get(framework);
    if (!adapter) {
        throw new Error(`Unsupported framework: ${framework}`);
    }
    const presetDefinition = getPresetDefinition(preset);
    const resolvedPlugins = pluginPackages?.length ? pluginPackages : presetDefinition.plugins;
    const invalidPlugin = resolvedPlugins.find((plugin) => !plugin.startsWith("@upflame/plugin-"));
    if (invalidPlugin) {
        throw new Error(`Invalid plugin package '${invalidPlugin}'. Plugins must start with @upflame/plugin-.`);
    }
    const seen = new Set();
    return ["@upflame/json-cms", adapter.packageName, ...resolvedPlugins].filter((dependency) => {
        if (seen.has(dependency)) {
            return false;
        }
        seen.add(dependency);
        return true;
    });
}
//# sourceMappingURL=dependency-planner.js.map