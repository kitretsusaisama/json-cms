import { access } from "fs/promises";
import path from "path";

export const CANONICAL_CONFIG_FILE = "cms.config.ts";
export const LEGACY_CONFIG_FILE = "jsoncms.config.ts";

export type ConfigPathResolutionSource = "provided" | "canonical" | "legacy";

export interface ResolvedConfigPath {
  path: string;
  source: ConfigPathResolutionSource;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveConfigPath(cwd: string, provided?: string): Promise<ResolvedConfigPath> {
  if (provided) {
    return {
      path: path.resolve(cwd, provided),
      source: "provided",
    };
  }

  const canonicalPath = path.resolve(cwd, CANONICAL_CONFIG_FILE);
  if (await exists(canonicalPath)) {
    return {
      path: canonicalPath,
      source: "canonical",
    };
  }

  const legacyPath = path.resolve(cwd, LEGACY_CONFIG_FILE);
  if (await exists(legacyPath)) {
    return {
      path: legacyPath,
      source: "legacy",
    };
  }

  throw new Error(`Could not find ${CANONICAL_CONFIG_FILE} or ${LEGACY_CONFIG_FILE} in this directory.`);
}
