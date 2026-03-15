import type { FrameworkRegistry } from "./framework-registry";
import type { PresetDefinition, ProjectPreset } from "./types";
export declare function planIntegrationDependencies(framework: string, preset: ProjectPreset, registry: FrameworkRegistry, getPresetDefinition: (preset: ProjectPreset) => PresetDefinition, pluginPackages?: string[]): string[];
//# sourceMappingURL=dependency-planner.d.ts.map