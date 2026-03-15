"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeTemplateDependencies = composeTemplateDependencies;
const installer_core_1 = require("@upflame/installer-core");
const cli_utils_1 = require("@upflame/cli-utils");
const framework_detection_js_1 = require("./framework-detection.js");
function composeTemplateDependencies(framework, preset, plugins) {
    return (0, installer_core_1.planIntegrationDependencies)(framework, preset, framework_detection_js_1.frameworkRegistry, cli_utils_1.getPresetDefinition, plugins);
}
//# sourceMappingURL=template-composition.js.map