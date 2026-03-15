#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGETS = [
  { name: "@upflame/json-cms", dir: ROOT },
  { name: "create-json-cms", dir: path.join(ROOT, "apps", "create-json-cms") },
  { name: "@upflame/adapter-nextjs", dir: path.join(ROOT, "packages", "adapter-nextjs") },
  { name: "@upflame/installer-core", dir: path.join(ROOT, "packages", "installer-core") },
  { name: "@upflame/cli-utils", dir: path.join(ROOT, "packages", "cli-utils") },
];

const failures = [];

for (const target of TARGETS) {
  const manifestPath = path.join(target.dir, "package.json");
  if (!existsSync(manifestPath)) {
    failures.push(`${target.name}: missing package.json at ${manifestPath}`);
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (manifest.name !== target.name) {
    failures.push(`${target.name}: package name mismatch (${manifest.name ?? "missing"})`);
  }

  if (!manifest.version) {
    failures.push(`${target.name}: missing version`);
  }

  if (!manifest.description || String(manifest.description).trim().length < 10) {
    failures.push(`${target.name}: description is missing or too short`);
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (!files.includes("dist")) {
    failures.push(`${target.name}: files[] must include "dist"`);
  }

  const hasReadmeInFiles = files.some((entry) => typeof entry === "string" && /^readme\.md$/i.test(entry));
  if (!hasReadmeInFiles) {
    failures.push(`${target.name}: files[] must include README.md`);
  }

  const readmeExists = existsSync(path.join(target.dir, "README.md")) || existsSync(path.join(target.dir, "Readme.md"));
  if (!readmeExists) {
    failures.push(`${target.name}: README.md missing`);
  }

  if (!manifest.scripts?.prepack) {
    failures.push(`${target.name}: missing scripts.prepack`);
  }

  for (const field of ["main", "module", "types"]) {
    const value = manifest[field];
    if (!value || typeof value !== "string" || !value.startsWith("./dist/")) {
      failures.push(`${target.name}: ${field} must point to ./dist/*`);
    }
  }

  if (target.name === "create-json-cms") {
    if (!files.includes("templates")) {
      failures.push("create-json-cms: files[] must include templates");
    }

    const binPath = manifest.bin?.["create-json-cms"];
    if (!binPath || typeof binPath !== "string" || !binPath.startsWith("./dist/")) {
      failures.push("create-json-cms: bin.create-json-cms must point to built dist entry");
    }

    const requiredTemplateFiles = [
      path.join(target.dir, "templates", "nextjs", "app", "cms", "page.tsx"),
      path.join(target.dir, "templates", "nextjs", "cms", "schema", "page.ts"),
      path.join(target.dir, "templates", "nextjs", "cms", "plugins", "index.ts"),
      path.join(target.dir, "templates", "astro", "src", "pages", "cms.astro"),
      path.join(target.dir, "templates", "astro", "cms", "schema", "page.ts"),
      path.join(target.dir, "templates", "astro", "cms", "plugins", "index.ts"),
      path.join(target.dir, "templates", "remix", "app", "routes", "cms.tsx"),
      path.join(target.dir, "templates", "remix", "cms", "schema", "page.ts"),
      path.join(target.dir, "templates", "remix", "cms", "plugins", "index.ts"),
    ];

    for (const templateFile of requiredTemplateFiles) {
      if (!existsSync(templateFile)) {
        failures.push(`create-json-cms: missing scaffold template file ${path.relative(ROOT, templateFile)}`);
      }
    }
  }
}

const releaseDocs = [
  path.join(ROOT, "docs", "release", "package-publish-checklist.md"),
  path.join(ROOT, "docs", "release", "publish-materials.md"),
];

for (const docPath of releaseDocs) {
  if (!existsSync(docPath)) {
    failures.push(`missing release documentation ${path.relative(ROOT, docPath)}`);
  }
}

if (failures.length > 0) {
  console.error("Publish material validation failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Publish material validation passed for ${TARGETS.length} critical package(s).`);
