import { access } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const DATA_ROOT_ENV = "DATA_DIR";
const CANONICAL_DATA_DIR = "data";
const LEGACY_DATA_DIR = path.join("src", "data");

function resolveMaybeRelative(rootDir: string, value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

export function getCanonicalDataRoot(rootDir = process.cwd()): string {
  const configured = process.env[DATA_ROOT_ENV];
  if (configured) {
    return resolveMaybeRelative(rootDir, configured);
  }

  const canonical = path.resolve(rootDir, CANONICAL_DATA_DIR);
  if (existsSync(canonical)) {
    return canonical;
  }

  const legacy = path.resolve(rootDir, LEGACY_DATA_DIR);
  if (existsSync(legacy)) {
    return legacy;
  }

  return canonical;
}

export function getLegacyDataRoot(rootDir = process.cwd()): string {
  return path.resolve(rootDir, LEGACY_DATA_DIR);
}

export function getReadableDataRoots(rootDir = process.cwd()): string[] {
  const canonical = getCanonicalDataRoot(rootDir);
  const legacy = getLegacyDataRoot(rootDir);
  const roots = [canonical];

  if (legacy !== canonical && existsSync(legacy)) {
    roots.push(legacy);
  }

  return roots;
}

export function getCanonicalDataPath(...segments: string[]): string {
  return path.join(getCanonicalDataRoot(), ...segments);
}

export async function findExistingDataPath(...segments: string[]): Promise<string | null> {
  for (const root of getReadableDataRoots()) {
    const candidate = path.join(root, ...segments);

    try {
      await access(candidate);
      return candidate;
    } catch {
      // Keep searching.
    }
  }

  return null;
}

export function getPreferredWritePath(...segments: string[]): string {
  return path.join(getCanonicalDataRoot(), ...segments);
}

export function getRelativeSlugFromPath(baseDir: string, filePath: string): string {
  const relative = path.relative(baseDir, filePath);
  return relative.replace(/\\/g, "/").replace(/\.json$/i, "");
}
