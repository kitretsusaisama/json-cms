import { planIntegrationDependencies } from "@upflame/installer-core";
import { getPresetDefinition } from "@upflame/cli-utils";
import { frameworkRegistry } from "./framework-detection.js";
export function composeTemplateDependencies(framework, preset, plugins) {
    return planIntegrationDependencies(framework, preset, frameworkRegistry, getPresetDefinition, plugins);
}
//# sourceMappingURL=template-composition.js.map