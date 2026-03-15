#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { execSync } from "node:child_process";
import ts from "typescript";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);
const CRITICAL_PACKAGES = new Set([
  "@upflame/json-cms",
  "@upflame/adapter-nextjs",
  "create-json-cms",
  "@upflame/installer-core",
  "@upflame/cli-utils",
]);

function shouldIgnoreDir(name) {
  return IGNORE_DIRS.has(name) || name.startsWith("tmp-");
}

function findPackageJsons(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) {
        findPackageJsons(full, acc);
      }
      continue;
    }
    if (entry.isFile() && entry.name === "package.json") {
      acc.push(full);
    }
  }
  return acc;
}

function findFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, acc);
      continue;
    }
    if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, cwd) {
  return execSync(command, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function parsePackOutput(output) {
  const trimmed = output.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/(\[[\s\S]*\])\s*$/);
    if (!match) {
      throw new Error("Could not parse npm pack JSON output.");
    }
    return JSON.parse(match[1]);
  }
}

function includesPath(files, pathPrefix) {
  return files.some((entry) => entry.path === pathPrefix || entry.path.startsWith(`${pathPrefix}/`));
}

function unresolvedAliasFiles(manifestDir) {
  const distDir = join(manifestDir, "dist");
  if (!existsSync(distDir)) {
    return [];
  }

  const scanExtensions = new Set([".js", ".cjs", ".mjs", ".d.ts"]);
  const files = findFiles(distDir).filter((file) => {
    for (const extension of scanExtensions) {
      if (file.endsWith(extension)) return true;
    }
    return false;
  });

  const unresolved = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const aliases = findUnresolvedAliasSpecifiers(file, source);
    if (aliases.length > 0) {
      unresolved.push({
        file: relative(manifestDir, file).replace(/\\/g, "/"),
        aliases,
      });
    }
  }

  return unresolved;
}

function scriptKindFromFile(filePath) {
  if (filePath.endsWith(".d.ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function findUnresolvedAliasSpecifiers(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.ESNext,
    true,
    scriptKindFromFile(filePath)
  );
  const aliases = new Set();

  function collectIfAlias(moduleSpecifier) {
    if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) return;
    if (moduleSpecifier.text.startsWith("@/")) {
      aliases.add(moduleSpecifier.text);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      collectIfAlias(node.moduleSpecifier);
    }

    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      collectIfAlias(node.moduleReference.expression);
    }

    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      collectIfAlias(node.argument.literal);
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [firstArg] = node.arguments;
        collectIfAlias(firstArg);
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        const [firstArg] = node.arguments;
        collectIfAlias(firstArg);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...aliases];
}

const packageJsons = findPackageJsons(ROOT);
const publishable = packageJsons
  .filter((path) => parseJson(path).private !== true)
  .filter((path) => {
    const manifest = parseJson(path);
    return CRITICAL_PACKAGES.has(manifest.name);
  });
const failures = [];

for (const manifestPath of publishable) {
  const manifestDir = dirname(manifestPath);
  const manifest = parseJson(manifestPath);
  const name = manifest.name ?? relative(ROOT, manifestDir);
  const relPath = relative(ROOT, manifestDir) || ".";

  try {
    if (name === "@upflame/json-cms" && manifest.scripts?.["build:package"]) {
      run("pnpm run build:package", manifestDir);
    } else if (manifest.scripts?.build) {
      run("pnpm run build", manifestDir);
    }
  } catch (error) {
    failures.push(`${name} (${relPath}): build failed (${error.message.trim()})`);
    continue;
  }

  const unresolved = unresolvedAliasFiles(manifestDir);
  if (unresolved.length > 0) {
    const formatted = unresolved
      .slice(0, 3)
      .map((entry) => `${entry.file} -> ${entry.aliases.join(", ")}`)
      .join("; ");
    failures.push(
      `${name} (${relPath}): dist contains unresolved @/ alias imports (${formatted})`
    );
    continue;
  }

  let packJson;
  try {
    const output = run("npm pack --dry-run --json", manifestDir);
    packJson = parsePackOutput(output);
  } catch (error) {
    failures.push(`${name} (${relPath}): npm pack --dry-run failed (${error.message.trim()})`);
    continue;
  }

  const details = Array.isArray(packJson) ? packJson[0] : packJson;
  const files = details?.files ?? [];

  if (manifest.files?.includes("dist") && !includesPath(files, "dist")) {
    failures.push(`${name} (${relPath}): packed tarball is missing dist/`);
  }

  for (const declared of manifest.files ?? []) {
    if (/readme\.md$/i.test(declared) && !includesPath(files, declared)) {
      failures.push(`${name} (${relPath}): packed tarball is missing ${declared}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Pack verification failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Pack verification passed for ${publishable.length} publishable package(s).`);
