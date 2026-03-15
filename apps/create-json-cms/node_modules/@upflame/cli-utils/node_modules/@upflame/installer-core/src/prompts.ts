import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import type { BootstrapSafetyPolicy } from "./policy/bootstrap-safety-policy";
import type { FrameworkId, PackageManager, ProjectPreset } from "./types";

export interface BootstrapPromptOptions {
  projectName: string;
  targetDir: string;
  framework: FrameworkId;
  packageManager: PackageManager;
  preset: ProjectPreset;
  includeExampleContent: boolean;
  installDependencies: boolean;
  force?: boolean;
}

function normalizeYesNo(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  return normalized === "y" || normalized === "yes";
}

export async function promptForBootstrapOptions(
  partial: Partial<BootstrapPromptOptions>,
  defaults: { packageManager: PackageManager; sanitizeProjectName: (name: string) => string; policy?: BootstrapSafetyPolicy }
): Promise<BootstrapPromptOptions> {
  defaults.policy?.assertPromptAllowed();

  const rl = createInterface({ input, output });

  try {
    const projectNameAnswer = await rl.question("Project name (default: my-json-cms): ");
    const projectName = partial.projectName ?? (projectNameAnswer || "my-json-cms");
    const frameworkInput = partial.framework
      ? partial.framework
      : ((await rl.question("Framework [nextjs] (default: nextjs): ")) || "nextjs").trim().toLowerCase();
    const presetInput = (await rl.question("Preset [blog/marketing/headless] (default: marketing): ")) || "marketing";
    const packageManagerInput =
      (await rl.question(`Package manager [npm/pnpm/yarn/bun] (default: ${defaults.packageManager}): `)) || defaults.packageManager;
    const exampleContentInput = await rl.question("Include example content? [Y/n] (default: yes): ");
    const installInput = await rl.question("Install dependencies now? [Y/n] (default: yes): ");

    return {
      projectName,
      targetDir: partial.targetDir ?? defaults.sanitizeProjectName(projectName),
      framework: (frameworkInput || "nextjs") as FrameworkId,
      preset: (presetInput.trim().toLowerCase() || "marketing") as ProjectPreset,
      packageManager: (packageManagerInput.trim().toLowerCase() || defaults.packageManager) as PackageManager,
      includeExampleContent: normalizeYesNo(exampleContentInput, true),
      installDependencies: normalizeYesNo(installInput, true),
      force: partial.force ?? false,
    };
  } finally {
    rl.close();
  }
}
