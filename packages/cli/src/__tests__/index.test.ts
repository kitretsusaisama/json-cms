import { describe, expect, it } from "vitest";
import {
  executePluginCommand,
  parseCliCommand,
  preparePluginRegistration,
  readPluginState,
  resolvePluginAlias,
  runPluginDoctor,
} from "../index";

describe("cli", () => {
  it("parses command and arguments", () => {
    const result = parseCliCommand(["add", "@upflame/plugin-pages"], { cwd: "/repo" });

    expect(result).toEqual({
      command: "add",
      args: ["@upflame/plugin-pages"],
      cwd: "/repo",
    });
  });

  it("parses plugin command tree", () => {
    const result = parseCliCommand(["plugin", "add", "seo"], { cwd: "/repo" });

    expect(result).toEqual({
      command: "plugin",
      subcommand: "add",
      plugin: "seo",
      args: ["seo"],
      cwd: "/repo",
    });
  });

  it("resolves plugin aliases", () => {
    expect(resolvePluginAlias("seo")).toEqual({
      input: "seo",
      packageName: "@upflame/plugin-seo",
      usedAlias: true,
    });
  });

  it("normalizes non-alias plugin input", () => {
    expect(resolvePluginAlias("  Plugin-Seo  ").packageName).toBe("@upflame/plugin-seo");
    expect(resolvePluginAlias("  @UPFLAME/PLUGIN-SEO  ").packageName).toBe("@upflame/plugin-seo");
  });

  it("validates manifest before plugin registration", () => {
    const prepared = preparePluginRegistration("seo", {
      name: "@upflame/plugin-seo",
      version: "1.0.0",
      description: "SEO plugin",
      author: "Upflame",
      cms: {},
    });

    expect(prepared.packageName).toBe("@upflame/plugin-seo");
  });

  it("writes deterministic plugin state in cms.config", () => {
    const baseConfig = `export default {\n  framework: "nextjs",\n  plugins: [],\n};\n`;

    const addSeo = executePluginCommand({
      subcommand: "add",
      pluginInput: "seo",
      configSource: baseConfig,
      manifest: {
        name: "@upflame/plugin-seo",
        version: "1.0.0",
        description: "SEO plugin",
        author: "Upflame",
        cms: {},
      },
    });

    const addPages = executePluginCommand({
      subcommand: "add",
      pluginInput: "pages",
      configSource: addSeo.nextConfigSource,
      manifest: {
        name: "@upflame/plugin-pages",
        version: "1.0.0",
        description: "Pages plugin",
        author: "Upflame",
        cms: {},
      },
    });

    expect(readPluginState(addPages.nextConfigSource).plugins).toEqual([
      "@upflame/plugin-pages",
      "@upflame/plugin-seo",
    ]);
  });

  it("writes plugin state without corrupting nested object literals", () => {
    const baseConfig = `export default {
  framework: "nextjs",
  meta: {
    marker: "}; in string should not terminate export",
  },
  plugins: [],
};
`;

    const result = executePluginCommand({
      subcommand: "add",
      pluginInput: "seo",
      configSource: baseConfig,
      manifest: {
        name: "@upflame/plugin-seo",
        version: "1.0.0",
        description: "SEO plugin",
        author: "Upflame",
        cms: {},
      },
    });

    expect(result.nextConfigSource).toContain('marker: "}; in string should not terminate export"');
    expect(readPluginState(result.nextConfigSource).plugins).toEqual(["@upflame/plugin-seo"]);
  });

  it("returns actionable dependency diagnostics from doctor", () => {
    const report = runPluginDoctor(
      {
        name: "@upflame/plugin-seo",
        version: "1.0.0",
        description: "SEO plugin",
        author: "Upflame",
        cms: {},
        peerDependencies: {
          "@upflame/json-cms": "^1.0.0",
        },
      },
      {}
    );

    expect(report.diagnostics[0]?.remediation).toContain("npm install @upflame/json-cms");
  });

  it("detects dependency version mismatches", () => {
    const report = runPluginDoctor(
      {
        name: "@upflame/plugin-seo",
        version: "1.0.0",
        description: "SEO plugin",
        author: "Upflame",
        cms: {},
        peerDependencies: {
          "@upflame/json-cms": "^2.0.0",
        },
      },
      {
        "@upflame/json-cms": "1.5.0",
      }
    );

    expect(report.diagnostics[0]?.message).toContain("does not satisfy");
  });

  it("surfaces doctor diagnostics in plugin command output", () => {
    const config = `export default {
  // cms-plugin-state:start
  pluginPackages: [
    "@upflame/plugin-seo"
  ],
  // cms-plugin-state:end
  framework: "nextjs",
  plugins: [],
};`;

    const result = executePluginCommand({
      subcommand: "doctor",
      configSource: config,
      manifestsByPackage: {
        "@upflame/plugin-seo": {
          name: "@upflame/plugin-seo",
          version: "1.0.0",
          description: "SEO plugin",
          author: "Upflame",
          cms: {},
          peerDependencies: {
            "@upflame/json-cms": "^2.0.0",
          },
        },
      },
      installedVersions: {
        "@upflame/json-cms": "1.0.0",
      },
    });

    expect(result.diagnostics?.length).toBe(1);
    expect(result.message).toContain("Doctor found 1 issue(s)");
  });
});
