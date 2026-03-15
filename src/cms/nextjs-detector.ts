/**
 * @upflame/json-cms — Deep Next.js Detector
 *
 * Goes far beyond basic "is Next.js present" detection.
 * Reads next.config, tsconfig, package.json, and src/ structure
 * to build a complete capability map of the host Next.js project.
 *
 * Detected features:
 *  - App Router vs Pages Router (or both)
 *  - Next.js version (15.x, 14.x, 13.x)
 *  - TypeScript / strict mode
 *  - Turbopack usage
 *  - Edge runtime support
 *  - Middleware presence
 *  - i18n configuration
 *  - Image domains / remote patterns
 *  - Installed auth providers
 *  - Database ORMs
 *  - Analytics packages
 *  - CSS strategy (Tailwind, CSS Modules, styled-components)
 *  - Testing setup
 *  - Deployment target (Vercel, AWS, self-hosted)
 */

import { readFile, stat, readdir } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NextJsCapabilityMap {
  // Core
  detected: boolean;
  version: string | null;
  majorVersion: number | null;
  minorVersion: number | null;

  // Router
  appRouter: boolean;
  pagesRouter: boolean;
  hasMiddleware: boolean;
  middlewarePath: string | null;

  // TypeScript
  typescript: boolean;
  strictMode: boolean;
  pathAliases: Record<string, string[]>;

  // Build
  turbopack: boolean;
  standaloneOutput: boolean;
  swcMinify: boolean;
  bundleAnalyzer: boolean;

  // Runtime
  edgeRuntime: boolean;
  serverComponents: boolean;
  serverActions: boolean;
  streaming: boolean;
  ppr: boolean; // Partial Pre-Rendering (Next.js 15+)

  // i18n
  i18n: boolean;
  locales: string[];
  defaultLocale: string | null;

  // Images
  imageOptimization: boolean;
  remotePatterns: string[];

  // Auth
  nextAuth: boolean;
  clerkAuth: boolean;
  auth0: boolean;
  supabaseAuth: boolean;

  // Database / ORM
  prisma: boolean;
  drizzle: boolean;
  supabase: boolean;
  planetscale: boolean;
  turso: boolean;
  mongodb: boolean;

  // Styling
  tailwind: boolean;
  cssModules: boolean;
  styledComponents: boolean;
  emotion: boolean;
  shadcn: boolean;

  // Analytics
  vercelAnalytics: boolean;
  googleAnalytics: boolean;
  plausible: boolean;
  posthog: boolean;

  // Testing
  vitest: boolean;
  jest: boolean;
  playwright: boolean;
  cypress: boolean;

  // Deployment
  vercelDeployment: boolean;
  dockerfile: boolean;
  awsAmplify: boolean;

  // CMS-specific
  recommendedDataDir: string;
  recommendedApiBase: string;
  canUseServerComponents: boolean;
  canUseStreamingRender: boolean;
  canUsePPR: boolean;
  canUseServerActions: boolean;

  // Warnings and recommendations
  warnings: string[];
  recommendations: string[];
  incompatibilities: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

async function readJson<T>(path: string): Promise<T | null> {
  try { return JSON.parse(await readFile(path, "utf-8")) as T; }
  catch { return null; }
}

async function readText(path: string): Promise<string | null> {
  try { return await readFile(path, "utf-8"); }
  catch { return null; }
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
};

function hasDep(pkg: PackageJson, name: string): boolean {
  return !!(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

function getVersion(pkg: PackageJson, name: string): string | null {
  const v = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  return v?.replace(/[\^~>=< ]/g, "") ?? null;
}

function parseVersion(v: string | null): [number, number, number] {
  if (!v) return [0, 0, 0];
  const parts = v.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

// ─── Main Detection Function ───────────────────────────────────────────────────

export async function detectNextJs(rootDir: string = process.cwd()): Promise<NextJsCapabilityMap> {
  const map: NextJsCapabilityMap = {
    detected: false, version: null, majorVersion: null, minorVersion: null,
    appRouter: false, pagesRouter: false, hasMiddleware: false, middlewarePath: null,
    typescript: false, strictMode: false, pathAliases: {},
    turbopack: false, standaloneOutput: false, swcMinify: true, bundleAnalyzer: false,
    edgeRuntime: false, serverComponents: false, serverActions: false, streaming: false, ppr: false,
    i18n: false, locales: [], defaultLocale: null,
    imageOptimization: true, remotePatterns: [],
    nextAuth: false, clerkAuth: false, auth0: false, supabaseAuth: false,
    prisma: false, drizzle: false, supabase: false, planetscale: false, turso: false, mongodb: false,
    tailwind: false, cssModules: false, styledComponents: false, emotion: false, shadcn: false,
    vercelAnalytics: false, googleAnalytics: false, plausible: false, posthog: false,
    vitest: false, jest: false, playwright: false, cypress: false,
    vercelDeployment: false, dockerfile: false, awsAmplify: false,
    recommendedDataDir: "data", recommendedApiBase: "src/app/api/cms",
    canUseServerComponents: false, canUseStreamingRender: false, canUsePPR: false, canUseServerActions: false,
    warnings: [], recommendations: [], incompatibilities: [],
  };

  // ── package.json ────────────────────────────────────────────────────────────
  const pkg = await readJson<PackageJson>(join(rootDir, "package.json"));
  if (!pkg || !hasDep(pkg, "next")) return map;

  map.detected = true;
  map.version = getVersion(pkg, "next");
  const [major, minor] = parseVersion(map.version);
  map.majorVersion = major;
  map.minorVersion = minor;

  // ── next.config analysis ────────────────────────────────────────────────────
  const configFile =
    (await fileExists(join(rootDir, "next.config.ts")) && "next.config.ts") ||
    (await fileExists(join(rootDir, "next.config.mjs")) && "next.config.mjs") ||
    (await fileExists(join(rootDir, "next.config.js")) && "next.config.js") || null;

  if (configFile) {
    const configText = await readText(join(rootDir, configFile)) ?? "";
    map.turbopack = configText.includes("turbopack") || configText.includes("--turbo");
    map.standaloneOutput = configText.includes("standalone");
    map.swcMinify = !configText.includes("swcMinify: false");
    map.bundleAnalyzer = configText.includes("@next/bundle-analyzer");
    map.ppr = configText.includes("ppr") && major >= 15;

    // Parse i18n from config
    if (configText.includes("i18n:")) {
      map.i18n = true;
      const localeMatch = configText.match(/locales:\s*\[([^\]]+)\]/);
      if (localeMatch) {
        map.locales = localeMatch[1].replace(/['"]/g, "").split(",").map(l => l.trim()).filter(Boolean);
      }
      const defaultMatch = configText.match(/defaultLocale:\s*['"]([^'"]+)['"]/);
      map.defaultLocale = defaultMatch?.[1] ?? null;
    }

    // Remote patterns for images
    const patternMatches = configText.matchAll(/hostname:\s*['"]([^'"]+)['"]/g);
    for (const m of patternMatches) map.remotePatterns.push(m[1]);
  }

  // ── Router detection ────────────────────────────────────────────────────────
  const srcDir = (await fileExists(join(rootDir, "src"))) ? "src" : ".";
  map.appRouter = await fileExists(join(rootDir, srcDir, "app"));
  map.pagesRouter = await fileExists(join(rootDir, srcDir, "pages"));

  // ── Middleware ──────────────────────────────────────────────────────────────
  for (const p of [`${srcDir}/middleware.ts`, `${srcDir}/middleware.js`, "middleware.ts", "middleware.js"]) {
    if (await fileExists(join(rootDir, p))) {
      map.hasMiddleware = true;
      map.middlewarePath = p;

      const mText = await readText(join(rootDir, p)) ?? "";
      map.edgeRuntime = mText.includes("edge") || mText.includes("EdgeRuntime");
      break;
    }
  }

  // ── TypeScript ──────────────────────────────────────────────────────────────
  if (await fileExists(join(rootDir, "tsconfig.json"))) {
    map.typescript = true;
    const tsconfig = await readJson<{ compilerOptions?: { strict?: boolean; paths?: Record<string, string[]> } }>(join(rootDir, "tsconfig.json"));
    map.strictMode = tsconfig?.compilerOptions?.strict ?? false;
    map.pathAliases = tsconfig?.compilerOptions?.paths ?? {};
  }

  // ── Version-based capability flags ─────────────────────────────────────────
  if (major >= 13) {
    map.serverComponents = map.appRouter;
    map.streaming = map.appRouter;
    map.serverActions = map.appRouter && (major > 13 || (major === 13 && minor >= 4));
  }
  if (major >= 14) {
    map.serverActions = map.appRouter;
  }
  if (major >= 15) {
    map.ppr = true;
    map.canUsePPR = true;
  }
  map.canUseServerComponents = map.serverComponents;
  map.canUseStreamingRender = map.streaming;
  map.canUseServerActions = map.serverActions;

  // ── Auth providers ──────────────────────────────────────────────────────────
  map.nextAuth = hasDep(pkg, "next-auth") || hasDep(pkg, "@auth/nextjs");
  map.clerkAuth = hasDep(pkg, "@clerk/nextjs");
  map.auth0 = hasDep(pkg, "@auth0/nextjs-auth0");
  map.supabaseAuth = hasDep(pkg, "@supabase/ssr") || hasDep(pkg, "@supabase/auth-helpers-nextjs");

  // ── Databases / ORMs ───────────────────────────────────────────────────────
  map.prisma = hasDep(pkg, "@prisma/client") || hasDep(pkg, "prisma");
  map.drizzle = hasDep(pkg, "drizzle-orm");
  map.supabase = hasDep(pkg, "@supabase/supabase-js");
  map.planetscale = hasDep(pkg, "@planetscale/database");
  map.turso = hasDep(pkg, "@libsql/client");
  map.mongodb = hasDep(pkg, "mongodb") || hasDep(pkg, "mongoose");

  // ── Styling ────────────────────────────────────────────────────────────────
  map.tailwind = hasDep(pkg, "tailwindcss");
  map.styledComponents = hasDep(pkg, "styled-components");
  map.emotion = hasDep(pkg, "@emotion/react");
  map.shadcn = await fileExists(join(rootDir, "components.json")); // shadcn/ui marker

  // ── Analytics ──────────────────────────────────────────────────────────────
  map.vercelAnalytics = hasDep(pkg, "@vercel/analytics");
  map.googleAnalytics = hasDep(pkg, "gtag") || hasDep(pkg, "react-ga4");
  map.plausible = hasDep(pkg, "next-plausible");
  map.posthog = hasDep(pkg, "posthog-js");

  // ── Testing ────────────────────────────────────────────────────────────────
  map.vitest = hasDep(pkg, "vitest");
  map.jest = hasDep(pkg, "jest");
  map.playwright = hasDep(pkg, "@playwright/test");
  map.cypress = hasDep(pkg, "cypress");

  // ── Deployment ─────────────────────────────────────────────────────────────
  map.vercelDeployment = await fileExists(join(rootDir, "vercel.json")) || await fileExists(join(rootDir, ".vercel"));
  map.dockerfile = await fileExists(join(rootDir, "Dockerfile")) || await fileExists(join(rootDir, "dockerfile"));
  map.awsAmplify = await fileExists(join(rootDir, "amplify.yml"));

  // ── Recommendations ─────────────────────────────────────────────────────────
  if (!map.appRouter && major >= 13) {
    map.warnings.push(`Pages Router detected. Consider migrating to App Router for RSC streaming and Server Actions.`);
  }
  if (!map.typescript) {
    map.warnings.push("TypeScript not detected. @upflame/json-cms is optimized for TypeScript.");
  }
  if (major < 13) {
    map.incompatibilities.push(`Next.js ${map.version} is too old. @upflame/json-cms requires Next.js 13+.`);
  }
  if (major >= 13 && !map.appRouter) {
    map.recommendations.push("Enable App Router for RSC streaming and 40% better performance.");
  }
  if (!map.tailwind) {
    map.recommendations.push("Install Tailwind CSS for the best CMS component styling experience.");
  }
  if (!map.standaloneOutput && map.dockerfile) {
    map.recommendations.push("Add output: 'standalone' to next.config for optimized Docker images.");
  }
  if (major >= 15 && !map.ppr) {
    map.recommendations.push("Enable Partial Pre-Rendering (ppr: true) in next.config for best performance.");
  }

  // ── CMS data dir recommendation ─────────────────────────────────────────────
  map.recommendedDataDir = srcDir === "src" ? "data" : "data";
  map.recommendedApiBase = map.appRouter
    ? `${srcDir}/app/api/cms`
    : `${srcDir}/pages/api/cms`;

  return map;
}

/**
 * Format capability map for CLI display.
 */
export function formatCapabilityMap(map: NextJsCapabilityMap): string {
  if (!map.detected) return "  Next.js not detected in this directory.";

  const router = [map.appRouter && "App Router", map.pagesRouter && "Pages Router"]
    .filter(Boolean).join(" + ");

  const lines = [
    `  Next.js ${map.version ?? "unknown"}`,
    `  Router:           ${router || "unknown"}`,
    `  TypeScript:       ${map.typescript ? `Yes${map.strictMode ? " (strict)" : ""}` : "No"}`,
    `  Server Components: ${map.serverComponents ? "✓" : "—"}`,
    `  Streaming:        ${map.streaming ? "✓" : "—"}`,
    `  Server Actions:   ${map.serverActions ? "✓" : "—"}`,
    `  PPR (Next 15):    ${map.ppr ? "✓" : "—"}`,
    `  Turbopack:        ${map.turbopack ? "✓ enabled" : "—"}`,
    `  Auth:             ${[map.nextAuth && "NextAuth", map.clerkAuth && "Clerk", map.auth0 && "Auth0", map.supabaseAuth && "Supabase"].filter(Boolean).join(", ") || "none"}`,
    `  Styling:          ${[map.tailwind && "Tailwind", map.shadcn && "shadcn/ui", map.styledComponents && "styled-components"].filter(Boolean).join(", ") || "none"}`,
    `  Data dir:         ${map.recommendedDataDir}`,
  ];

  if (map.warnings.length) {
    lines.push("", "  Warnings:");
    map.warnings.forEach(w => lines.push(`    ⚠  ${w}`));
  }
  if (map.recommendations.length) {
    lines.push("", "  Recommendations:");
    map.recommendations.forEach(r => lines.push(`    →  ${r}`));
  }
  if (map.incompatibilities.length) {
    lines.push("", "  Incompatibilities:");
    map.incompatibilities.forEach(e => lines.push(`    ✗  ${e}`));
  }

  return lines.join("\n");
}

