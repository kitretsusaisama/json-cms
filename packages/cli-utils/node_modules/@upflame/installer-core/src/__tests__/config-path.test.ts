import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_CONFIG_FILE,
  LEGACY_CONFIG_FILE,
  resolveConfigPath,
} from "../config-path";

describe("resolveConfigPath", () => {
  it("prefers canonical config when both files exist", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "installer-config-test-"));
    await writeFile(join(cwd, CANONICAL_CONFIG_FILE), "export default {};\n", "utf-8");
    await writeFile(join(cwd, LEGACY_CONFIG_FILE), "export default {};\n", "utf-8");

    const resolved = await resolveConfigPath(cwd);
    expect(resolved.source).toBe("canonical");
    expect(resolved.path).toContain(CANONICAL_CONFIG_FILE);
  });

  it("falls back to legacy config", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "installer-config-test-"));
    await writeFile(join(cwd, LEGACY_CONFIG_FILE), "export default {};\n", "utf-8");

    const resolved = await resolveConfigPath(cwd);
    expect(resolved.source).toBe("legacy");
    expect(resolved.path).toContain(LEGACY_CONFIG_FILE);
  });
});
