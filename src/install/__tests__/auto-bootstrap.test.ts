// @vitest-environment node
import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { runAutoBootstrap } from "@/install/auto-bootstrap";

describe("runAutoBootstrap", () => {
  it("creates Next.js CMS integration files and is idempotent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", private: true, dependencies: { next: "15.5.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "app"), { recursive: true });

    const firstRun = await runAutoBootstrap({ hostDir: root });
    const secondRun = await runAutoBootstrap({ hostDir: root });

    expect(firstRun.framework).toBe("nextjs");
    expect(firstRun.created).toContain("cms.config.ts");
    expect(firstRun.created).toContain("cms/schema/page.ts");
    expect(firstRun.created).toContain("app/cms/page.tsx");
    expect(secondRun.created).toEqual([]);
    expect(secondRun.skipped).toContain("cms.config.ts");
  });

  it("injects a /cms route for Pages Router projects", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-pages-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", private: true, dependencies: { next: "15.5.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "pages"), { recursive: true });

    const result = await runAutoBootstrap({ hostDir: root });

    expect(result.framework).toBe("nextjs");
    expect(result.created).toContain("pages/cms.tsx");
    await expect(readFile(path.join(root, "pages", "cms.tsx"), "utf-8")).resolves.toContain("UpFlame CMS");
  });

  it("detects pnpm lockfiles from workspace ancestors", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "jsoncms-workspace-"));
    const hostDir = path.join(workspaceRoot, "apps", "web");
    await mkdir(path.join(hostDir, "app"), { recursive: true });
    await writeFile(path.join(workspaceRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
    await writeFile(
      path.join(hostDir, "package.json"),
      JSON.stringify({ name: "web", private: true, dependencies: { next: "15.5.0" } }, null, 2),
      "utf-8"
    );

    const result = await runAutoBootstrap({ hostDir });
    expect(result.packageManager).toBe("pnpm");
  });

  it("keeps legacy config and emits a migration warning", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", private: true, dependencies: { next: "15.5.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "app"), { recursive: true });
    await writeFile(path.join(root, "jsoncms.config.ts"), "export default {};\n", "utf-8");

    const result = await runAutoBootstrap({ hostDir: root });

    expect(result.warnings.some((warning) => warning.includes("jsoncms.config.ts"))).toBe(true);
    await expect(readFile(path.join(root, "jsoncms.config.ts"), "utf-8")).resolves.toContain("export default");
  });

  it("warns when next adapter dependency cannot be validated", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-adapter-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", private: true, dependencies: { next: "15.5.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "app"), { recursive: true });

    const result = await runAutoBootstrap({ hostDir: root });
    expect(result.warnings.some((warning) => warning.includes("@upflame/adapter-nextjs"))).toBe(true);
  });

  it("creates Astro CMS integration artifacts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-astro-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-astro", private: true, dependencies: { astro: "5.0.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "src", "pages"), { recursive: true });

    const result = await runAutoBootstrap({ hostDir: root });
    expect(result.framework).toBe("astro");
    expect(result.created).toContain("src/pages/cms.astro");
    await expect(readFile(path.join(root, "src", "pages", "cms.astro"), "utf-8")).resolves.toContain("UpFlame CMS");
  });

  it("creates Remix CMS integration artifacts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jsoncms-bootstrap-remix-"));
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-remix", private: true, dependencies: { "@remix-run/react": "2.10.0" } }, null, 2),
      "utf-8"
    );
    await mkdir(path.join(root, "app", "routes"), { recursive: true });

    const result = await runAutoBootstrap({ hostDir: root });
    expect(result.framework).toBe("remix");
    expect(result.created).toContain("app/routes/cms.tsx");
    await expect(readFile(path.join(root, "app", "routes", "cms.tsx"), "utf-8")).resolves.toContain("UpFlame CMS");
  });
});
