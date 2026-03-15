"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForBootstrapOptions = promptForBootstrapOptions;
const promises_1 = require("readline/promises");
const process_1 = require("process");
function normalizeYesNo(value, defaultValue) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return defaultValue;
    }
    return normalized === "y" || normalized === "yes";
}
async function promptForBootstrapOptions(partial, defaults) {
    defaults.policy?.assertPromptAllowed();
    const rl = (0, promises_1.createInterface)({ input: process_1.stdin, output: process_1.stdout });
    try {
        const projectNameAnswer = await rl.question("Project name (default: my-json-cms): ");
        const projectName = partial.projectName ?? (projectNameAnswer || "my-json-cms");
        const frameworkInput = partial.framework
            ? partial.framework
            : ((await rl.question("Framework [nextjs] (default: nextjs): ")) || "nextjs").trim().toLowerCase();
        const presetInput = (await rl.question("Preset [blog/marketing/headless] (default: marketing): ")) || "marketing";
        const packageManagerInput = (await rl.question(`Package manager [npm/pnpm/yarn/bun] (default: ${defaults.packageManager}): `)) || defaults.packageManager;
        const exampleContentInput = await rl.question("Include example content? [Y/n] (default: yes): ");
        const installInput = await rl.question("Install dependencies now? [Y/n] (default: yes): ");
        return {
            projectName,
            targetDir: partial.targetDir ?? defaults.sanitizeProjectName(projectName),
            framework: (frameworkInput || "nextjs"),
            preset: (presetInput.trim().toLowerCase() || "marketing"),
            packageManager: (packageManagerInput.trim().toLowerCase() || defaults.packageManager),
            includeExampleContent: normalizeYesNo(exampleContentInput, true),
            installDependencies: normalizeYesNo(installInput, true),
            force: partial.force ?? false,
        };
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=prompts.js.map