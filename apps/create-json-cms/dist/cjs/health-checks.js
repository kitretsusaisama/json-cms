"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPostGenerationHealthChecks = runPostGenerationHealthChecks;
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
function runScriptCommand(packageManager, script) {
    return packageManager === "npm" ? `npm run ${script}` : `${packageManager} run ${script}`;
}
async function runPostGenerationHealthChecks(projectDir, packageManager, dependenciesInstalled) {
    const packageJsonPath = path_1.default.join(projectDir, "package.json");
    const packageJson = JSON.parse(await (0, promises_1.readFile)(packageJsonPath, "utf-8"));
    const scripts = packageJson.scripts ?? {};
    const missingScripts = ["typecheck", "build"].filter((script) => !scripts[script]);
    if (missingScripts.length > 0) {
        throw new Error(`Generated project is missing required scripts: ${missingScripts.join(", ")}`);
    }
    if (!dependenciesInstalled) {
        console.log("\nHealth checks skipped (dependencies not installed). Run these commands after installing dependencies:");
        console.log(`  ${runScriptCommand(packageManager, "typecheck")}`);
        console.log(`  ${runScriptCommand(packageManager, "build")}`);
        return;
    }
    const checks = ["typecheck", "build"];
    for (const check of checks) {
        const command = runScriptCommand(packageManager, check);
        try {
            (0, child_process_1.execSync)(command, { cwd: projectDir, stdio: "inherit" });
        }
        catch (error) {
            throw new Error(`Post-generation health check failed: ${command}. ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=health-checks.js.map