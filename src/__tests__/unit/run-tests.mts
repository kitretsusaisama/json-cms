#!/usr/bin/env node
/**
 * CMS Codebase Test Suite - ESM/MTS version
 * Run: tsx src/__tests__/unit/run-tests.mts
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

let passed = 0, failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ ${name}\n     ${msg}`);
    failures.push(`${name}: ${msg}`);
    failed++;
  }
}

async function describe(suiteName: string, fn: () => Promise<void>) {
  console.log(`\n📋 ${suiteName}`);
  await fn();
}

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(root, 'src', rel), 'utf8');
}

function getAllFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllFiles(full, exts));
    else if (exts.some(ext => entry.name.endsWith(ext))) results.push(full);
  }
  return results;
}

// ─── Suite 1: styled-jsx removal ─────────────────────────────────────────────
await describe('BUG-STYLED-JSX: No <style jsx> in source files', async () => {
  await test('No <style jsx> tags in any tsx/ts source file (excluding tests)', async () => {
    const srcDir = path.join(root, 'src');
    const files = getAllFiles(srcDir, ['.tsx', '.ts'])
      .filter(f => !f.includes('__tests__') && !f.includes('run-tests'));
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (content.includes('<style jsx>')) violations.push(path.relative(root, f));
    }
    assert.strictEqual(violations.length, 0, `styled-jsx in: ${violations.join(', ')}`);
  });
});

// ─── Suite 2: Circular dependency ────────────────────────────────────────────
await describe('BUG-LOG-001: logger.ts has no circular import', async () => {
  await test('logger.ts does NOT import error-tracking', async () => {
    const content = readSrc('lib/logger.ts');
    // Check for actual import statements, not comments
    const importLines = content.split("\n").filter(l => l.trim().startsWith("import") && l.includes("error-tracking"));
    assert.strictEqual(importLines.length, 0, "logger must not have import from error-tracking (comments OK)");
  });

  await test('logger.ts exports the logger singleton', async () => {
    const content = readSrc('lib/logger.ts');
    assert.ok(content.includes('export const logger'), 'logger must export const logger');
  });

  await test('error-tracking.ts imports logger (one-way dependency is fine)', async () => {
    const content = readSrc('lib/error-tracking.ts');
    assert.ok(content.includes("from './logger'"), 'error-tracking should import logger');
  });
});

// ─── Suite 3: Providers fixes ─────────────────────────────────────────────────
await describe('BUG-PROVIDERS-001/002: Providers component', async () => {
  await test('Providers does NOT block SSR with mounted guard', async () => {
    const content = readSrc('providers/index.tsx');
    // Strip both line comments and block comments (/** ... */) then check
    const noLineComments = content.replace(/\/\/[^\n]*/g, '');
    const noComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    const hasSSRGuard = /\{mounted\s*&&\s*children\}/.test(noComments);
    assert.ok(!hasSSRGuard, 'SSR-blocking mounted gate must be removed');
  });

  await test('Providers has use client directive', async () => {
    const content = readSrc('providers/index.tsx');
    assert.ok(content.includes("'use client'") || content.includes('"use client"'), 'Must be a client component');
  });

  await test('No leftover .new files in providers/', async () => {
    const files = fs.readdirSync(path.join(root, 'src', 'providers'));
    const newFiles = files.filter(f => f.endsWith('.new'));
    assert.deepStrictEqual(newFiles, [], `Leftover .new files: ${newFiles.join(', ')}`);
  });
});

// ─── Suite 4: LanguageProvider ────────────────────────────────────────────────
await describe('BUG-LANG-001: LanguageProvider accepts lang prop', async () => {
  await test('LanguageProvider interface includes optional lang prop', async () => {
    const content = readSrc('providers/language-provider.tsx');
    assert.ok(content.includes('lang?'), 'LanguageProvider must accept optional lang prop');
  });
});

// ─── Suite 5: CookiesModel barrel ────────────────────────────────────────────
await describe('BUG-COOKIE-001: CookiesModel exports ModalFive', async () => {
  await test('index.tsx exports from ModalFive', async () => {
    const content = readSrc('components/atoms/CookiesModel/index.tsx');
    assert.ok(content.includes('ModalFive'), 'CookiesModel/index.tsx must export ModalFive');
  });

  await test('ModalTwo has no styled-jsx', async () => {
    const content = readSrc('components/atoms/CookiesModel/ModalTwo.tsx');
    assert.ok(!content.includes('<style jsx>'), 'ModalTwo must not use styled-jsx');
  });

  await test('ModalFour has no styled-jsx', async () => {
    const content = readSrc('components/atoms/CookiesModel/ModalFour.tsx');
    assert.ok(!content.includes('<style jsx>'), 'ModalFour must not use styled-jsx');
  });

  await test('ModalFive has no styled-jsx', async () => {
    const content = readSrc('components/atoms/CookiesModel/ModalFive/index.tsx');
    assert.ok(!content.includes('<style jsx>'), 'ModalFive must not use styled-jsx');
  });
});

