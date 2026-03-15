import { readFile, stat } from "fs/promises";
import { join } from "path";

export type DetectedFrameworkId =
  | "nextjs"
  | "vite-react"
  | "vite-vue"
  | "vite-svelte"
  | "vite-solid"
  | "remix"
  | "nuxt"
  | "angular"
  | "sveltekit"
  | "astro"
  | "gatsby"
  | "qwik"
  | "express"
  | "fastify"
  | "unknown";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export type NextRouterMode = "app" | "pages" | "mixed" | "none";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  type?: "module" | "commonjs";
}

export interface ProjectCapabilities {
  react: boolean;
  vue: boolean;
  svelte: boolean;
  solid: boolean;
  angular: boolean;
  next: boolean;
  remix: boolean;
  nuxt: boolean;
  sveltekit: boolean;
  astro: boolean;
  gatsby: boolean;
  qwik: boolean;
  vite: boolean;
  express: boolean;
  fastify: boolean;
  nodeBackend: boolean;
  ssrRuntime: boolean;
  staticSite: boolean;
  fileBasedRouting: boolean;
  apiRoutes: boolean;
  typescript: boolean;
}

export interface ProjectScan {
  rootDir: string;
  packageJson: PackageJson | null;
  packageManager: PackageManager;
  typescript: boolean;
  srcDir: string;
  nextRouter: NextRouterMode;
  configFiles: string[];
  directories: string[];
  dependencies: Record<string, string>;
  capabilities: ProjectCapabilities;
}

export interface AdapterMatch {
  id: DetectedFrameworkId;
  name: string;
  confidence: number;
  configFile?: string;
  version?: string;
  evidence: string[];
}

export interface ResolvedProjectAdapter extends AdapterMatch {
  scan: ProjectScan;
}

export const SUPPORTED_FRAMEWORK_IDS: DetectedFrameworkId[] = [
  "nextjs",
  "vite-react",
  "vite-vue",
  "vite-svelte",
  "vite-solid",
  "remix",
  "nuxt",
  "angular",
  "sveltekit",
  "astro",
  "gatsby",
  "qwik",
  "express",
  "fastify",
  "unknown",
];

export const FRAMEWORK_DISPLAY_NAMES: Record<DetectedFrameworkId, string> = {
  nextjs: "Next.js",
  remix: "Remix",
  nuxt: "Nuxt",
  sveltekit: "SvelteKit",
  astro: "Astro",
  gatsby: "Gatsby",
  angular: "Angular",
  qwik: "Qwik City",
  "vite-react": "Vite + React",
  "vite-vue": "Vite + Vue",
  "vite-svelte": "Vite + Svelte",
  "vite-solid": "Vite + Solid",
  express: "Express.js",
  fastify: "Fastify",
  unknown: "Generic Adapter",
};

const KNOWN_CONFIG_FILES = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "remix.config.ts",
  "remix.config.js",
  "nuxt.config.ts",
  "nuxt.config.js",
  "nuxt.config.mjs",
  "angular.json",
  ".angular.json",
  "svelte.config.ts",
  "svelte.config.js",
  "astro.config.ts",
  "astro.config.js",
  "astro.config.mjs",
  "gatsby-config.ts",
  "gatsby-config.js",
  "gatsby-config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "qwik.config.ts",
  "qwik.config.js",
];

const KNOWN_DIRECTORIES = [
  "src",
  "app",
  "pages",
  "src/app",
  "src/pages",
  "src/pages/api",
  "pages/api",
  "app/routes",
  "src/routes",
  "src/routes/api",
  "server",
  "server/api",
  "server/api/cms",
  "functions",
];

const NEXT_CONFIG_FILES = ["next.config.ts", "next.config.mjs", "next.config.js"];
const REMIX_CONFIG_FILES = ["remix.config.ts", "remix.config.js"];
const NUXT_CONFIG_FILES = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"];
const SVELTEKIT_CONFIG_FILES = ["svelte.config.ts", "svelte.config.js"];
const ASTRO_CONFIG_FILES = ["astro.config.ts", "astro.config.js", "astro.config.mjs"];
const GATSBY_CONFIG_FILES = ["gatsby-config.ts", "gatsby-config.js", "gatsby-config.mjs"];
const VITE_CONFIG_FILES = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
const ANGULAR_CONFIG_FILES = ["angular.json", ".angular.json"];

