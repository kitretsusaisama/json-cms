// @vitest-environment node
import { mkdtemp, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { resolveProjectAdapter, scanProject } from "@/adapters/project-detection";

describe("project-detection", () => {
  it("detects pnpm before npm via lockfile precedence", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "project-detection-"));
    await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "demo", private: true }, null, 2), "utf-8");
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
    await writeFile(path.join(root, "package-lock.json"), "{}", "utf-8");

    const scan = await scanProject(root);
    expect(scan.packageManager).toBe("pnpm");
  });

  it("detects Next.js adapter from dependencies and app router signals", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "project-detection-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", private: true, dependencies: { next: "15.5.0", react: "18.3.1" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "app"), { recursive: true });
    await writeFile(path.join(root, "next.config.ts"), "export default {};\n", "utf-8");

    const scan = await scanProject(root);
    const resolved = resolveProjectAdapter(scan);

    expect(resolved.id).toBe("nextjs");
    expect(resolved.confidence).toBeGreaterThan(80);
    expect(resolved.evidence.some((evidence) => evidence.includes("dependency:next"))).toBe(true);
  });
});
