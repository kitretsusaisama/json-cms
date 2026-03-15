import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const packageDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));

const userAgent = process.env.npm_config_user_agent ?? "";
const packageManager = process.env.SMOKE_PACKAGE_MANAGER
  ?? (userAgent.startsWith("pnpm/") ? "pnpm" : userAgent.startsWith("yarn/") ? "yarn" : "npm");
const installArgs = packageManager === "yarn" ? ["install", "--silent"] : ["install", "--silent"];

const fixtureDir = mkdtempSync(path.join(tmpdir(), "upflame-fixture-"));

try {
  writeFileSync(
    path.join(fixtureDir, "package.json"),
    JSON.stringify(
      {
        name: "fixture-smoke",
        private: true,
        type: "module",
        dependencies: {
          [packageJson.name]: `file:${packageDir}`,
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    path.join(fixtureDir, "index.mjs"),
    [
      `import * as entry from ${JSON.stringify(packageJson.name)};`,
      "if (!entry || typeof entry !== 'object') throw new Error('Package import (ESM) failed');",
      "console.log(Object.keys(entry).length);",
    ].join("\n"),
  );

  writeFileSync(
    path.join(fixtureDir, "index.cjs"),
    [
      `const entry = require(${JSON.stringify(packageJson.name)});`,
      "if (!entry || typeof entry !== 'object') throw new Error('Package require (CJS) failed');",
      "console.log(Object.keys(entry).length);",
    ].join("\n"),
  );

  execFileSync(packageManager, installArgs, { cwd: fixtureDir, stdio: "inherit" });
  execFileSync("node", ["index.mjs"], { cwd: fixtureDir, stdio: "inherit" });
  execFileSync("node", ["index.cjs"], { cwd: fixtureDir, stdio: "inherit" });
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}
