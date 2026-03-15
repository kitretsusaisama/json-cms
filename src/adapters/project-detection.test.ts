import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { detectProjectAdapter } from "@/adapters/project-detection";
import { detectFramework } from "@/cli/detectors/framework-detector";

const createdDirs: string[] = [];

async function createProject(options: {
  packageJson?: Record<string, unknown>;
  files?: Record<string, string>;
  directories?: string[];
} = {}): Promise<string> {
  const rootDir = await mkdtemp(join(tmpdir(), "jsoncms-detect-"));
  createdDirs.push(rootDir);

  if (options.packageJson) {
    await writeFile(join(rootDir, "package.json"), JSON.stringify(options.packageJson, null, 2));
  }

  for (const directory of options.directories ?? []) {
    await mkdir(join(rootDir, directory), { recursive: true });
  }

  for (const [path, content] of Object.entries(options.files ?? {})) {
    const target = join(rootDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  return rootDir;
}

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0, createdDirs.length).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("project capability detection", () => {
  it("detects Next.js App Router projects from capabilities", async () => {
    const project = await createProject({
      packageJson: {
        name: "next-app-router",
        dependencies: {
          next: "15.5.0",
          react: "18.3.1",
        },
      },
      directories: ["src/app"],
      files: {
        "next.config.ts": "export default {};",
        "tsconfig.json": "{}",
      },
    });

    const resolved = await detectProjectAdapter(project);

    expect(resolved.id).toBe("nextjs");
    expect(resolved.scan.nextRouter).toBe("app");
    expect(resolved.scan.capabilities.react).toBe(true);
    expect(resolved.scan.capabilities.ssrRuntime).toBe(true);
  });

  it("wires Next.js Pages Router setup files when app router is absent", async () => {
    const project = await createProject({
      packageJson: {
        name: "next-pages-router",
        dependencies: {
          next: "15.5.0",
          react: "18.3.1",
        },
      },
      directories: ["pages", "pages/api"],
      files: {
        "next.config.js": "module.exports = {};",
        "tsconfig.json": "{}",
      },
    });

    const info = await detectFramework(project);

    expect(info.id).toBe("nextjs");
    expect(info.nextRouter).toBe("pages");
    expect(info.features.serverComponents).toBe(false);
    expect(info.adapter.setupFiles.map((file) => file.template)).toEqual([
      "next-pages-router-api",
      "next-pages-router-page",
      "config",
    ]);
  });

  it("prefers Remix over generic Vite when both capabilities are present", async () => {
    const project = await createProject({
      packageJson: {
        name: "remix-vite",
        dependencies: {
          react: "18.3.1",
          vite: "5.4.0",
          "@remix-run/react": "2.16.0",
          "@remix-run/node": "2.16.0",
        },
      },
      files: {
        "remix.config.js": "module.exports = {};",
        "vite.config.ts": "export default {};",
      },
    });

    const resolved = await detectProjectAdapter(project);

    expect(resolved.id).toBe("remix");
  });

  it("falls back to the generic adapter for bare Vite projects without a UI capability", async () => {
    const project = await createProject({
      packageJson: {
        name: "bare-vite",
        dependencies: {
          vite: "5.4.0",
        },
      },
      files: {
        "vite.config.ts": "export default {};",
      },
    });

    const resolved = await detectProjectAdapter(project);

    expect(resolved.id).toBe("unknown");
  });
});
