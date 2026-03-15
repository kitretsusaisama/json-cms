import { detectPackageManager, sanitizeProjectName } from "@upflame/cli-utils";
import { promptForBootstrapOptions } from "@upflame/installer-core";
export async function promptForOptions(partial) {
    const packageManager = partial.packageManager ?? await detectPackageManager(process.cwd());
    return promptForBootstrapOptions(partial, { packageManager, sanitizeProjectName });
}
//# sourceMappingURL=prompt.js.map