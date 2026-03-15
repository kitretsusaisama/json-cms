import { execSync } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import type { PackageManager } from "@upflame/cli-utils";

function runScriptCommand(packageManager: PackageManager, script: string): string {
  return packageManager === "npm" ? `npm run ${script}` : `${packageManager} run ${script}`;
}

export async function runPostGenerationHealthChecks(
  projectDir: string,
  packageManager: PackageManager,
  dependenciesInstalled: boolean
): Promise<void> {
  const packageJsonPath = path.join(projectDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };

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
      execSync(command, { cwd: projectDir, stdio: "inherit" });
    } catch (error) {
      throw new Error(`Post-generation health check failed: ${command}. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
