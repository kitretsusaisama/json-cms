import { describe, expect, it } from "vitest";
import { buildProjectManifest, renderCmsConfig, sanitizeProjectName } from "../index";

describe("cli-utils", () => {
  it("sanitizes project names", () => {
    expect(sanitizeProjectName("My Enterprise CMS")).toBe("my-enterprise-cms");
  });

  it("builds preset-aware package manifests", () => {
    const manifest = buildProjectManifest({
      packageName: "my-enterprise-cms",
      preset: "blog",
      framework: "nextjs",
    }) as { dependencies: Record<string, string> };

    expect(manifest.dependencies["@upflame/plugin-seo"]).toBe("latest");
    expect(manifest.dependencies["@upflame/adapter-nextjs"]).toBe("latest");
    expect(manifest.dependencies["@upflame/json-cms"]).toBe("latest");
  });

  it("renders cms config with plugin imports", () => {
    const config = renderCmsConfig("marketing", ["@upflame/plugin-media"]);
    expect(config).toContain("@upflame/plugin-media");
    expect(config).not.toContain("@upflame/plugin-pages");
    expect(config).toContain('preset: "marketing"');
  });

  it("builds astro manifests with astro adapter dependency", () => {
    const manifest = buildProjectManifest({
      packageName: "my-astro-cms",
      preset: "marketing",
      framework: "astro",
    }) as { dependencies: Record<string, string>; scripts: Record<string, string> };

    expect(manifest.dependencies["@upflame/adapters"]).toBe("latest");
    expect(manifest.dependencies.astro).toBe("5.0.0");
    expect(manifest.scripts.dev).toBe("astro dev");
  });

  it("builds remix manifests with remix runtime dependencies", () => {
    const manifest = buildProjectManifest({
      packageName: "my-remix-cms",
      preset: "headless",
      framework: "remix",
    }) as { dependencies: Record<string, string>; scripts: Record<string, string>; devDependencies: Record<string, string> };

    expect(manifest.dependencies["@upflame/adapters"]).toBe("latest");
    expect(manifest.dependencies["@remix-run/react"]).toBe("2.10.0");
    expect(manifest.scripts.dev).toBe("remix dev");
    expect(manifest.devDependencies["@remix-run/dev"]).toBe("2.10.0");
  });
});
