import { access } from "fs/promises";
import path from "path";
import type { PackageManager } from "./types";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  if (await exists(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await exists(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }

  if (await exists(path.join(cwd, "bun.lockb")) || await exists(path.join(cwd, "bun.lock"))) {
    return "bun";
  }

  return "npm";
}

export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn install";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
}