interface AdapterResolver {
  id: DetectedFrameworkId;
  name: string;
  detect(scan: ProjectScan): AdapterMatch | null;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(rootDir: string): Promise<PackageJson | null> {
  try {
    const content = await readFile(join(rootDir, "package.json"), "utf-8");
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

function mergeDependencies(pkg: PackageJson | null): Record<string, string> {
  return {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
    ...(pkg?.peerDependencies ?? {}),
  };
}

function hasDependency(scan: Pick<ProjectScan, "dependencies">, name: string): boolean {
  return scan.dependencies[name] !== undefined;
}

function hasAnyDependency(scan: Pick<ProjectScan, "dependencies">, names: string[]): boolean {
  return names.some((name) => hasDependency(scan, name));
}

function getDependencyVersion(scan: Pick<ProjectScan, "dependencies">, name: string): string | undefined {
  const version = scan.dependencies[name];
  return version?.replace(/^[^\d]*/, "");
}

function firstConfig(scan: Pick<ProjectScan, "configFiles">, configFiles: string[]): string | undefined {
  return configFiles.find((configFile) => scan.configFiles.includes(configFile));
}

function buildEvidence(parts: Array<string | undefined | false>): string[] {
  return parts.filter((part): part is string => Boolean(part));
}

function buildMatch(
  id: DetectedFrameworkId,
  scan: ProjectScan,
  options: {
    configFiles?: string[];
    versionDependency?: string;
    dependencyNames?: string[];
    baseConfidence: number;
    bonusConfidence?: number;
    evidence?: Array<string | undefined | false>;
  }
): AdapterMatch | null {
  const dependencyNames = options.dependencyNames ?? [];
  const configFile = options.configFiles ? firstConfig(scan, options.configFiles) : undefined;
  const hasDependencyEvidence =
    dependencyNames.length === 0 || dependencyNames.some((name) => hasDependency(scan, name));

  if (!hasDependencyEvidence && !configFile && !(options.evidence?.length ?? 0)) {
    return null;
  }

  const confidence =
    options.baseConfidence +
    (configFile ? 20 : 0) +
    (hasDependencyEvidence && dependencyNames.length > 0 ? 10 : 0) +
    (options.bonusConfidence ?? 0);

  return {
    id,
    name: FRAMEWORK_DISPLAY_NAMES[id],
    confidence,
    configFile,
    version: options.versionDependency ? getDependencyVersion(scan, options.versionDependency) : undefined,
    evidence: buildEvidence([
      ...dependencyNames
        .filter((name) => hasDependency(scan, name))
        .map((name) => `dependency:${name}`),
      configFile ? `config:${configFile}` : undefined,
      ...(options.evidence ?? []),
    ]),
  };
}

async function detectPackageManager(rootDir: string): Promise<PackageManager> {
  if (await pathExists(join(rootDir, "bun.lockb"))) return "bun";
  if (await pathExists(join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
  if (await pathExists(join(rootDir, "yarn.lock"))) return "yarn";
  return "npm";
}

async function detectTypeScript(rootDir: string): Promise<boolean> {
  return (await pathExists(join(rootDir, "tsconfig.json"))) || (await pathExists(join(rootDir, "tsconfig.base.json")));
}

async function detectSrcDir(rootDir: string): Promise<string> {
  if (await pathExists(join(rootDir, "src"))) return "src";
  if (await pathExists(join(rootDir, "app"))) return "app";
  return ".";
}

async function collectExistingPaths(rootDir: string, paths: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const candidate of paths) {
    if (await pathExists(join(rootDir, candidate))) {
      found.push(candidate);
    }
  }
  return found;
}

async function detectNextRouter(rootDir: string): Promise<NextRouterMode> {
  const hasAppRouter = (await pathExists(join(rootDir, "app"))) || (await pathExists(join(rootDir, "src", "app")));
  const hasPagesRouter = (await pathExists(join(rootDir, "pages"))) || (await pathExists(join(rootDir, "src", "pages")));

  if (hasAppRouter && hasPagesRouter) return "mixed";
  if (hasAppRouter) return "app";
  if (hasPagesRouter) return "pages";
  return "none";
}

function detectCapabilities(scan: Pick<ProjectScan, "configFiles" | "dependencies" | "typescript" | "nextRouter">): ProjectCapabilities {
  const react = hasAnyDependency(scan, ["react", "@vitejs/plugin-react", "@vitejs/plugin-react-swc"]);
  const vue = hasAnyDependency(scan, ["vue", "@vitejs/plugin-vue"]);
  const svelte = hasAnyDependency(scan, ["svelte", "@sveltejs/vite-plugin-svelte", "@sveltejs/kit"]);
  const solid = hasAnyDependency(scan, ["solid-js", "vite-plugin-solid"]);
  const angular = hasDependency(scan, "@angular/core") || scan.configFiles.some((file) => ANGULAR_CONFIG_FILES.includes(file));
  const next = hasDependency(scan, "next") || scan.configFiles.some((file) => NEXT_CONFIG_FILES.includes(file));
  const remix =
    hasAnyDependency(scan, ["@remix-run/react", "@remix-run/node", "@remix-run/cloudflare"]) ||
    scan.configFiles.some((file) => REMIX_CONFIG_FILES.includes(file));
  const nuxt = hasDependency(scan, "nuxt") || scan.configFiles.some((file) => NUXT_CONFIG_FILES.includes(file));
  const sveltekit = hasDependency(scan, "@sveltejs/kit") || scan.configFiles.some((file) => SVELTEKIT_CONFIG_FILES.includes(file));
  const astro = hasDependency(scan, "astro") || scan.configFiles.some((file) => ASTRO_CONFIG_FILES.includes(file));
  const gatsby = hasDependency(scan, "gatsby") || scan.configFiles.some((file) => GATSBY_CONFIG_FILES.includes(file));
  const qwik =
    hasAnyDependency(scan, ["@builder.io/qwik", "@builder.io/qwik-city"]) ||
    scan.configFiles.some((file) => file.startsWith("qwik.config."));
  const vite = hasDependency(scan, "vite") || scan.configFiles.some((file) => VITE_CONFIG_FILES.includes(file));
  const express = hasDependency(scan, "express");
  const fastify = hasDependency(scan, "fastify");
  const nodeBackend = express || fastify;
  const ssrRuntime = next || remix || nuxt || sveltekit || astro || qwik || nodeBackend;
  const staticSite = gatsby || astro;
  const fileBasedRouting = next || remix || nuxt || sveltekit || astro || qwik || gatsby;
  const apiRoutes = next || remix || nuxt || sveltekit || astro || qwik || nodeBackend;

  return {
    react,
    vue,
    svelte,
    solid,
    angular,
    next,
    remix,
    nuxt,
    sveltekit,
    astro,
    gatsby,
    qwik,
    vite,
    express,
    fastify,
    nodeBackend,
    ssrRuntime,
    staticSite,
    fileBasedRouting,
    apiRoutes,
    typescript: scan.typescript,
  };
}

export async function scanProject(rootDir: string = process.cwd()): Promise<ProjectScan> {
  const packageJson = await readPackageJson(rootDir);
  const packageManager = await detectPackageManager(rootDir);
  const typescript = await detectTypeScript(rootDir);
  const srcDir = await detectSrcDir(rootDir);
  const nextRouter = await detectNextRouter(rootDir);
  const configFiles = await collectExistingPaths(rootDir, KNOWN_CONFIG_FILES);
  const directories = await collectExistingPaths(rootDir, KNOWN_DIRECTORIES);
  const dependencies = mergeDependencies(packageJson);

  return {
    rootDir,
    packageJson,
    packageManager,
    typescript,
    srcDir,
    nextRouter,
    configFiles,
    directories,
    dependencies,
    capabilities: detectCapabilities({
      configFiles,
      dependencies,
      typescript,
      nextRouter,
    }),
  };
}

const adapterResolvers: AdapterResolver[] = [
  {
    id: "remix",
    name: FRAMEWORK_DISPLAY_NAMES.remix,
    detect(scan) {
      if (!scan.capabilities.remix) return null;
      return buildMatch("remix", scan, {
        configFiles: REMIX_CONFIG_FILES.concat(VITE_CONFIG_FILES),
        dependencyNames: ["@remix-run/react", "@remix-run/node", "@remix-run/cloudflare"],
        versionDependency: "@remix-run/react",
        baseConfidence: 80,
        evidence: ["capability:ssr-runtime"],
      });
    },
  },
  {
    id: "nextjs",
    name: FRAMEWORK_DISPLAY_NAMES.nextjs,
    detect(scan) {
      if (!scan.capabilities.next) return null;
      return buildMatch("nextjs", scan, {
        configFiles: NEXT_CONFIG_FILES,
        dependencyNames: ["next"],
        versionDependency: "next",
        baseConfidence: 85,
        bonusConfidence: scan.nextRouter === "mixed" ? 8 : scan.nextRouter !== "none" ? 5 : 0,
        evidence: [scan.nextRouter !== "none" ? `router:${scan.nextRouter}` : undefined],
      });
    },
  },
  {
    id: "nuxt",
    name: FRAMEWORK_DISPLAY_NAMES.nuxt,
    detect(scan) {
      if (!scan.capabilities.nuxt) return null;
      return buildMatch("nuxt", scan, {
        configFiles: NUXT_CONFIG_FILES,
        dependencyNames: ["nuxt"],
        versionDependency: "nuxt",
        baseConfidence: 80,
        evidence: ["capability:ssr-runtime"],
      });
    },
  },
  {
    id: "sveltekit",
    name: FRAMEWORK_DISPLAY_NAMES.sveltekit,
    detect(scan) {
      if (!scan.capabilities.sveltekit) return null;
      return buildMatch("sveltekit", scan, {
        configFiles: SVELTEKIT_CONFIG_FILES,
        dependencyNames: ["@sveltejs/kit"],
        versionDependency: "@sveltejs/kit",
        baseConfidence: 80,
        evidence: ["capability:ssr-runtime"],
      });
    },
  },
  {
    id: "astro",
    name: FRAMEWORK_DISPLAY_NAMES.astro,
    detect(scan) {
      if (!scan.capabilities.astro) return null;
      return buildMatch("astro", scan, {
        configFiles: ASTRO_CONFIG_FILES,
        dependencyNames: ["astro"],
        versionDependency: "astro",
        baseConfidence: 78,
        evidence: [
          scan.capabilities.staticSite ? "capability:static-site" : undefined,
          scan.capabilities.ssrRuntime ? "capability:ssr-runtime" : undefined,
        ],
      });
    },
  },
  {
    id: "qwik",
    name: FRAMEWORK_DISPLAY_NAMES.qwik,
    detect(scan) {
      if (!scan.capabilities.qwik) return null;
      return buildMatch("qwik", scan, {
        configFiles: VITE_CONFIG_FILES,
        dependencyNames: ["@builder.io/qwik-city", "@builder.io/qwik"],
        versionDependency: "@builder.io/qwik-city",
        baseConfidence: 76,
        evidence: ["capability:ssr-runtime"],
      });
    },
  },
  {
    id: "gatsby",
    name: FRAMEWORK_DISPLAY_NAMES.gatsby,
    detect(scan) {
      if (!scan.capabilities.gatsby) return null;
      return buildMatch("gatsby", scan, {
        configFiles: GATSBY_CONFIG_FILES,
        dependencyNames: ["gatsby"],
        versionDependency: "gatsby",
        baseConfidence: 76,
        evidence: [scan.capabilities.staticSite ? "capability:static-site" : undefined],
      });
    },
  },
  {
    id: "angular",
    name: FRAMEWORK_DISPLAY_NAMES.angular,
    detect(scan) {
      if (!scan.capabilities.angular) return null;
      return buildMatch("angular", scan, {
        configFiles: ANGULAR_CONFIG_FILES,
        dependencyNames: ["@angular/core"],
        versionDependency: "@angular/core",
        baseConfidence: 74,
      });
    },
  },
  {
    id: "fastify",
    name: FRAMEWORK_DISPLAY_NAMES.fastify,
    detect(scan) {
      if (!scan.capabilities.fastify) return null;
      return buildMatch("fastify", scan, {
        dependencyNames: ["fastify"],
        versionDependency: "fastify",
        baseConfidence: 68,
        evidence: ["capability:node-backend"],
      });
    },
  },
  {
    id: "express",
    name: FRAMEWORK_DISPLAY_NAMES.express,
    detect(scan) {
      if (!scan.capabilities.express) return null;
      return buildMatch("express", scan, {
        dependencyNames: ["express"],
        versionDependency: "express",
        baseConfidence: 66,
        evidence: ["capability:node-backend"],
      });
    },
  },
  {
    id: "vite-vue",
    name: FRAMEWORK_DISPLAY_NAMES["vite-vue"],
    detect(scan) {
      if (!scan.capabilities.vite || !scan.capabilities.vue || scan.capabilities.nuxt) return null;
      return buildMatch("vite-vue", scan, {
        configFiles: VITE_CONFIG_FILES,
        dependencyNames: ["vite", "vue", "@vitejs/plugin-vue"],
        versionDependency: "vite",
        baseConfidence: 62,
        evidence: ["capability:vue", "capability:vite"],
      });
    },
  },
  {
    id: "vite-svelte",
    name: FRAMEWORK_DISPLAY_NAMES["vite-svelte"],
    detect(scan) {
      if (!scan.capabilities.vite || !scan.capabilities.svelte || scan.capabilities.sveltekit) return null;
      return buildMatch("vite-svelte", scan, {
        configFiles: VITE_CONFIG_FILES,
        dependencyNames: ["vite", "svelte", "@sveltejs/vite-plugin-svelte"],
        versionDependency: "vite",
        baseConfidence: 62,
        evidence: ["capability:svelte", "capability:vite"],
      });
    },
  },
  {
    id: "vite-solid",
    name: FRAMEWORK_DISPLAY_NAMES["vite-solid"],
    detect(scan) {
      if (!scan.capabilities.vite || !scan.capabilities.solid) return null;
      return buildMatch("vite-solid", scan, {
        configFiles: VITE_CONFIG_FILES,
        dependencyNames: ["vite", "solid-js", "vite-plugin-solid"],
        versionDependency: "vite",
        baseConfidence: 62,
        evidence: ["capability:solid", "capability:vite"],
      });
    },
  },
  {
    id: "vite-react",
    name: FRAMEWORK_DISPLAY_NAMES["vite-react"],
    detect(scan) {
      if (!scan.capabilities.vite || !scan.capabilities.react || scan.capabilities.next || scan.capabilities.remix) {
        return null;
      }
      return buildMatch("vite-react", scan, {
        configFiles: VITE_CONFIG_FILES,
        dependencyNames: ["vite", "react", "@vitejs/plugin-react", "@vitejs/plugin-react-swc"],
        versionDependency: "vite",
        baseConfidence: 62,
        evidence: ["capability:react", "capability:vite"],
      });
    },
  },
];

export function resolveProjectAdapter(scan: ProjectScan): ResolvedProjectAdapter {
  const matches = adapterResolvers
    .map((resolver) => resolver.detect(scan))
    .filter((match): match is AdapterMatch => Boolean(match))
    .sort((left, right) => right.confidence - left.confidence);

  const resolved =
    matches[0] ??
    ({
      id: "unknown",
      name: FRAMEWORK_DISPLAY_NAMES.unknown,
      confidence: 0,
      evidence: ["fallback:generic-adapter"],
    } satisfies AdapterMatch);

  return {
    ...resolved,
    scan,
  };
}

export async function detectProjectAdapter(rootDir: string = process.cwd()): Promise<ResolvedProjectAdapter> {
  const scan = await scanProject(rootDir);
  return resolveProjectAdapter(scan);
}

export function isDetectedFrameworkId(value: string): value is DetectedFrameworkId {
  return SUPPORTED_FRAMEWORK_IDS.includes(value as DetectedFrameworkId);
}
