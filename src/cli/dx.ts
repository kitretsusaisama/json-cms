#!/usr/bin/env tsx
/**
 * @upflame/json-cms — Developer CLI v2.0
 *
 * Supports any JavaScript framework via auto-detection.
 *
 * INSTALL:
 *   jsoncms install              Auto-detect framework + install everything
 *   jsoncms install --dry-run    Preview what would be installed
 *   jsoncms install --framework remix   Manual override
 *
 * VALIDATE:
 *   jsoncms validate <slug>      Validate a page against its schema
 *   jsoncms validate --all       Validate all pages and blocks
 *   jsoncms validate --type block <n>
 *
 * PLAN:
 *   jsoncms plan <slug>          Run resolve + plan pipeline
 *   jsoncms plan home --json     Output as JSON
 *   jsoncms plan home --locale fr
 *
 * DEBUG:
 *   jsoncms debug page <slug>    Full pipeline debug report
 *   jsoncms doctor               System health check
 *
 * GENERATE:
 *   jsoncms generate page <slug>
 *   jsoncms generate block <n>
 *   jsoncms generate component <n>
 *   jsoncms generate plugin <n>
 *
 * CHECK:
 *   jsoncms check                Validate all schemas + data files
 *   jsoncms check seo <slug>     SEO health check
 *
 * INTEGRITY:
 *   jsoncms integrity --generate
 *   jsoncms integrity --verify
 *
 * CACHE:
 *   jsoncms cache:warm           Pre-warm resolver cache
 *   jsoncms cache:purge [slug]   Purge cache entries
 *
 * PLUGIN:
 *   jsoncms validate-plugin <dir>  Validate a plugin directory
 *   jsoncms plugin list            List installed plugins
 */

import { Command } from "commander";
import { readFile, writeFile, mkdir, stat, readdir } from "fs/promises";
import { join, resolve, dirname } from "path";
import { validateContent, verifyIntegrity, generateIntegrityManifest } from "../lib/compose/validator";
import { planPage } from "../lib/compose/planner";
import { loadResolvedPage } from "../lib/compose/resolve";
import { assertSafeId } from "../lib/security";
import { validateManifest } from "../plugin-sdk/manifest";
import { detectFramework, formatDetectionSummary } from "./detectors/framework-detector";
import { runInstall } from "./commands/install";
import * as log from "./helpers/logger";
import { evaluateCompatibility, loadCompatibilityMatrix } from "./compatibility-matrix";

const program = new Command();
const VERSION = "2.0.0";
const DATA_DIR = process.env.DATA_DIR ?? "./data";

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT PROGRAM
// ─────────────────────────────────────────────────────────────────────────────

program
  .name("jsoncms")
  .description("@upflame/json-cms — Universal JSON CMS developer toolkit")
  .version(VERSION)
  .addHelpText("after", `
Examples:
  $ jsoncms install                 # Auto-detect framework and install
  $ jsoncms install --framework remix   # Force framework
  $ jsoncms validate home           # Validate home page
  $ jsoncms plan home --locale en   # Run pipeline and show plan
  $ jsoncms generate page about     # Scaffold a new page
  $ jsoncms debug page home         # Full pipeline debug report
  $ jsoncms doctor                  # System health check
  `);