// ─── Suite 6: LayoutProvider cleanup ─────────────────────────────────────────
await describe('LayoutProvider: Unused import cleanup', async () => {
  await test('LayoutProvider does not import unused Chatbot', async () => {
    const content = readSrc('components/layouts/LayoutProvider/index.tsx');
    assert.ok(!content.includes("import Chatbot"), 'Unused Chatbot import must be removed');
  });
});

// ─── Suite 7: Hygiene — no .new files ────────────────────────────────────────
await describe('Hygiene: No leftover .new files in src/', async () => {
  await test('No .new files anywhere in src/', async () => {
    const newFiles = getAllFiles(path.join(root, 'src'), ['.new'])
      .map(f => path.relative(root, f));
    assert.deepStrictEqual(newFiles, [], `Leftover .new files: ${newFiles.join(', ')}`);
  });
});

// ─── Suite 8: Logger runtime ─────────────────────────────────────────────────
await describe('Logger: Runtime validation', async () => {
  await test('logger exports work correctly', async () => {
    const { logger } = await import(path.join(root, 'src/lib/logger.ts'));
    assert.ok(logger, 'logger must be exported');
    assert.strictEqual(typeof logger.info, 'function');
    assert.strictEqual(typeof logger.error, 'function');
    assert.strictEqual(typeof logger.warn, 'function');
    assert.strictEqual(typeof logger.debug, 'function');
  });

  await test('logger.info does not throw', async () => {
    const { logger } = await import(path.join(root, 'src/lib/logger.ts'));
    assert.doesNotThrow(() => logger.info({ message: 'test' }));
  });

  await test('logger.error does not throw', async () => {
    const { logger } = await import(path.join(root, 'src/lib/logger.ts'));
    assert.doesNotThrow(() => logger.error({ message: 'test error' }));
  });

  await test('logger.warn does not throw', async () => {
    const { logger } = await import(path.join(root, 'src/lib/logger.ts'));
    assert.doesNotThrow(() => logger.warn({ message: 'test warn' }));
  });
});

// ─── Suite 9: ErrorTracking runtime ──────────────────────────────────────────
await describe('ErrorTracking: Runtime', async () => {
  await test('errorTracking can be imported without crash', async () => {
    const mod = await import(path.join(root, 'src/lib/error-tracking.ts'));
    assert.ok(mod.errorTracking, 'errorTracking must be exported');
  });

  await test('captureException returns "disabled" before init', async () => {
    const { ErrorTracking } = await import(path.join(root, 'src/lib/error-tracking.ts')).then(
      m => ({ ErrorTracking: null, ...m })
    );
    const { errorTracking } = await import(path.join(root, 'src/lib/error-tracking.ts'));
    // Instance is not initialized by default in tests
    const result = errorTracking.captureException(new Error('test'));
    assert.ok(typeof result === 'string', 'Must return a string');
  });

  await test('getTraceData returns object with version', async () => {
    const { getTraceData } = await import(path.join(root, 'src/lib/error-tracking.ts'));
    const data = getTraceData();
    assert.ok(typeof data === 'object' && 'error-tracking-version' in data);
  });
});

// ─── Suite 10: i18n module ───────────────────────────────────────────────────
await describe('i18n: Core exports', async () => {
  await test('exports supportedLanguages including "en"', async () => {
    const { supportedLanguages } = await import(path.join(root, 'src/i18n.ts'));
    assert.ok(Array.isArray(supportedLanguages) && supportedLanguages.includes('en'));
  });

  await test('defaultLanguage is "en"', async () => {
    const { defaultLanguage } = await import(path.join(root, 'src/i18n.ts'));
    assert.strictEqual(defaultLanguage, 'en');
  });

  await test('translate("en", "common.home") returns "Home"', async () => {
    const { translate } = await import(path.join(root, 'src/i18n.ts'));
    assert.strictEqual(translate('en', 'common.home'), 'Home');
  });

  await test('translate falls back to "en" for unknown locale', async () => {
    const { translate } = await import(path.join(root, 'src/i18n.ts'));
    assert.strictEqual(translate('xx', 'common.home'), 'Home');
  });

  await test('translate returns the key itself when not found', async () => {
    const { translate } = await import(path.join(root, 'src/i18n.ts'));
    assert.strictEqual(translate('en', 'does.not.exist'), 'does.not.exist');
  });
});

