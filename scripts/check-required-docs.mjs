#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredDocs = [
  'docs/engineering-program-plan.md',
  'docs/execution-journal.md',
  'docs/adapters/contract.md',
  'docs/release/package-publish-checklist.md',
  'docs/release/publishing-guide.md',
  'docs/release/scaffolding-package-guide.md',
  'docs/data-versioning.md',
  'docs/plugins/conformance.md',
  'docs/Readme.md'
];

const missing = [];

for (const doc of requiredDocs) {
  try {
    await access(doc, constants.F_OK);
  } catch {
    missing.push(doc);
  }
}

if (missing.length > 0) {
  console.error('Required documentation files are missing:');
  for (const doc of missing) {
    console.error(`- ${doc}`);
  }
  process.exit(1);
}

console.log('All required documentation files are present.');