// ─────────────────────────────────────────────────────────────────────────────
//  install  (NEW — the star of this release)
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("install")
  .description(
    "Auto-detect your framework (Next.js/Remix/Nuxt/SvelteKit/Astro/Vue/Angular/Express…)\n" +
    "  and install @upflame/json-cms with the correct adapter and integration files."
  )
  .option("-y, --yes", "Skip interactive prompts, use defaults")
  .option("-f, --force", "Overwrite existing integration files")
  .option("--skip-install", "Skip npm install (generate files only)")
  .option("--skip-data", "Skip data directory scaffolding")
  .option("--framework <id>", "Override detected framework (nextjs|remix|nuxt|sveltekit|astro|angular|vite-react|vite-vue|express|fastify|...)")
  .option("--data-dir <path>", "Override data directory path")
  .option("--dry-run", "Preview installation without making changes")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts: {
    yes?: boolean;
    force?: boolean;
    skipInstall?: boolean;
    skipData?: boolean;
    framework?: string;
    dataDir?: string;
    dryRun?: boolean;
    verbose?: boolean;
  }) => {
    try {
      const result = await runInstall({
        yes: opts.yes,
        force: opts.force,
        skipInstall: opts.skipInstall,
        skipData: opts.skipData,
        framework: opts.framework,
        dataDir: opts.dataDir,
        dryRun: opts.dryRun,
        verbose: opts.verbose,
      });

      if (!result.success) process.exit(1);
    } catch (err) {
      log.fatal(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  detect  (standalone detection without install)
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("detect")
  .description("Auto-detect the current project framework and show configuration")
  .action(async () => {
    try {
      const spinner = new log.Spinner("Detecting framework...");
      spinner.start();
      const info = await detectFramework(process.cwd());
      spinner.succeed(`Detected: ${info.name}${info.version ? ` v${info.version}` : ""}`);

      log.detectionBox(info.name, {
        Version: info.version ?? "unknown",
        TypeScript: info.typescript ? "Yes ✓" : "No",
        "Package Manager": info.packageManager,
        "Data Directory": info.adapter.dataDir,
        "API Directory": info.adapter.apiDir,
        SSR: info.features.ssr ? "✓" : "—",
        Streaming: info.features.streaming ? "✓" : "—",
        "Edge Runtime": info.features.edgeRuntime ? "✓" : "—",
        "Server Components": info.features.serverComponents ? "✓" : "—",
      });

      log.info("To install with this framework:");
      log.codeBlock([`jsoncms install`]);
    } catch (err) {
      log.fatal(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  doctor  (system health check)
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("doctor")
  .description("Run a system health check — verify environment, config, and data integrity")
  .action(async () => {
    log.header("CMS Doctor — System Health Check");
    const checks: Array<{ label: string; status: "pass" | "fail" | "warn"; detail?: string }> = [];

    // Node.js version
    const nodeVer = parseInt(process.version.slice(1), 10);
    checks.push({ label: "Node.js ≥ 18", status: nodeVer >= 18 ? "pass" : "fail", detail: process.version });

    // JWT_SECRET
    const jwtOk = (process.env.JWT_SECRET?.length ?? 0) >= 32;
    checks.push({ label: "JWT_SECRET set (≥32 chars)", status: jwtOk ? "pass" : "warn", detail: jwtOk ? "✓" : "Missing or too short" });

    // DATA_DIR exists
    try {
      await stat(DATA_DIR);
      checks.push({ label: "DATA_DIR exists", status: "pass", detail: DATA_DIR });
    } catch {
      checks.push({ label: "DATA_DIR exists", status: "fail", detail: `${DATA_DIR} not found` });
    }

    // home.json exists
    try {
      await stat(join(DATA_DIR, "pages", "home.json"));
      checks.push({ label: "pages/home.json exists", status: "pass" });
    } catch {
      checks.push({ label: "pages/home.json exists", status: "warn", detail: "No home page found" });
    }

    // Framework detection
    try {
      const info = await detectFramework(process.cwd());
      checks.push({ label: "Framework detected", status: info.id !== "unknown" ? "pass" : "warn", detail: info.id !== "unknown" ? info.name : "Could not detect" });
    } catch {
      checks.push({ label: "Framework detected", status: "fail", detail: "Detection error" });
    }

    // package.json
    let allDependencies: Record<string, string> = {};
    try {
      const pkg = JSON.parse(await readFile("package.json", "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      allDependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      const hasCms = "@upflame/json-cms" in allDependencies || "@upflame/cms-core" in allDependencies;
      checks.push({ label: "@upflame/json-cms in package.json", status: hasCms ? "pass" : "warn", detail: hasCms ? "✓" : "Run: jsoncms install" });
    } catch {
      checks.push({ label: "@upflame/json-cms in package.json", status: "warn", detail: "Could not read package.json" });
    }

    // compatibility matrix conformance
    try {
      const matrix = await loadCompatibilityMatrix(process.cwd());
      const frameworkInfo = await detectFramework(process.cwd());
      const issues = evaluateCompatibility({
        matrix,
        nodeVersion: process.version,
        framework: { id: frameworkInfo.id, version: frameworkInfo.version },
        dependencies: allDependencies,
      });

      if (issues.length === 0) {
        checks.push({ label: "Compatibility matrix conformance", status: "pass", detail: "No incompatible combinations detected" });
      } else {
        for (const issue of issues) {
          checks.push({
            label: `Compatibility: ${issue.code}`,
            status: "fail",
            detail: `${issue.message} Remediation: ${issue.remediation.join(" ")}`,
          });
        }
      }
    } catch (error) {
      checks.push({
        label: "Compatibility matrix conformance",
        status: "fail",
        detail: `Could not evaluate compatibility matrix. Remediation: fix compatibility/compat-matrix.json. (${error instanceof Error ? error.message : String(error)})`,
      });
    }

    // Print results
    console.log();
    for (const check of checks) {
      const icon = check.status === "pass" ? log.success : check.status === "warn" ? log.warn : log.error;
      const icon2 = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
      const detail = check.detail ? `  ${check.detail}` : "";
      if (check.status === "pass") console.log(`  ${"\x1b[32m"}${icon2}\x1b[0m  ${check.label}${detail}`);
      else if (check.status === "warn") console.log(`  ${"\x1b[33m"}${icon2}\x1b[0m  ${check.label}${"\x1b[33m"}${detail}\x1b[0m`);
      else console.log(`  ${"\x1b[31m"}${icon2}\x1b[0m  ${check.label}${"\x1b[31m"}${detail}\x1b[0m`);
    }

    const passed = checks.filter(c => c.status === "pass").length;
    const failed = checks.filter(c => c.status === "fail").length;
    const warned = checks.filter(c => c.status === "warn").length;

    console.log();
    log.summaryBox("Health Summary", [
      { label: "Passed", value: passed, type: "success" },
      { label: "Warnings", value: warned, type: warned > 0 ? "warn" : "success" },
      { label: "Failed", value: failed, type: failed > 0 ? "error" : "success" },
    ]);

    if (failed > 0) process.exit(1);
  });

// ─────────────────────────────────────────────────────────────────────────────
//  validate
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("validate [slug]")
  .description("Validate a page or block against its JSON schema")
  .option("-t, --type <type>", "Content type: page or block", "page")
  .option("-v, --verbose", "Show all warnings in detail")
  .option("--all", "Validate all pages and blocks")
  .action(async (slug: string | undefined, opts: { type: "page" | "block"; verbose?: boolean; all?: boolean }) => {
    try {
      if (opts.all || !slug) {
        const ok = await validateAll(opts.verbose);
        if (!ok) process.exit(1);
        return;
      }
      assertSafeId(slug, "slug");
      log.info(`Validating ${opts.type}: ${slug}`);
      const result = await validateContent(opts.type, slug);
      printValidationResult(result, slug, opts.verbose);
      if (!result.valid) process.exit(1);
    } catch (err) {
      log.fatal(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  plan
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("plan <slug>")
  .description("Run the resolve + plan pipeline and display the plan output")
  .option("--ctx <json>", "Context JSON string", "{}")
  .option("--locale <locale>", "Locale (e.g., en, fr)")
  .option("--device <device>", "Device context (mobile|tablet|desktop)")
  .option("--ab <bucket>", "A/B bucket (0-100)", "0")
  .option("--json", "Output raw JSON")
  .option("-v, --verbose", "Verbose output")
  .action(async (slug: string, opts: { ctx: string; locale?: string; device?: string; ab: string; json?: boolean; verbose?: boolean }) => {
    try {
      assertSafeId(slug, "page slug");
      let userCtx: Record<string, unknown> = {};
      try { userCtx = JSON.parse(opts.ctx) as Record<string, unknown>; } catch {
        log.fatal(`--ctx must be valid JSON. Got: ${opts.ctx}`); process.exit(1);
      }

      const resolveCtx = { locale: opts.locale };
      const planCtx = { ...userCtx, abBucket: parseInt(opts.ab, 10), device: opts.device };

      const spinner = new log.Spinner(`Resolving ${slug}...`);
      spinner.start();
      const loaded = await loadResolvedPage(slug, planCtx, resolveCtx);
      spinner.succeed(`Resolved ${slug} (${Object.keys(loaded.blocks).length} blocks)`);

      const plan = planPage({ page: loaded.page, ctx: planCtx, blocks: loaded.blocks });

      if (opts.json) {
        console.log(JSON.stringify({ slug, plan, warnings: loaded.warnings }, null, 2));
        return;
      }

      log.header(`Plan: ${slug}`);
      log.summaryBox("Pipeline Metrics", [
        { label: "Components", value: plan.metrics.totalComponents },
        { label: "Total weight", value: plan.metrics.totalWeight },
        { label: "Fold weight", value: plan.metrics.foldWeight },
        { label: "Constraints passed", value: plan.metrics.constraintsPassed, type: "success" },
        { label: "Constraints failed", value: plan.metrics.constraintsFailed, type: plan.metrics.constraintsFailed > 0 ? "error" : "success" },
        { label: "Variants selected", value: plan.metrics.variantsSelected },
      ]);

      if (plan.components.length > 0) {
        console.log(`  Components (${plan.components.length}):`);
        for (const c of plan.components) {
          const variant = c.variant ? ` [${c.variant}]` : "";
          console.log(`    • ${c.key}${variant}  id:${c.id}  weight:${c.weight ?? 1}`);
        }
        console.log();
      }

      const allWarnings = [...plan.warnings, ...loaded.warnings];
      if (allWarnings.length > 0) {
        console.log("  Warnings:");
        allWarnings.forEach(w => log.warn(`  ${w}`));
      }

      if (plan.errors.length > 0) {
        console.log("  Errors:");
        plan.errors.forEach(e => log.error(`  ${e}`));
        process.exit(1);
      }

      log.success("Plan succeeded");
    } catch (err) {
      log.fatal(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  debug
// ─────────────────────────────────────────────────────────────────────────────

const debug = program.command("debug").description("Debug CMS internals");

debug
  .command("page <slug>")
  .description("Run the full pipeline with verbose debug output")
  .option("--locale <locale>", "Locale")
  .action(async (slug: string, opts: { locale?: string }) => {
    try {
      assertSafeId(slug, "slug");
      log.header(`Debug: ${slug}`);

      const start = Date.now();
      const loaded = await loadResolvedPage(slug, {}, { locale: opts.locale });
      const resolveMs = Date.now() - start;
      log.success(`Resolved in ${resolveMs}ms`);
      log.info(`  Page ID:  ${loaded.page.id}`);
      log.info(`  Title:    ${loaded.page.title}`);
      log.info(`  Blocks:   ${loaded.page.blocks.join(", ") || "(none)"}`);
      log.info(`  Loaded blocks: ${Object.keys(loaded.blocks).join(", ") || "(none)"}`);

      if (loaded.warnings.length) {
        console.log("\n  Resolve warnings:");
        loaded.warnings.forEach(w => log.warn(`    ${w}`));
      }

      const planStart = Date.now();
      const plan = planPage({ page: loaded.page, ctx: {}, blocks: loaded.blocks });
      const planMs = Date.now() - planStart;
      log.success(`Planned in ${planMs}ms`);

      log.summaryBox("Plan Output", [
        { label: "Components", value: plan.components.length },
        { label: "Constraints passed", value: plan.metrics.constraintsPassed, type: "success" },
        { label: "Constraints failed", value: plan.metrics.constraintsFailed, type: plan.metrics.constraintsFailed > 0 ? "error" : "success" },
        { label: "Total pipeline", value: `${resolveMs + planMs}ms`, type: resolveMs + planMs < 10 ? "success" : resolveMs + planMs < 50 ? "info" : "warn" },
      ]);

      if (plan.errors.length) {
        plan.errors.forEach(e => log.error(e));
        process.exit(1);
      }
    } catch (err) {
      log.fatal(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

debug
  .command("events")
  .description("Show recent event bus activity")
  .action(async () => {
    try {
      const { eventBus } = await import("../lib/events/event-bus");
      const events = eventBus.recentEvents(20);
      log.header("Recent Events");
      if (events.length === 0) {
        log.info("No events recorded yet. Run some pipeline operations first.");
        return;
      }
      events.forEach(e => {
        console.log(`  ${new Date(e.timestamp).toISOString().slice(11, 23)}  ${String(e.name).padEnd(30)} ${JSON.stringify(e.payload).slice(0, 60)}`);
      });
    } catch {
      log.warn("Event bus not yet initialized in current process.");
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  generate
// ─────────────────────────────────────────────────────────────────────────────

const generate = program.command("generate").description("Scaffold CMS content and integration files");

generate
  .command("page <slug>")
  .description("Scaffold a new page JSON file in data/pages/")
  .option("--title <title>", "Page title")
  .option("--blocks <blocks>", "Comma-separated block IDs", "")
  .action(async (slug: string, opts: { title?: string; blocks: string }) => {
    try {
      assertSafeId(slug, "page slug");
      const dest = join(DATA_DIR, "pages", `${slug}.json`);
      await ensureNotExists(dest, `Page "${slug}" already exists`);
      const blocks = opts.blocks ? opts.blocks.split(",").map(b => b.trim()) : [];
      const pageJson = {
        id: slug, title: opts.title ?? titleCase(slug), blocks,
        prepend: [], append: [], constraints: [],
        seo: { title: opts.title ?? titleCase(slug), description: "" },
      };
      await mkdir(join(DATA_DIR, "pages"), { recursive: true });
      await writeFile(dest, JSON.stringify(pageJson, null, 2) + "\n");
      log.success(`Created: ${dest}`);
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

generate
  .command("block <name>")
  .description("Scaffold a new block JSON file in data/blocks/")
  .option("--components <components>", "Comma-separated component keys", "")
  .action(async (name: string, opts: { components: string }) => {
    try {
      assertSafeId(name, "block name");
      const dest = join(DATA_DIR, "blocks", `${name}.json`);
      await ensureNotExists(dest, `Block "${name}" already exists`);
      const components = opts.components ? opts.components.split(",").map(k => k.trim()) : [];
      const blockJson = {
        id: name,
        tree: components.map((key, i) => ({ id: `${name}-${key.toLowerCase()}-${i + 1}`, key, props: {}, weight: 1, conditions: [] })),
        constraints: [],
      };
      await mkdir(join(DATA_DIR, "blocks"), { recursive: true });
      await writeFile(dest, JSON.stringify(blockJson, null, 2) + "\n");
      log.success(`Created: ${dest}`);
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

generate
  .command("component <name>")
  .description("Scaffold a React component with types and boilerplate")
  .option("--dir <dir>", "Output directory", "src/components/blocks")
  .option("--props <props>", "Comma-separated prop names", "")
  .action(async (name: string, opts: { dir: string; props: string }) => {
    try {
      if (!/^[A-Z][A-Za-z0-9]+$/.test(name)) {
        log.fatal(`Component name "${name}" must be PascalCase (e.g., HeroSection)`); process.exit(1);
      }
      const dest = join(opts.dir, `${name}.tsx`);
      await ensureNotExists(dest, `Component "${name}" already exists`);
      const propList = opts.props ? opts.props.split(",").map(p => p.trim()) : [];
      await mkdir(opts.dir, { recursive: true });
      await writeFile(dest, generateComponentCode(name, propList) + "\n");
      log.success(`Created: ${dest}`);
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

generate
  .command("plugin <name>")
  .description("Scaffold a complete plugin package in plugins/<name>/")
  .option("--author <author>", "Plugin author name", "Your Name")
  .option("--description <desc>", "Plugin description", "A json-cms plugin")
  .option("--license <license>", "License", "MIT")
  .action(async (name: string, opts: { author: string; description: string; license: string }) => {
    try {
      const safeName = name.replace(/[^a-z0-9-]/g, "-");
      const pluginDir = resolve(`plugins/${safeName}`);
      const packageName = `@upflame/${safeName}`;
      log.info(`Scaffolding plugin: ${packageName}`);
      const manifest = { name: packageName, version: "0.1.0", description: opts.description, author: opts.author, license: opts.license, cms: { components: [{ key: `${titleCase(safeName).replace(/\s/g, "")}Widget`, path: "./components/Widget" }] }, engines: { "json-cms": "^1.0.0" } };
      const validation = validateManifest(manifest);
      if (!validation.valid) { log.fatal(`Manifest validation failed:\n${validation.errors.join("\n")}`); process.exit(1); }
      await scaffoldPlugin(pluginDir, packageName, manifest, opts);
      log.success(`Plugin scaffolded at plugins/${safeName}/`);
      log.codeBlock([`cd plugins/${safeName}`, `npm install`, `npx jsoncms validate-plugin .`]);
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  check
// ─────────────────────────────────────────────────────────────────────────────

const check = program.command("check").description("Check schemas, SEO, and data consistency");

check
  .command("schemas")
  .alias("all")
  .description("Validate all pages and blocks")
  .option("-v, --verbose", "Show detailed output")
  .action(async (opts: { verbose?: boolean }) => {
    const ok = await validateAll(opts.verbose);
    if (!ok) process.exit(1);
  });

check
  .command("seo [slug]")
  .description("SEO health check for a page or all pages")
  .action(async (slug?: string) => {
    try {
      log.header("SEO Health Check");
      if (slug) {
        assertSafeId(slug, "slug");
        const loaded = await loadResolvedPage(slug, {});
        const page = loaded.page;
        const seo = (page as { seo?: { title?: string; description?: string; canonical?: string } }).seo;
        log.summaryBox(`SEO: ${slug}`, [
          { label: "Title", value: seo?.title ?? "(missing)", type: seo?.title ? "success" : "error" },
          { label: "Title length", value: (seo?.title?.length ?? 0), type: (seo?.title?.length ?? 0) <= 60 ? "success" : "warn" },
          { label: "Description", value: seo?.description ? "✓" : "(missing)", type: seo?.description ? "success" : "warn" },
          { label: "Description length", value: (seo?.description?.length ?? 0), type: (seo?.description?.length ?? 0) <= 160 ? "success" : "warn" },
          { label: "Canonical", value: seo?.canonical ?? "(not set)", type: "info" },
        ]);
      } else {
        log.info("Run: jsoncms check seo <slug> for a specific page");
      }
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

// Default check (no subcommand)
program
  .command("check")
  .description("Run all schema validations")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts: { verbose?: boolean }) => {
    const ok = await validateAll(opts.verbose);
    if (!ok) process.exit(1);
    else log.success("All checks passed");
  });

// ─────────────────────────────────────────────────────────────────────────────
//  integrity
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("integrity")
  .description("Verify or generate content integrity manifest")
  .option("--verify", "Verify data files against manifest")
  .option("--generate", "Generate a new integrity manifest")
  .option("--manifest <path>", "Path to manifest file")
  .action(async (opts: { verify?: boolean; generate?: boolean; manifest?: string }) => {
    try {
      if (opts.generate) {
        const spinner = new log.Spinner("Generating integrity manifest...");
        spinner.start();
        const manifestPath = opts.manifest ?? join(DATA_DIR, "_manifest.json");
        await generateIntegrityManifest(manifestPath);
        spinner.succeed(`Manifest written to ${manifestPath}`);
        return;
      }
      if (opts.verify) {
        const spinner = new log.Spinner("Verifying data file integrity...");
        spinner.start();
        const result = await verifyIntegrity(opts.manifest);
        if (!result.valid) {
          spinner.fail(`Integrity check failed (${result.errors.length} error(s))`);
          result.errors.forEach(e => log.error(`  ${e.path}: ${e.message}`));
          process.exit(1);
        }
        spinner.succeed("All data files pass integrity check");
        return;
      }
      log.warn("Specify --verify or --generate");
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  cache
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("cache:warm")
  .description("Pre-warm the resolver cache for all published pages")
  .action(async () => {
    try {
      log.header("Cache Warm");
      const pagesDir = join(DATA_DIR, "pages");
      const files = await readdir(pagesDir).catch(() => [] as string[]);
      const slugs = files.filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));

      log.info(`Found ${slugs.length} page(s) to warm`);
      let warmed = 0;
      for (const slug of slugs) {
        try {
          await loadResolvedPage(slug, {});
          log.success(`  Warmed: ${slug}`);
          warmed++;
        } catch (err) {
          log.error(`  Failed: ${slug} — ${err instanceof Error ? err.message : "unknown"}`);
        }
      }
      log.summaryBox("Cache Warm", [{ label: "Pages warmed", value: warmed, type: "success" }, { label: "Total pages", value: slugs.length }]);
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

program
  .command("cache:purge [slug]")
  .description("Purge cache entries (all, or for a specific slug)")
  .action(async (slug?: string) => {
    try {
      log.info(slug ? `Purging cache for: ${slug}` : "Purging all cache entries...");
      const { resolverCache } = await import("../lib/compose/cache");
      resolverCache.clear();
      log.success(slug ? `Cache purged for ${slug}` : "All cache entries purged");
    } catch { log.warn("Cache module not available — nothing to purge"); }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  validate-plugin
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("validate-plugin <pluginDir>")
  .description("Validate a plugin directory: manifest, components, and structure")
  .action(async (pluginDir: string) => {
    try {
      const manifestPath = join(pluginDir, "plugin.json");
      const raw = JSON.parse(await readFile(manifestPath, "utf-8")) as unknown;
      const result = validateManifest(raw);
      if (!result.valid) {
        log.error(`plugin.json validation failed:`);
        result.errors.forEach(e => log.error(`  ${e}`));
        process.exit(1);
      }
      log.success(`plugin.json valid: ${result.manifest!.name}@${result.manifest!.version}`);
      for (const comp of result.manifest!.cms.components ?? []) {
        const compPath = join(pluginDir, `${comp.path}.tsx`);
        try { await stat(compPath); log.success(`  Component: ${comp.key} → ${comp.path}`); }
        catch { log.error(`  Missing: ${comp.path}.tsx`); }
      }
    } catch (err) { log.fatal(err instanceof Error ? err.message : String(err)); process.exit(1); }
  });

program
  .command("plugin")
  .command("list")
  .description("List registered plugins")
  .action(async () => {
    log.header("Installed Plugins");
    try {
      const pluginsDir = resolve("plugins");
      const dirs = await readdir(pluginsDir).catch(() => [] as string[]);
      if (dirs.length === 0) { log.info("No plugins installed. Run: jsoncms generate plugin my-plugin"); return; }
      for (const dir of dirs) {
        try {
          const manifest = JSON.parse(await readFile(join(pluginsDir, dir, "plugin.json"), "utf-8")) as { name: string; version: string; description: string };
          log.success(`  ${manifest.name}@${manifest.version}  —  ${manifest.description}`);
        } catch { log.warn(`  ${dir}  (no plugin.json found)`); }
      }
    } catch { log.info("No plugins directory found"); }
  });

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function validateAll(verbose?: boolean): Promise<boolean> {
  log.header("Validating all content");
  let allValid = true;
  let totalPages = 0, totalBlocks = 0, totalErrors = 0, totalWarnings = 0;

  for (const type of ["pages", "blocks"] as const) {
    const dir = join(DATA_DIR, type);
    let files: string[] = [];
    try { files = (await readdir(dir)).filter(f => f.endsWith(".json")); } catch { continue; }

    for (const file of files) {
      const slug = file.replace(".json", "");
      const contentType = type === "pages" ? "page" : "block";
      const result = await validateContent(contentType as "page" | "block", slug).catch(e => ({ valid: false, errors: [{ path: slug, message: String(e) }], warnings: [] }));
      printValidationResult(result, slug, verbose);
      if (!result.valid) { allValid = false; totalErrors += result.errors.length; }
      totalWarnings += result.warnings.length;
      if (type === "pages") totalPages++; else totalBlocks++;
    }
  }

  log.summaryBox("Validation Summary", [
    { label: "Pages validated", value: totalPages },
    { label: "Blocks validated", value: totalBlocks },
    { label: "Errors", value: totalErrors, type: totalErrors > 0 ? "error" : "success" },
    { label: "Warnings", value: totalWarnings, type: totalWarnings > 0 ? "warn" : "success" },
    { label: "Result", value: allValid ? "PASS" : "FAIL", type: allValid ? "success" : "error" },
  ]);

  return allValid;
}

function printValidationResult(result: { valid: boolean; errors: Array<{ path: string; message: string }>; warnings: Array<{ path: string; message: string }> }, slug: string, verbose?: boolean) {
  if (result.valid && result.warnings.length === 0) { log.success(`✓ ${slug}`); }
  else if (result.valid) {
    log.warn(`⚠ ${slug} (${result.warnings.length} warning(s))`);
    if (verbose) result.warnings.forEach(w => console.log(`    ${w.path}: ${w.message}`));
  } else {
    log.error(`✗ ${slug} (${result.errors.length} error(s))`);
    result.errors.forEach(e => console.error(`    ❌ ${e.path}: ${e.message}`));
    if (verbose && result.warnings.length > 0) result.warnings.forEach(w => console.log(`    ⚠ ${w.path}: ${w.message}`));
  }
}

async function ensureNotExists(path: string, message: string): Promise<void> {
  try { await stat(path); throw new Error(`${message} at ${path}`); }
  catch (err) { if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err; }
}

function titleCase(str: string): string {
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function generateComponentCode(name: string, props: string[]): string {
  const propsInterface = props.length > 0
    ? `interface ${name}Props {\n${props.map(p => `  ${p}?: string;`).join("\n")}\n  [key: string]: unknown;\n}`
    : `interface ${name}Props {\n  [key: string]: unknown;\n}`;
  const propDestructure = props.length > 0 ? `const { ${props.join(", ")}, ...rest } = props;` : `const rest = props;`;
  return `/**\n * ${name} — json-cms block component\n */\nimport React from "react";\n\n${propsInterface}\n\nexport default function ${name}(props: ${name}Props): JSX.Element {\n  ${propDestructure}\n\n  return (\n    <section\n      className="${name.toLowerCase()}"\n      data-component="${name}"\n      {...(rest as React.HTMLAttributes<HTMLElement>)}\n    >\n      {/* TODO: Implement ${name} */}\n    </section>\n  );\n}\n`;
}

async function scaffoldPlugin(pluginDir: string, packageName: string, manifest: Record<string, unknown>, opts: { author: string; description: string; license: string }): Promise<void> {
  await mkdir(join(pluginDir, "src", "components"), { recursive: true });
  await mkdir(join(pluginDir, "__tests__"), { recursive: true });
  const widgetName = titleCase(pluginDir.split("/").pop()!).replace(/\s/g, "") + "Widget";
  await writeFile(join(pluginDir, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");
  const pkgJson = { name: packageName, version: "0.1.0", description: opts.description, author: opts.author, license: opts.license, main: "./dist/index.js", types: "./dist/index.d.ts", scripts: { build: "tsc", test: "vitest run" }, peerDependencies: { react: ">=18", next: ">=15" }, devDependencies: { typescript: "^5.0.0", vitest: "^3.0.0" } };
  await writeFile(join(pluginDir, "package.json"), JSON.stringify(pkgJson, null, 2) + "\n");
  await writeFile(join(pluginDir, "tsconfig.json"), JSON.stringify({ extends: "../../tsconfig.json", compilerOptions: { outDir: "./dist", rootDir: "./src", declaration: true }, include: ["src"] }, null, 2) + "\n");
  await writeFile(join(pluginDir, "src", "index.ts"), `import { definePlugin } from "@upflame/json-cms/plugin-sdk";\nimport manifest from "../plugin.json";\nimport ${widgetName} from "./components/Widget";\n\nexport default definePlugin({\n  manifest,\n  lifecycle: {\n    async onActivate(ctx) {\n      ctx.logger.info("Plugin activated");\n      ctx.registry.registerComponent("${widgetName}", ${widgetName});\n    },\n    async onDeactivate(ctx) {\n      ctx.registry.unregisterComponent("${widgetName}");\n    },\n  },\n});\n`);
  await writeFile(join(pluginDir, "src", "components", "Widget.tsx"), generateComponentCode(widgetName, ["title", "description"]) + "\n");
  await writeFile(join(pluginDir, "README.md"), `# ${packageName}\n\n${opts.description}\n\n## Installation\n\n\`\`\`bash\nnpm install ${packageName}\n\`\`\`\n\n## Development\n\n\`\`\`bash\nnpm run build\nnpm test\nnpx jsoncms validate-plugin .\n\`\`\`\n`);
  await writeFile(join(pluginDir, "__tests__", "plugin.test.ts"), `import { describe, it, expect, vi } from "vitest";\nimport plugin from "../src/index";\n\ndescribe("${packageName}", () => {\n  it("has a valid manifest", () => {\n    expect(plugin.manifest.name).toBe("${packageName}");\n  });\n\n  it("onActivate registers components", async () => {\n    const mockCtx = {\n      pluginId: "${packageName}", pluginDir: __dirname, cmsVersion: "1.0.0",\n      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },\n      config: { get: vi.fn(), set: vi.fn(), has: vi.fn(), delete: vi.fn(), getAll: vi.fn() },\n      registry: { registerComponent: vi.fn(), registerHook: vi.fn(), unregisterComponent: vi.fn() },\n      events: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },\n    };\n    await plugin.lifecycle.onActivate(mockCtx as never);\n    expect(mockCtx.registry.registerComponent).toHaveBeenCalled();\n  });\n});\n`);
}

program.parse(process.argv);
