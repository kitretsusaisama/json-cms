#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

const ROOT_DOC = 'README.md';
const DOCS_DIR = 'docs';

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(posix.normalize(fullPath.replace(/\\/g, '/')));
    }
  }

  return files;
}

const docsToLint = [ROOT_DOC, ...(await collectMarkdownFiles(DOCS_DIR))];

const forbiddenPatterns = [
  {
    name: 'legacy package scope',
    regex: /@your-org\/json-cms-boilerplate/g,
    hint: 'Replace with @upflame/json-cms.'
  },
  {
    name: 'legacy package name',
    regex: /json-cms-boilerplate/g,
    hint: 'Use @upflame/json-cms package naming and cms/jsoncms commands.'
  },
  {
    name: 'deprecated npx package invocation',
    regex: /\bnpx\s+@upflame\/json-cms\b/g,
    hint: 'Use cms or jsoncms command examples instead (e.g. `jsoncms scan`).'
  }
];

const allowedCommandRegex = /^(?:#.*|\s*|(?:cms|jsoncms)\b.*|npm\s+(?:i|install|run|init)\b.*|yarn\s+add\b.*|pnpm\s+add\b.*|pip\s+install\b.*|echo\b.*|mkdir\b.*|cd\b.*|ls\b.*|cat\b.*|cp\b.*|mv\b.*|touch\b.*|tail\b.*|vercel\b.*|git\b.*|node\b.*|docker\b.*|[A-Z_][A-Z0-9_]*=.*)$/;
const allowedCurlRegex = /^curl\b(?!.*\|)(?=.*https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s]*)?).*$/;
const allowedRmRegex = /^rm\s+-rf\s+(?:\.next|node_modules)(?:\s+package-lock\.json)?$/;

const issues = [];

function collectCommandBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const openMatch = line.match(/^\s*(```+|~~~+)\s*(\w+)?\s*$/);

    if (!openMatch) {
      index += 1;
      continue;
    }

    const fence = openMatch[1];
    const language = (openMatch[2] ?? '').toLowerCase();
    const isShellBlock = ['bash', 'sh', 'shell', 'zsh'].includes(language);
    const startLine = index + 1;

    index += 1;
    const blockLines = [];

    while (index < lines.length) {
      const closeLine = lines[index];
      const closeMatch = closeLine.match(/^\s*(```+|~~~+)\s*$/);
      if (closeMatch && closeMatch[1][0] === fence[0] && closeMatch[1].length >= fence.length) {
        break;
      }
      blockLines.push(lines[index]);
      index += 1;
    }

    if (isShellBlock) {
      blocks.push({ startLine, lines: blockLines });
    }

    index += 1;
  }

  return blocks;
}

function collectCommands(lines) {
  const commands = [];
  let current = '';
  let startOffset = 0;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      if (current) {
        commands.push({ command: current.trim(), lineOffset: startOffset });
        current = '';
      }
      return;
    }

    if (!current) {
      startOffset = idx;
    }

    current = current ? `${current} ${line}` : line;

    if (!line.endsWith('\\')) {
      commands.push({ command: current.trim(), lineOffset: startOffset });
      current = '';
    }
  });

  if (current) {
    commands.push({ command: current.trim(), lineOffset: startOffset });
  }

  return commands;
}

for (const docPath of docsToLint) {
  const content = await readFile(docPath, 'utf8');

  for (const rule of forbiddenPatterns) {
    for (const match of content.matchAll(rule.regex)) {
      const before = content.slice(0, match.index);
      const line = before.split('\n').length;
      issues.push(`${docPath}:${line} contains ${rule.name}. ${rule.hint}`);
    }
  }

  for (const block of collectCommandBlocks(content)) {
    for (const command of collectCommands(block.lines)) {
      const line = command.command;
      const isAllowedLine =
        allowedCommandRegex.test(line) || allowedCurlRegex.test(line) || allowedRmRegex.test(line);

      if (!isAllowedLine) {
        const lineNo = block.startLine + command.lineOffset + 1;
        issues.push(
          `${docPath}:${lineNo} invalid command example \`${line}\`. Use documented safe command patterns.`
        );
      }
    }
  }
}

if (issues.length > 0) {
  console.error('Documentation convention lint failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Documentation conventions validated for ${docsToLint.length} markdown files.`);
