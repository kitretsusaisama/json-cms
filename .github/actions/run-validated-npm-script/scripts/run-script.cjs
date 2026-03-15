#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const script = process.env.NPM_SCRIPT;
const rawArgs = process.env.NPM_ARGS || '';

if (!script) {
  console.error('NPM_SCRIPT is required.');
  process.exit(1);
}

const forwardedArgs = rawArgs.trim() ? rawArgs.trim().split(/\s+/) : [];
const commandArgs = ['run', script];

if (forwardedArgs.length > 0) {
  commandArgs.push('--', ...forwardedArgs);
}

const result = spawnSync('npm', commandArgs, {
  stdio: 'inherit',
  shell: false
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
