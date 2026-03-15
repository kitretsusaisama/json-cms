#!/usr/bin/env node

const fs = require('node:fs');

const script = process.argv[2];
const pkgPath = 'package.json';

if (!script) {
  console.error('Missing required script name argument.');
  process.exit(1);
}

if (!fs.existsSync(pkgPath)) {
  console.error(`package.json not found in ${process.cwd()}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const scripts = pkg.scripts || {};

if (!Object.prototype.hasOwnProperty.call(scripts, script)) {
  console.error(`Missing npm script "${script}" in ${process.cwd()}/package.json`);
  console.error(`Available scripts: ${Object.keys(scripts).sort().join(', ')}`);
  process.exit(1);
}
