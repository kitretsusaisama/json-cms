/**
 * @upflame/json-cms — Universal Install Command
 *
 * Detects the host project framework and installs @upflame/json-cms
 * with the correct adapter, configuration, and integration files.
 *
 * Supports: Next.js, Remix, Nuxt, SvelteKit, Astro, Gatsby, Angular,
 *           Qwik, Vite (React/Vue/Svelte/Solid), Express, Fastify
 */

import { mkdir, writeFile, readFile, stat, copyFile } from "fs/promises";
import { join, dirname } from "path";
import { execSync } from "child_process";
import {
  detectFramework,
  formatDetectionSummary,
  getFrameworkInfoById,
  parseFrameworkId,
  type FrameworkInfo,
  type PackageManager,
} from "../detectors/framework-detector";
import { getSetupFilesForFramework } from "../adapters/template-generator";
import * as log from "../helpers/logger";
import { scaffoldDataDirectory as scaffoldInstallerDataDirectory } from "@upflame/installer-core";
import { evaluateCompatibility, loadCompatibilityMatrix } from "../compatibility-matrix";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstallOptions {
  /** Skip interactive prompts (use defaults) */
  yes?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
  /** Don't install npm package (just generate files) */
  skipInstall?: boolean;
  /** Don't create data directory scaffold */
  skipData?: boolean;
  /** Specify framework manually (bypass detection) */
  framework?: string;
  /** Custom data directory */
  dataDir?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run — show what would happen without doing it */
  dryRun?: boolean;
}

export interface InstallResult {
  success: boolean;
  framework: FrameworkInfo;
  filesCreated: string[];
  filesSkipped: string[];
  errors: string[];
  warnings: string[];
  nextSteps: string[];
}

// ─── Install Command ──────────────────────────────────────────────────────────

