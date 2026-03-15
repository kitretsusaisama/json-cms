#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const ignoreDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);

function shouldIgnoreDir(name) {
  return ignoreDirs.has(name) || name.startsWith('tmp-');
}

function findPackageJsons(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) {
        findPackageJsons(join(dir, entry.name), acc);
      }
      continue;
    }

    if (entry.name === 'package.json') {
      acc.push(join(dir, entry.name));
    }
  }
  return acc;
}

const packageJsons = findPackageJsons(ROOT);
const violations = [];

for (const path of packageJsons) {
  const raw = readFileSync(path, 'utf8');
  const manifest = JSON.parse(raw);

  if (manifest.private === true) {
    continue;
  }

  for (const field of FIELDS) {
    const deps = manifest[field] ?? {};
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string' && (version.startsWith('file:') || version.startsWith('workspace:'))) {
        violations.push({ path, field, name, version });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Found disallowed local/workspace dependencies in publishable manifests:\n');
  for (const violation of violations) {
    const relPath = violation.path.startsWith(ROOT)
      ? violation.path.slice(ROOT.length + 1)
      : violation.path;
    console.error(`- ${relPath} :: ${violation.field}.${violation.name} = ${violation.version}`);
  }
  process.exit(1);
}

console.log(`Checked ${packageJsons.length} package.json files. No disallowed file:/workspace: dependencies found.`);
