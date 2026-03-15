"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptForOptions = promptForOptions;
const cli_utils_1 = require("@upflame/cli-utils");
const installer_core_1 = require("@upflame/installer-core");
async function promptForOptions(partial) {
    const packageManager = partial.packageManager ?? await (0, cli_utils_1.detectPackageManager)(process.cwd());
    return (0, installer_core_1.promptForBootstrapOptions)(partial, { packageManager, sanitizeProjectName: cli_utils_1.sanitizeProjectName });
}
//# sourceMappingURL=prompt.js.map