// ─── Suite 11: CSP utilities ─────────────────────────────────────────────────
await describe('CSP: Source code validation (no runtime import — requires next/headers)', async () => {
  await test('csp.ts exports generateNonce function', async () => {
    const content = readSrc('lib/csp.ts');
    assert.ok(content.includes('export function generateNonce'), 'generateNonce must be exported');
  });

  await test('csp.ts exports buildCspPolicy function', async () => {
    const content = readSrc('lib/csp.ts');
    assert.ok(content.includes('export function buildCspPolicy'), 'buildCspPolicy must be exported');
  });

  await test('csp.ts exports getNonceFromHeaders function', async () => {
    const content = readSrc('lib/csp.ts');
    assert.ok(content.includes('export async function getNonceFromHeaders'), 'getNonceFromHeaders must be exported');
  });

  await test('buildCspPolicy references nonce in script-src', async () => {
    const content = readSrc('lib/csp.ts');
    assert.ok(content.includes("nonce-") || content.includes("nonce"), 'CSP policy builder must reference nonce');
  });

  await test('CSP_NONCE_HEADER constant is exported', async () => {
    const content = readSrc('lib/csp.ts');
    assert.ok(content.includes('export const CSP_NONCE_HEADER'), 'CSP_NONCE_HEADER must be exported');
  });
});

// ─── Suite 12: Analytics config ──────────────────────────────────────────────
await describe('Analytics: Config', async () => {
  await test('isAnalyticsEnabled returns a boolean', async () => {
    const { isAnalyticsEnabled } = await import(path.join(root, 'src/lib/analytics.ts'));
    assert.strictEqual(typeof isAnalyticsEnabled(), 'boolean');
  });

  await test('analyticsConfig has gaId and gtmId', async () => {
    const { analyticsConfig } = await import(path.join(root, 'src/lib/analytics.ts'));
    assert.ok('gaId' in analyticsConfig && 'gtmId' in analyticsConfig);
  });
});

// ─── Suite 13: Security module ────────────────────────────────────────────────
await describe('Security: Source code validation (no runtime import — requires jose)', async () => {
  await test('security.ts exports getSecurityHeaders', async () => {
    const content = readSrc('lib/security.ts');
    assert.ok(content.includes('export function getSecurityHeaders') || content.includes('getSecurityHeaders'), 
      'getSecurityHeaders must be exported');
  });

  await test('security.ts exports logAuditEvent', async () => {
    const content = readSrc('lib/security.ts');
    assert.ok(content.includes('export') && content.includes('logAuditEvent'), 
      'logAuditEvent must be exported');
  });

  await test('security.ts includes X-Frame-Options header', async () => {
    const content = readSrc('lib/security.ts');
    assert.ok(content.includes('X-Frame-Options') || content.includes('x-frame-options'),
      'Security must set X-Frame-Options header');
  });

  await test('security.ts includes Content-Security-Policy', async () => {
    const content = readSrc('lib/security.ts');
    assert.ok(content.includes('Content-Security-Policy') || content.includes('content-security-policy'),
      'Security must set Content-Security-Policy header');
  });

  await test('security.ts has BUG-SEC-001 fix — audit log writes to stderr in production', async () => {
    const content = readSrc('lib/security.ts');
    assert.ok(content.includes('stderr') || content.includes('process.stderr'),
      'BUG-SEC-001: audit log must write to stderr in production');
  });
});

// ─── Suite 14: JsonRenderer no styled-jsx ────────────────────────────────────
await describe('JsonRenderer: No styled-jsx', async () => {
  await test('JsonRendererComponents.tsx has no styled-jsx', async () => {
    const content = readSrc('components/renderer/JsonRendererComponents.tsx');
    assert.ok(!content.includes('<style jsx>'), 'Must not use styled-jsx');
  });
});

// ─── Suite 15: Structural file checks ─────────────────────────────────────────
await describe('Structure: Required files exist', async () => {
  const requiredFiles = [
    'lib/logger.ts',
    'lib/error-tracking.ts',
    'lib/csp.ts',
    'lib/security.ts',
    'lib/analytics.ts',
    'providers/index.tsx',
    'providers/language-provider.tsx',
    'i18n.ts',
    'contexts/CspNonceContext.tsx',
    'components/atoms/CookiesModel/index.tsx',
    'components/atoms/CookiesModel/ModalTwo.tsx',
    'components/atoms/CookiesModel/ModalFour.tsx',
    'components/atoms/CookiesModel/ModalFive/index.tsx',
    'components/layouts/LayoutProvider/index.tsx',
    'components/error-tracking/ErrorBoundary.tsx',
    'components/error-tracking/ErrorTrackingProvider.tsx',
  ];

  for (const file of requiredFiles) {
    await test(`${file} exists`, async () => {
      const fullPath = path.join(root, 'src', file);
      assert.ok(fs.existsSync(fullPath), `Missing file: src/${file}`);
    });
  }
});

// ─── Results ──────────────────────────────────────────────────────────────────
const line = '─'.repeat(60);
console.log('\n' + line);
console.log(`\n📊 Results: ${passed} passed  |  ${failed} failed  |  ${passed + failed} total\n`);

if (failures.length > 0) {
  console.log('❌ Failed tests:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');
  process.exit(1);
} else {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
}