export async function runInstall(opts: InstallOptions = {}): Promise<InstallResult> {
  const rootDir = process.cwd();
  const result: InstallResult = {
    success: false,
    framework: null!,
    filesCreated: [],
    filesSkipped: [],
    errors: [],
    warnings: [],
    nextSteps: [],
  };

  // ── Banner ─────────────────────────────────────────────────────────────────
  printBanner();

  // ── Detect Framework ───────────────────────────────────────────────────────
  log.step(1, 5, "Detecting project framework...");

  let info: FrameworkInfo;
  try {
    if (opts.framework) {
      const forcedFramework = parseFrameworkId(opts.framework);
      if (!forcedFramework) {
        result.errors.push(`Unsupported framework override: ${opts.framework}`);
        log.fatal(`Unsupported framework override: ${opts.framework}`);
        log.info("Use one of: nextjs, remix, nuxt, sveltekit, astro, gatsby, angular, qwik, vite-react, vite-vue, vite-svelte, vite-solid, express, fastify, unknown");
        return result;
      }

      info = await getFrameworkInfoById(forcedFramework, rootDir);
      log.warn(`Manual override: --framework=${forcedFramework}`);
    } else {
      info = await detectFramework(rootDir);
    }

    result.framework = info;

    if (info.id === "unknown") {
      log.warn("Could not detect a supported framework.");
      log.info("Supported frameworks: Next.js, Remix, Nuxt, SvelteKit, Astro, Gatsby,");
      log.info("                     Angular, Qwik, Vite (React/Vue/Svelte/Solid), Express, Fastify");
      log.info("Proceeding with generic installation...");
    } else {
      log.success(`Detected: ${info.name}${info.version ? ` v${info.version}` : ""}`);
    }

    if (opts.verbose) {
      console.log("\nDetection details:");
      console.log(formatDetectionSummary(info));
      console.log();
    }
  } catch (err) {
    result.errors.push(`Framework detection failed: ${err instanceof Error ? err.message : String(err)}`);
    log.fatal("Framework detection failed. Run from your project root directory.");
    return result;
  }

  // ── Compatibility Check ────────────────────────────────────────────────────
  const compat = await checkCompatibility(info, rootDir);
  if (compat.warnings.length > 0) {
    compat.warnings.forEach((w) => {
      log.warn(w);
      result.warnings.push(w);
    });
  }
  if (compat.errors.length > 0) {
    compat.errors.forEach((e) => {
      log.error(e);
      result.errors.push(e);
    });
    if (!opts.force) {
      log.error("Use --force to install anyway.");
      return result;
    }
  }

  // ── Install NPM Package ────────────────────────────────────────────────────
  if (!opts.skipInstall) {
    log.step(2, 5, "Installing @upflame/json-cms package...");

    if (opts.dryRun) {
      log.info(`[DRY RUN] Would run: ${getInstallCommand(info.packageManager)}`);
    } else {
      try {
        const installCmd = getInstallCommand(info.packageManager);
        log.info(`Running: ${installCmd}`);
        execSync(installCmd, { cwd: rootDir, stdio: opts.verbose ? "inherit" : "pipe" });
        log.success("Package installed");
      } catch (err) {
        const msg = `Package installation failed: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(msg);
        result.warnings.push("Continuing with file generation — install the package manually.");
        log.warn("Package install failed — continuing with file generation.");
        log.info(`Install manually: npm install @upflame/json-cms`);
      }
    }
  } else {
    log.step(2, 5, "Skipping package install (--skip-install)");
  }

  // ── Generate Integration Files ─────────────────────────────────────────────
  log.step(3, 5, `Generating ${info.name} integration files...`);
  const setupFiles = getSetupFilesForFramework(info);

  for (const file of setupFiles) {
    const filePath = join(rootDir, file.path);
    const isCanonicalConfig = file.path === "cms.config.ts";
    const legacyConfigPath = join(rootDir, "jsoncms.config.ts");

    if (isCanonicalConfig && (await fileExists(legacyConfigPath)) && !(await fileExists(filePath))) {
      const warning = "Detected legacy jsoncms.config.ts. Keeping legacy config (deprecated); migrate to cms.config.ts when convenient.";
      log.warn(`  ${warning}`);
      result.warnings.push(warning);
      result.filesSkipped.push(file.path);
      continue;
    }

    if (opts.dryRun) {
      log.info(`[DRY RUN] Would create: ${file.path}`);
      result.filesCreated.push(file.path);
      continue;
    }

    const exists = await fileExists(filePath);
    if (exists && !opts.force) {
      log.warn(`  Skipping (exists): ${file.path}  (use --force to overwrite)`);
      result.filesSkipped.push(file.path);
      continue;
    }

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, "utf-8");
      log.success(`  Created: ${file.path}`);
      result.filesCreated.push(file.path);

      if (file.installNote) {
        log.info(`  Note: ${file.installNote}`);
      }
    } catch (err) {
      const msg = `Failed to create ${file.path}: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      log.error(`  Failed: ${file.path}`);
    }
  }

  // ── Scaffold Data Directory ────────────────────────────────────────────────
  if (!opts.skipData) {
    log.step(4, 5, "Creating data directory scaffold...");
    const dataDir = opts.dataDir ?? info.adapter.dataDir;

    if (opts.dryRun) {
      log.info(`[DRY RUN] Would scaffold: ${dataDir}/`);
    } else {
      const createdDataFiles = await scaffoldInstallerDataDirectory(rootDir, dataDir);
      for (const created of createdDataFiles) {
        log.success(`  Created: ${created}`);
        result.filesCreated.push(created);
      }
      log.success(`  Data directory ready: ${dataDir}/`);
    }
  } else {
    log.step(4, 5, "Skipping data scaffold (--skip-data)");
  }

  // ── Environment Setup ──────────────────────────────────────────────────────
  log.step(5, 5, "Finalizing environment setup...");

  if (!opts.dryRun) {
    await updateGitignore(rootDir, result);
    await createEnvExample(rootDir, info, result);
    updatePackageJsonScripts(rootDir, result);
  } else {
    log.info("[DRY RUN] Would update .gitignore, .env.example, package.json scripts");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  result.success = result.errors.length === 0;
  result.nextSteps = buildNextSteps(info, opts);
  printSummary(result, info, opts);

  return result;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function printBanner(): void {
  console.log();
  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║          @upflame/json-cms  —  Universal Installer       ║");
  console.log("  ║     Enterprise JSON CMS for Every JavaScript Framework   ║");
  console.log("  ╚══════════════════════════════════════════════════════════╝");
  console.log();
}

function printSummary(result: InstallResult, info: FrameworkInfo, opts: InstallOptions): void {
  console.log();
  console.log("  ─────────────────────────────────────────────────────────");
  console.log(`  ${result.success ? "✅ Installation complete!" : "⚠️  Installation completed with warnings"}`);
  console.log("  ─────────────────────────────────────────────────────────");
  console.log();

  if (result.filesCreated.length > 0) {
    console.log(`  Files created (${result.filesCreated.length}):`);
    result.filesCreated.forEach((f) => console.log(`    ✓  ${f}`));
    console.log();
  }

  if (result.filesSkipped.length > 0) {
    console.log(`  Files skipped (${result.filesSkipped.length} already existed):`);
    result.filesSkipped.forEach((f) => console.log(`    -  ${f}`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log("  Warnings:");
    result.warnings.forEach((w) => console.log(`    ⚠  ${w}`));
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("  Errors:");
    result.errors.forEach((e) => console.log(`    ✗  ${e}`));
    console.log();
  }

  if (result.nextSteps.length > 0) {
    console.log("  Next steps:");
    result.nextSteps.forEach((s, i) => console.log(`    ${i + 1}.  ${s}`));
    console.log();
  }

  console.log(`  Documentation: https://json-cms.upflame.dev/docs/${info.id}`);
  console.log();
}

function getInstallCommand(pm: PackageManager): string {
  const pkg = "@upflame/json-cms";
  switch (pm) {
    case "bun": return `bun add ${pkg}`;
    case "pnpm": return `pnpm add ${pkg}`;
    case "yarn": return `yarn add ${pkg}`;
    default: return `npm install ${pkg}`;
  }
}

interface CompatibilityResult {
  warnings: string[];
  errors: string[];
}

async function checkCompatibility(info: FrameworkInfo, rootDir: string): Promise<CompatibilityResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const dependencies: Record<string, string> = {};
  try {
    const projectPkg = JSON.parse(await readFile(join(rootDir, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    Object.assign(dependencies, projectPkg.dependencies ?? {}, projectPkg.devDependencies ?? {});
  } catch {
    warnings.push("Could not read package.json for compatibility preflight; framework-only checks applied.");
  }

  try {
    const matrix = await loadCompatibilityMatrix(rootDir);
    const compatIssues = evaluateCompatibility({
      matrix,
      nodeVersion: process.version,
      framework: { id: info.id, version: info.version },
      dependencies,
    });

    for (const issue of compatIssues) {
      errors.push(`${issue.message} Remediation: ${issue.remediation.join(" ")}`);
    }
  } catch (error) {
    errors.push(`Compatibility matrix preflight failed: ${error instanceof Error ? error.message : String(error)}.`);
    errors.push("Fix compatibility/compat-matrix.json or remove the malformed override file and rerun `cms init`/`create-json-cms`.");
  }

  // Framework-specific compatibility notes
  if (info.id === "angular") {
    warnings.push("Angular integration is client-side only — you need a separate API server for CMS data.");
  }

  if (info.id === "gatsby") {
    warnings.push("Gatsby integration generates static pages at build time. Dynamic personalization is limited.");
  }

  if (["vite-react", "vite-vue", "vite-svelte", "vite-solid"].includes(info.id)) {
    warnings.push("Vite-only projects need a separate Express/Fastify server for the CMS API.");
    warnings.push("Consider using SvelteKit, Nuxt, or Remix for full SSR support.");
  }

  if (!info.features.apiRoutes && info.id !== "unknown") {
    warnings.push(`${info.name} does not support API routes. CMS will run in client-only mode.`);
  }

  return { warnings, errors };
}

async function updateGitignore(rootDir: string, result: InstallResult): Promise<void> {
  const gitignorePath = join(rootDir, ".gitignore");
  const additions = [
    "",
    "# @upflame/json-cms",
    ".jsoncms-cache/",
    "data/plugins/*/config.json",
    "*.jsoncms-compiled",
  ].join("\n");

  try {
    let content = "";
    try {
      content = await readFile(gitignorePath, "utf-8");
    } catch {
      // File doesn't exist — create it
    }

    if (!content.includes("@upflame/json-cms")) {
      await writeFile(gitignorePath, content + additions + "\n");
      log.success("  Updated: .gitignore");
      result.filesCreated.push(".gitignore (updated)");
    }
  } catch {
    result.warnings.push("Could not update .gitignore — add .jsoncms-cache/ manually.");
  }
}

async function createEnvExample(
  rootDir: string,
  info: FrameworkInfo,
  result: InstallResult
): Promise<void> {
  const envPath = join(rootDir, ".env.example");
  const envContent = `# @upflame/json-cms Environment Variables
# Copy to .env.local and fill in values

# REQUIRED: JWT secret for CMS API authentication (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# OPTIONAL: Path to JSON data directory (default: ${info.adapter.dataDir})
DATA_DIR=${info.adapter.dataDir}

# OPTIONAL: Redis connection URL for distributed caching
# REDIS_URL=redis://localhost:6379

# OPTIONAL: AI provider API key for content generation
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# OPTIONAL: Sentry DSN for error tracking
# SENTRY_DSN=https://...@sentry.io/...

# OPTIONAL: CMS admin password for the dashboard
# CMS_ADMIN_PASSWORD=your-admin-password
`;

  if (!(await fileExists(envPath))) {
    await writeFile(envPath, envContent);
    log.success("  Created: .env.example");
    result.filesCreated.push(".env.example");
  }
}

function updatePackageJsonScripts(rootDir: string, result: InstallResult): void {
  try {
    const pkgPath = join(rootDir, "package.json");
    // Non-async read to avoid complexity — we fire-and-forget
    const content = require("fs").readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
    pkg.scripts = pkg.scripts ?? {};

    const newScripts: Record<string, string> = {
      "cms:validate": "jsoncms validate --all",
      "cms:plan": "jsoncms plan",
      "cms:generate": "jsoncms generate",
      "cms:check": "jsoncms check",
      "cms:integrity": "jsoncms integrity --generate",
    };

    let added = 0;
    for (const [key, value] of Object.entries(newScripts)) {
      if (!pkg.scripts[key]) {
        pkg.scripts[key] = value;
        added++;
      }
    }

    if (added > 0) {
      require("fs").writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      log.success(`  Updated: package.json (added ${added} CMS scripts)`);
      result.filesCreated.push("package.json (scripts updated)");
    }
  } catch {
    result.warnings.push("Could not update package.json scripts — add them manually.");
  }
}

function buildNextSteps(info: FrameworkInfo, opts: InstallOptions): string[] {
  const steps: string[] = [];

  // Universal first step — env setup
  steps.push("Copy .env.example to .env.local and set JWT_SECRET (min 32 chars)");

  // Framework-specific steps
  switch (info.id) {
    case "nextjs":
      steps.push("Review src/app/api/cms/pages/[slug]/route.ts");
      steps.push("Review src/app/[[...slug]]/page.tsx");
      steps.push("Run: npm run dev");
      steps.push("Visit: http://localhost:3000/home");
      break;
    case "remix":
      steps.push("Review app/routes/cms.$slug.ts");
      steps.push("Run: npm run dev");
      steps.push("Visit: http://localhost:3000/cms/home");
      break;
    case "nuxt":
      steps.push("Review server/api/cms/pages/[slug].get.ts");
      steps.push("Review pages/[...slug].vue");
      steps.push("Run: npm run dev");
      steps.push("Visit: http://localhost:3000/home");
      break;
    case "sveltekit":
      steps.push("Review src/routes/api/cms/pages/[slug]/+server.ts");
      steps.push("Review src/routes/[...slug]/+page.server.ts");
      steps.push("Run: npm run dev");
      steps.push("Visit: http://localhost:5173");
      break;
    case "astro":
      steps.push("Review src/pages/api/cms/pages/[slug].ts");
      steps.push("Review src/pages/[...slug].astro");
      steps.push("Add output: 'server' to astro.config.mjs for SSR");
      steps.push("Run: npm run dev");
      break;
    case "express":
    case "fastify":
      steps.push(`Review src/routes/cms.ts`);
      steps.push(`Register the CMS router/plugin in your main app file`);
      steps.push("Run: npm run dev");
      steps.push("Test: curl http://localhost:3001/api/cms/pages/home");
      break;
    case "angular":
      steps.push("Review src/app/cms/cms.service.ts");
      steps.push("Add CmsPageComponent to your router");
      steps.push("Set up a separate Express API server for CMS data");
      steps.push("Run: ng serve");
      break;
    default:
      steps.push("Review the generated integration files");
      steps.push("Run: npm run dev");
  }

  // Universal last steps
  steps.push("Run: jsoncms validate --all  (verify data files)");
  steps.push("Run: jsoncms integrity --generate  (sign data files)");
  steps.push("Read the docs: https://json-cms.upflame.dev");

  return steps;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
