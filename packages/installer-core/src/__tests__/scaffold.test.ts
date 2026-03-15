import { mkdtemp, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { scaffoldDataDirectory } from "../scaffold";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("scaffoldDataDirectory", () => {
  it("does not write files in CI when --apply is not explicitly passed", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "scaffold-test-"));
    const created = await scaffoldDataDirectory(rootDir, "data", { ci: true, applyExplicitlyRequested: false });

    expect(created).toEqual([]);
    expect(await exists(join(rootDir, "data", "pages", "home.json"))).toBe(false);
  });

  it("writes files when apply is explicitly requested", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "scaffold-test-"));
    const created = await scaffoldDataDirectory(rootDir, "data", { ci: true, applyExplicitlyRequested: true });

    expect(created).toContain("data/pages/home.json");
    expect(await exists(join(rootDir, "data", "pages", "home.json"))).toBe(true);
  });
});
