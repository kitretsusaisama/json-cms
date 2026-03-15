import type { FrameworkRegistry } from "./framework-registry";
import type { PresetDefinition, ProjectPreset } from "./types";

export function planIntegrationDependencies(
  framework: string,
  preset: ProjectPreset,
  registry: FrameworkRegistry,
  getPresetDefinition: (preset: ProjectPreset) => PresetDefinition,
  pluginPackages?: string[]
): string[] {
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

  const seen = new Set<string>();
  return ["@upflame/json-cms", adapter.packageName, ...resolvedPlugins].filter((dependency) => {
    if (seen.has(dependency)) {
      return false;
    }
    seen.add(dependency);
    return true;
  });
}
