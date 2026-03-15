import { detectPackageManager, sanitizeProjectName } from "@upflame/cli-utils";
import { promptForBootstrapOptions } from "@upflame/installer-core";
import type { CreateJsonCmsOptions } from "./types.js";

export async function promptForOptions(partial: Partial<CreateJsonCmsOptions>): Promise<CreateJsonCmsOptions> {
  const packageManager = partial.packageManager ?? await detectPackageManager(process.cwd());
  return promptForBootstrapOptions(partial, { packageManager, sanitizeProjectName });
}
