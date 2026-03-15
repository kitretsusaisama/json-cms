"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkRegistry = void 0;
exports.detectFrameworkFromProject = detectFrameworkFromProject;
const installer_core_1 = require("@upflame/installer-core");
exports.frameworkRegistry = (0, installer_core_1.createFrameworkRegistry)(installer_core_1.defaultFrameworkAdapters);
const intelligenceRegistry = (0, installer_core_1.createFrameworkRegistry)(installer_core_1.frameworkIntelligenceAdapters);
async function detectFrameworkFromProject(cwd) {
    const report = await (0, installer_core_1.inspectProjectIntelligence)(cwd);
    const top = report.frameworkCandidates[0];
    if (!top) {
        return { supported: false };
    }
    const supported = intelligenceRegistry.get(top.id)?.supported ?? false;
    return {
        detected: top.id,
        confidence: top.confidence,
        supported,
    };
}
//# sourceMappingURL=framework-detection.js.map