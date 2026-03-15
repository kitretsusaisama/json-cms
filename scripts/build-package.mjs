import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const configPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(pkgDir, "tsconfig.json");
const srcDir = path.join(pkgDir, "src");
const distDir = path.join(pkgDir, "dist");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tscBin = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
const tscAliasBin = path.join(repoRoot, "node_modules", "tsc-alias", "dist", "bin", "index.js");

function runTsc(args) {
  execFileSync(process.execPath, [tscBin, ...args], { stdio: "inherit" });
}

function runTscAlias(outDir) {
  if (!existsSync(tscAliasBin)) {
    return;
  }

  const configArg = path.relative(pkgDir, configPath) || path.basename(configPath);
  const outDirArg = path.relative(pkgDir, outDir) || outDir;

  execFileSync(
    process.execPath,
    [tscAliasBin, "-p", configArg, "--outDir", outDirArg],
    { stdio: "inherit", cwd: pkgDir }
  );
}

mkdirSync(distDir, { recursive: true });

runTsc([
  "-p",
  configPath,
  "--emitDeclarationOnly",
  "--declaration",
  "--declarationMap",
  "--outDir",
  path.join(distDir, "types"),
  "--rootDir",
  srcDir,
]);
runTscAlias(path.join(distDir, "types"));

runTsc([
  "-p",
  configPath,
  "--outDir",
  path.join(distDir, "esm"),
  "--module",
  "esnext",
  "--declaration",
  "false",
  "--declarationMap",
  "false",
]);
runTscAlias(path.join(distDir, "esm"));

runTsc([
  "-p",
  configPath,
  "--outDir",
  path.join(distDir, "cjs"),
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--declaration",
  "false",
  "--declarationMap",
  "false",
]);
runTscAlias(path.join(distDir, "cjs"));

writeFileSync(path.join(distDir, "cjs", "package.json"), '{"type":"commonjs"}\n');
