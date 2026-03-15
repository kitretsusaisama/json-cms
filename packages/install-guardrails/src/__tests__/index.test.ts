import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInstallGuardrails } from "../index";

const tempDirs: string[] = [];

function fixtureDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "guardrails-"));
  tempDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runInstallGuardrails", () => {
  it("fails when detected framework adapter is missing", () => {
    const cwd = fixtureDir();
    writeJson(path.join(cwd, "package.json"), {
      dependencies: {
        next: "15.5.0",
        "@upflame/json-cms": "1.0.0",
      },
    });

    const report = runInstallGuardrails({ cwd });

    expect(report.shouldFail).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_ADAPTER_MISSING")).toBe(true);
  });

  it("validates plugin manifest compatibility with adapter and core versions", () => {
    const cwd = fixtureDir();
    writeJson(path.join(cwd, "package.json"), {
      dependencies: {
        next: "15.5.0",
        "@upflame/json-cms": "1.0.0",
        "@upflame/adapter-nextjs": "1.0.0",
        "@upflame/plugin-pages": "1.0.0",
      },
    });

    writeJson(path.join(cwd, "node_modules/@upflame/json-cms/package.json"), { version: "1.0.0" });
    writeJson(path.join(cwd, "node_modules/@upflame/adapter-nextjs/package.json"), { version: "1.0.0" });
    writeJson(path.join(cwd, "node_modules/@upflame/plugin-pages/package.json"), {
      version: "1.0.0",
      peerDependencies: {
        "@upflame/json-cms": "^2.0.0",
      },
    });
    writeJson(path.join(cwd, "node_modules/@upflame/plugin-pages/plugin.json"), {
      name: "@upflame/plugin-pages",
      engines: { "json-cms": "^2.0.0" },
      compatibility: {
        adapters: {
          "@upflame/adapter-nextjs": "^2.0.0",
        },
      },
    });

    const report = runInstallGuardrails({ cwd });

    expect(report.shouldFail).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_PLUGIN_CORE_INCOMPATIBLE")).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_PLUGIN_ADAPTER_INCOMPATIBLE")).toBe(true);
  });

  it("errors on invalid compatibility range syntax", () => {
    const cwd = fixtureDir();
    writeJson(path.join(cwd, "package.json"), {
      dependencies: {
        next: "15.5.0",
        "@upflame/json-cms": "1.0.0",
        "@upflame/adapter-nextjs": "1.0.0",
        "@upflame/plugin-pages": "1.0.0",
      },
    });

    writeJson(path.join(cwd, "node_modules/@upflame/json-cms/package.json"), { version: "1.0.0" });
    writeJson(path.join(cwd, "node_modules/@upflame/adapter-nextjs/package.json"), { version: "1.0.0" });
    writeJson(path.join(cwd, "node_modules/@upflame/plugin-pages/package.json"), { version: "1.0.0" });
    writeJson(path.join(cwd, "node_modules/@upflame/plugin-pages/plugin.json"), {
      name: "@upflame/plugin-pages",
      engines: { "json-cms": "not-a-range" },
      compatibility: {
        adapters: {
          "@upflame/adapter-nextjs": "wat",
        },
      },
    });

    const report = runInstallGuardrails({ cwd });

    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_PLUGIN_CORE_RANGE_INVALID")).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_PLUGIN_ADAPTER_RANGE_INVALID")).toBe(true);
  });

  it("reports invalid project package.json", () => {
    const cwd = fixtureDir();
    writeFileSync(path.join(cwd, "package.json"), "{ invalid json ");

    const report = runInstallGuardrails({ cwd });

    expect(report.shouldFail).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "GUARDRAIL_PACKAGE_JSON_INVALID")).toBe(true);
  });

  it("does not fail in postinstall mode unless strict is enabled", () => {
    const cwd = fixtureDir();
    writeJson(path.join(cwd, "package.json"), {
      dependencies: { next: "15.5.0" },
    });

    const report = runInstallGuardrails({ cwd, postinstall: true });

    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.shouldFail).toBe(false);
  });
});
