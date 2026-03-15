import type { ValidatedManifest } from "@upflame/plugin-sdk";
import { validateManifest, semverSatisfies } from "@upflame/plugin-sdk";
import { resolvePluginAlias } from "./plugin-alias";

export interface DependencyDiagnostic {
  readonly dependency: string;
  readonly expectedRange: string;
  readonly installedVersion?: string;
  readonly message: string;
  readonly remediation: string;
}

export interface PluginDoctorReport {
  readonly pluginName: string;
  readonly diagnostics: readonly DependencyDiagnostic[];
}

export interface PreparePluginRegistrationResult {
  readonly packageName: string;
  readonly aliasUsed: boolean;
  readonly manifest: ValidatedManifest;
}

export function preparePluginRegistration(input: string, rawManifest: unknown): PreparePluginRegistrationResult {
  const resolved = resolvePluginAlias(input);
  const result = validateManifest(rawManifest);

  if (!result.valid || !result.manifest) {
    throw new Error(`Invalid plugin manifest for ${resolved.packageName}:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  if (result.manifest.name !== resolved.packageName) {
    throw new Error(
      `Plugin manifest name mismatch: expected ${resolved.packageName} but found ${result.manifest.name}. ` +
      "Use the package that matches plugin.json `name` or update the alias input."
    );
  }

  return {
    packageName: resolved.packageName,
    aliasUsed: resolved.usedAlias,
    manifest: result.manifest,
  };
}

export function runPluginDoctor(manifest: ValidatedManifest, installedVersions: Readonly<Record<string, string>>): PluginDoctorReport {
  const checks = {
    ...(manifest.peerDependencies ?? {}),
    ...(manifest.dependencies ?? {}),
  };

  const diagnostics: DependencyDiagnostic[] = [];

  for (const [dependency, expectedRange] of Object.entries(checks)) {
    const installedVersion = installedVersions[dependency];
    if (!installedVersion) {
      diagnostics.push({
        dependency,
        expectedRange,
        installedVersion,
        message: `Missing dependency ${dependency} required by ${manifest.name}.`,
        remediation: `Install with: npm install ${dependency}@\"${expectedRange}\"`,
      });
      continue;
    }

    if (!semverSatisfies(installedVersion, expectedRange)) {
      diagnostics.push({
        dependency,
        expectedRange,
        installedVersion,
        message: `Installed ${dependency}@${installedVersion} does not satisfy ${expectedRange}.`,
        remediation: `Update with: npm install ${dependency}@\"${expectedRange}\"`,
      });
    }
  }

  return {
    pluginName: manifest.name,
    diagnostics,
  };
}
