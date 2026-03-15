import { planIntegrationDependencies } from "@upflame/installer-core";
import { getPresetDefinition } from "@upflame/cli-utils";
import { frameworkRegistry } from "./framework-detection.js";
import type { FrameworkId, ProjectPreset } from "@upflame/installer-core";

export function composeTemplateDependencies(
  framework: FrameworkId,
  preset: ProjectPreset,
  plugins?: string[]
): string[] {
  return planIntegrationDependencies(framework, preset, frameworkRegistry, getPresetDefinition, plugins);
}
