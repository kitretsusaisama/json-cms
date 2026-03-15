import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { createProject } from "../create-project";
import { addIntegrationToProject } from "../add-integration";
import { LEGACY_CONFIG_FILE } from "@upflame/installer-core";

const packageManagers = ["npm", "pnpm", "yarn", "bun"] as const;

describe("create-json-cms fixtures", () => {
  it("supports explicit plugin overrides", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "create-json-cms-plugins-"));
    const targetDir = path.join(tempRoot, "plugin-override");

    await createProject({
      projectName: "Plugin Override",
      targetDir,
      framework: "nextjs",
      packageManager: "pnpm",
      preset: "marketing",
      plugins: ["@upflame/plugin-media"],
      includeExampleContent: true,
      installDependencies: false,
    });

    const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
      dependencies: Record<string, string>;
    };
    const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");

    expect(pkg.dependencies["@upflame/plugin-media"]).toBe("latest");
    expect(pkg.dependencies["@upflame/plugin-seo"]).toBeUndefined();
    expect(cmsConfig).toContain("@upflame/plugin-media");
  });

  it("scaffolds an astro project with cms route and config", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "create-json-cms-astro-"));
    const targetDir = path.join(tempRoot, "astro-site");

    await createProject({
      projectName: "Astro Site",
      targetDir,
      framework: "astro",
      packageManager: "pnpm",
      preset: "marketing",
      includeExampleContent: true,
      installDependencies: false,
    });

    const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
      dependencies: Record<string, string>;
    };
    const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
    const cmsRoute = await readFile(path.join(targetDir, "src", "pages", "cms.astro"), "utf-8");

    expect(pkg.dependencies["@upflame/json-cms"]).toBe("latest");
    expect(pkg.dependencies["@upflame/adapters"]).toBe("latest");
    expect(pkg.dependencies.astro).toBe("5.0.0");
    expect(cmsConfig).toContain('framework: "astro"');
    expect(cmsRoute).toContain("UpFlame CMS");
  });

  it("scaffolds a remix project with cms route and config", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "create-json-cms-remix-"));
    const targetDir = path.join(tempRoot, "remix-site");

    await createProject({
      projectName: "Remix Site",
      targetDir,
      framework: "remix",
      packageManager: "pnpm",
      preset: "marketing",
      includeExampleContent: true,
      installDependencies: false,
    });

    const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
      dependencies: Record<string, string>;
    };
    const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
    const cmsRoute = await readFile(path.join(targetDir, "app", "routes", "cms.tsx"), "utf-8");

    expect(pkg.dependencies["@upflame/json-cms"]).toBe("latest");
    expect(pkg.dependencies["@upflame/adapters"]).toBe("latest");
    expect(pkg.dependencies["@remix-run/react"]).toBe("2.10.0");
    expect(cmsConfig).toContain('framework: "remix"');
    expect(cmsRoute).toContain("UpFlame CMS");
  });

  describe.each(packageManagers)("clean install (%s)", (packageManager) => {
    it("scaffolds a nextjs project from the template", async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "create-json-cms-"));
      const targetDir = path.join(tempRoot, `demo-site-${packageManager}`);

      await createProject({
        projectName: "Demo Site",
        targetDir,
        framework: "nextjs",
        packageManager,
        preset: "blog",
        includeExampleContent: true,
        installDependencies: false,
      });

      const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
        name: string;
        dependencies: Record<string, string>;
      };
      const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
      const page = await readFile(path.join(targetDir, "app", "page.tsx"), "utf-8");
      const cmsRoute = await readFile(path.join(targetDir, "app", "cms", "page.tsx"), "utf-8");
      const cmsSchema = await readFile(path.join(targetDir, "cms", "schema", "page.ts"), "utf-8");

      expect(pkg.name).toBe("demo-site");
      expect(pkg.dependencies["@upflame/json-cms"]).toBe("latest");
      expect(pkg.dependencies["@upflame/adapter-nextjs"]).toBe("latest");
      expect(pkg.dependencies["@upflame/plugin-media"]).toBe("latest");
      expect(cmsConfig).toContain('preset: "blog"');
      expect(page).toContain("Demo Site");
      expect(cmsRoute).toContain("UpFlame CMS");
      expect(cmsSchema).toContain('name: "page"');
    });
  });

  describe.each(packageManagers)("existing project integration (%s)", (packageManager) => {
    it("adds json-cms dependencies and config", async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "add-json-cms-"));
      const targetDir = path.join(tempRoot, `existing-${packageManager}`);
      await mkdir(targetDir, { recursive: true });
      await writeFile(
        path.join(targetDir, "package.json"),
        JSON.stringify(
          {
            name: "existing-app",
            private: true,
            scripts: { dev: "next dev" },
            dependencies: { next: "15.5.0", react: "18.3.1", "react-dom": "18.3.1" },
          },
          null,
          2
        )
      );

      await addIntegrationToProject({
        projectName: "existing-app",
        targetDir,
        framework: "nextjs",
        packageManager,
        preset: "marketing",
        includeExampleContent: true,
        installDependencies: false,
      });

      const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
      };

      expect(pkg.scripts.typecheck).toBeTruthy();
      expect(pkg.scripts.build).toBeTruthy();
      expect(pkg.dependencies["@upflame/adapter-nextjs"]).toBe("latest");
      expect(pkg.dependencies["@upflame/plugin-seo"]).toBe("latest");

      const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
      expect(cmsConfig).toContain('framework: "nextjs"');

      const starterContent = await readFile(path.join(targetDir, "data", "pages", "home.json"), "utf-8");
      expect(starterContent).toContain("home");

      const cmsRoute = await readFile(path.join(targetDir, "app", "cms", "page.tsx"), "utf-8");
      expect(cmsRoute).toContain("UpFlame CMS");
    });

    it("adds astro integration artifacts for astro projects", async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "add-json-cms-astro-"));
      const targetDir = path.join(tempRoot, `existing-astro-${packageManager}`);
      await mkdir(path.join(targetDir, "src", "pages"), { recursive: true });
      await writeFile(
        path.join(targetDir, "package.json"),
        JSON.stringify(
          {
            name: "existing-astro-app",
            private: true,
            scripts: { dev: "astro dev", build: "astro build", start: "astro preview" },
            dependencies: { astro: "5.0.0" },
          },
          null,
          2
        )
      );

      await addIntegrationToProject({
        projectName: "existing-astro-app",
        targetDir,
        framework: "astro",
        packageManager,
        preset: "marketing",
        includeExampleContent: true,
        installDependencies: false,
      });

      const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
        dependencies: Record<string, string>;
      };
      const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
      const cmsRoute = await readFile(path.join(targetDir, "src", "pages", "cms.astro"), "utf-8");

      expect(pkg.dependencies["@upflame/adapters"]).toBe("latest");
      expect(cmsConfig).toContain('framework: "astro"');
      expect(cmsRoute).toContain("UpFlame CMS");
    });

    it("adds remix integration artifacts for remix projects", async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "add-json-cms-remix-"));
      const targetDir = path.join(tempRoot, `existing-remix-${packageManager}`);
      await mkdir(path.join(targetDir, "app", "routes"), { recursive: true });
      await writeFile(
        path.join(targetDir, "package.json"),
        JSON.stringify(
          {
            name: "existing-remix-app",
            private: true,
            scripts: { dev: "remix dev", build: "remix build", start: "remix-serve build" },
            dependencies: { "@remix-run/react": "2.10.0" },
          },
          null,
          2
        )
      );

      await addIntegrationToProject({
        projectName: "existing-remix-app",
        targetDir,
        framework: "remix",
        packageManager,
        preset: "marketing",
        includeExampleContent: true,
        installDependencies: false,
      });

      const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
        dependencies: Record<string, string>;
      };
      const cmsConfig = await readFile(path.join(targetDir, "cms.config.ts"), "utf-8");
      const cmsRoute = await readFile(path.join(targetDir, "app", "routes", "cms.tsx"), "utf-8");

      expect(pkg.dependencies["@upflame/adapters"]).toBe("latest");
      expect(cmsConfig).toContain('framework: "remix"');
      expect(cmsRoute).toContain("UpFlame CMS");
    });

    it("keeps legacy config compatibility without breaking integration", async () => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "add-json-cms-legacy-"));
      const targetDir = path.join(tempRoot, `existing-legacy-${packageManager}`);
      await mkdir(targetDir, { recursive: true });
      await writeFile(
        path.join(targetDir, "package.json"),
        JSON.stringify(
          {
            name: "existing-legacy-app",
            private: true,
            scripts: { dev: "next dev" },
            dependencies: { next: "15.5.0", react: "18.3.1", "react-dom": "18.3.1" },
          },
          null,
          2
        )
      );
      await writeFile(path.join(targetDir, LEGACY_CONFIG_FILE), "export default { legacy: true };\n", "utf-8");

      await addIntegrationToProject({
        projectName: "existing-legacy-app",
        targetDir,
        framework: "nextjs",
        packageManager,
        preset: "marketing",
        includeExampleContent: true,
        installDependencies: false,
      });

      const legacyConfig = await readFile(path.join(targetDir, LEGACY_CONFIG_FILE), "utf-8");
      expect(legacyConfig).toContain("legacy: true");
      await expect(readFile(path.join(targetDir, "cms.config.ts"), "utf-8")).rejects.toThrow();

      const pkg = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf-8")) as {
        dependencies: Record<string, string>;
      };
      expect(pkg.dependencies["@upflame/adapter-nextjs"]).toBe("latest");
    });
  });
});
