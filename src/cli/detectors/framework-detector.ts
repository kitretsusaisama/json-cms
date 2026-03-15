/**
 * @upflame/json-cms - Framework Detector
 *
 * Uses a capability scan plus adapter registry instead of relying on
 * one-off framework checks. This keeps detection extensible as
 * framework ecosystems evolve.
 */

import {
  FRAMEWORK_DISPLAY_NAMES,
  isDetectedFrameworkId,
  resolveProjectAdapter,
  scanProject,
  type DetectedFrameworkId,
  type NextRouterMode,
  type PackageManager,
  type ProjectCapabilities,
  type ProjectScan,
  type ResolvedProjectAdapter,
} from "../../adapters/project-detection";

export type { PackageManager } from "../../adapters/project-detection";

export type FrameworkId = DetectedFrameworkId;

export interface FrameworkInfo {
  id: FrameworkId;
  name: string;
  version?: string;
  packageManager: PackageManager;
  typescript: boolean;
  rootDir: string;
  srcDir: string;
  configFile?: string;
  features: FrameworkFeatures;
  adapter: FrameworkAdapter;
  capabilities: ProjectCapabilities;
  nextRouter: NextRouterMode;
  detection: {
    confidence: number;
    evidence: string[];
  };
}

export interface FrameworkFeatures {
  ssr: boolean;
  ssg: boolean;
  streaming: boolean;
  serverComponents: boolean;
  fileBasedRouting: boolean;
  apiRoutes: boolean;
  middleware: boolean;
  edgeRuntime: boolean;
}

export interface FrameworkAdapter {
  apiDir: string;
  routeFileExt: string;
  apiHandlerTemplate:
    | "next-app-router"
    | "next-pages-router"
    | "remix-loader"
    | "vite-express"
    | "nuxt-server"
    | "sveltekit-server"
    | "astro-endpoint"
    | "express"
    | "fastify"
    | "generic";
  pagesDir: string;
  dataDir: string;
  configFileName: string;
  moduleFormat: "esm" | "cjs" | "auto";
  setupFiles: SetupFile[];
}

export interface SetupFile {
  path: string;
  description: string;
  template: string;
}

function pickDirectory(scan: ProjectScan, candidates: string[], fallback: string): string {
  return candidates.find((candidate) => scan.directories.includes(candidate)) ?? fallback;
}

function buildFeatures(id: FrameworkId, scan: ProjectScan): FrameworkFeatures {
  const defaults: Record<FrameworkId, FrameworkFeatures> = {
    nextjs: {
      ssr: true,
      ssg: true,
      streaming: true,
      serverComponents: scan.nextRouter !== "pages",
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: true,
    },
    remix: {
      ssr: true,
      ssg: false,
      streaming: true,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: true,
    },
    nuxt: {
      ssr: true,
      ssg: true,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: false,
    },
    sveltekit: {
      ssr: true,
      ssg: true,
      streaming: true,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: true,
    },
    astro: {
      ssr: true,
      ssg: true,
      streaming: true,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: true,
    },
    gatsby: {
      ssr: false,
      ssg: true,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    angular: {
      ssr: true,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    qwik: {
      ssr: true,
      ssg: true,
      streaming: true,
      serverComponents: false,
      fileBasedRouting: true,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: true,
    },
    "vite-react": {
      ssr: false,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    "vite-vue": {
      ssr: false,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    "vite-svelte": {
      ssr: false,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    "vite-solid": {
      ssr: false,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
    express: {
      ssr: true,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: false,
    },
    fastify: {
      ssr: true,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: true,
      middleware: true,
      edgeRuntime: false,
    },
    unknown: {
      ssr: false,
      ssg: false,
      streaming: false,
      serverComponents: false,
      fileBasedRouting: false,
      apiRoutes: false,
      middleware: false,
      edgeRuntime: false,
    },
  };

  return defaults[id];
}

function buildNextAdapter(scan: ProjectScan, typescript: boolean): FrameworkAdapter {
  const ext = typescript ? "ts" : "js";
  const tsxExt = typescript ? "tsx" : "jsx";
  const usePagesRouter = scan.nextRouter === "pages";

  if (usePagesRouter) {
    const pagesDir = pickDirectory(scan, ["src/pages", "pages"], scan.srcDir === "." ? "pages" : `${scan.srcDir}/pages`);
    return {
      apiDir: `${pagesDir}/api/cms`,
      routeFileExt: ext,
      apiHandlerTemplate: "next-pages-router",
      pagesDir,
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `${pagesDir}/api/cms/pages/[slug].${ext}`,
          description: "CMS pages API route for the Next.js Pages Router",
          template: "next-pages-router-api",
        },
        {
          path: `${pagesDir}/[[...slug]].${tsxExt}`,
          description: "CMS catch-all page for the Next.js Pages Router",
          template: "next-pages-router-page",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    };
  }

  const appDir = pickDirectory(scan, ["src/app", "app"], scan.srcDir === "." ? "app" : `${scan.srcDir}/app`);
  return {
    apiDir: `${appDir}/api/cms`,
    routeFileExt: `route.${ext}`,
    apiHandlerTemplate: "next-app-router",
    pagesDir: appDir,
    dataDir: "data",
    configFileName: "cms.config.ts",
    moduleFormat: "esm",
    setupFiles: [
      {
        path: `${appDir}/api/cms/pages/[slug]/route.${ext}`,
        description: "CMS pages API route for the Next.js App Router",
        template: "next-pages-api",
      },
      {
        path: `${appDir}/[[...slug]]/page.${tsxExt}`,
        description: "CMS catch-all page renderer for the Next.js App Router",
        template: "next-page-renderer",
      },
      {
        path: "cms.config.ts",
        description: "CMS configuration",
        template: "config",
      },
    ],
  };
}

function buildAdapter(id: FrameworkId, scan: ProjectScan, typescript: boolean): FrameworkAdapter {
  const ext = typescript ? "ts" : "js";
  const tsxExt = typescript ? "tsx" : "jsx";

  if (id === "nextjs") {
    return buildNextAdapter(scan, typescript);
  }

  const adapters: Record<Exclude<FrameworkId, "nextjs">, FrameworkAdapter> = {
    remix: {
      apiDir: "app/routes",
      routeFileExt: ext,
      apiHandlerTemplate: "remix-loader",
      pagesDir: "app/routes",
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `app/routes/cms.$slug.${ext}`,
          description: "CMS page route with loader",
          template: "remix-route",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    nuxt: {
      apiDir: "server/api/cms",
      routeFileExt: ext,
      apiHandlerTemplate: "nuxt-server",
      pagesDir: "pages",
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `server/api/cms/pages/[slug].get.${ext}`,
          description: "Nuxt server route for CMS pages",
          template: "nuxt-server-route",
        },
        {
          path: "pages/[...slug].vue",
          description: "CMS catch-all page",
          template: "nuxt-page",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    sveltekit: {
      apiDir: "src/routes/api/cms",
      routeFileExt: `+server.${ext}`,
      apiHandlerTemplate: "sveltekit-server",
      pagesDir: "src/routes",
      dataDir: "static/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `src/routes/api/cms/pages/[slug]/+server.${ext}`,
          description: "SvelteKit server endpoint for CMS pages",
          template: "sveltekit-endpoint",
        },
        {
          path: `src/routes/[...slug]/+page.server.${ext}`,
          description: "SvelteKit CMS page load function",
          template: "sveltekit-page",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    astro: {
      apiDir: "src/pages/api/cms",
      routeFileExt: ext,
      apiHandlerTemplate: "astro-endpoint",
      pagesDir: "src/pages",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `src/pages/api/cms/pages/[slug].${ext}`,
          description: "Astro API endpoint for CMS pages",
          template: "astro-endpoint",
        },
        {
          path: "src/pages/[...slug].astro",
          description: "Astro CMS catch-all page",
          template: "astro-page",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    gatsby: {
      apiDir: "functions",
      routeFileExt: ext,
      apiHandlerTemplate: "generic",
      pagesDir: "src/pages",
      dataDir: "static/data",
      configFileName: "cms.config.ts",
      moduleFormat: "cjs",
      setupFiles: [
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
        {
          path: "gatsby-node.ts",
          description: "Gatsby node API for CMS pages",
          template: "gatsby-node",
        },
      ],
    },
    angular: {
      apiDir: "src/app/api",
      routeFileExt: ext,
      apiHandlerTemplate: "generic",
      pagesDir: "src/app",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
        {
          path: `src/app/cms/cms.service.${ext}`,
          description: "Angular CMS service",
          template: "angular-service",
        },
        {
          path: `src/app/cms/cms-page/cms-page.component.${tsxExt}`,
          description: "Angular CMS page component",
          template: "angular-component",
        },
      ],
    },
    qwik: {
      apiDir: "src/routes/api",
      routeFileExt: `index.${ext}`,
      apiHandlerTemplate: "generic",
      pagesDir: "src/routes",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `src/routes/api/cms/pages/[slug]/index.${ext}`,
          description: "Qwik server handler for CMS pages",
          template: "qwik-server-handler",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    "vite-react": {
      apiDir: "server",
      routeFileExt: ext,
      apiHandlerTemplate: "vite-express",
      pagesDir: "src",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `server/cms.${ext}`,
          description: "Express API server for CMS in a Vite + React project",
          template: "express-server",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    "vite-vue": {
      apiDir: "server",
      routeFileExt: ext,
      apiHandlerTemplate: "vite-express",
      pagesDir: "src",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `server/cms.${ext}`,
          description: "Express API server for CMS in a Vite + Vue project",
          template: "express-server",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    "vite-svelte": {
      apiDir: "server",
      routeFileExt: ext,
      apiHandlerTemplate: "vite-express",
      pagesDir: "src",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `server/cms.${ext}`,
          description: "Express API server for CMS in a Vite + Svelte project",
          template: "express-server",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    "vite-solid": {
      apiDir: "server",
      routeFileExt: ext,
      apiHandlerTemplate: "vite-express",
      pagesDir: "src",
      dataDir: "public/data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `server/cms.${ext}`,
          description: "Express API server for CMS in a Vite + Solid project",
          template: "express-server",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    express: {
      apiDir: "src/routes",
      routeFileExt: ext,
      apiHandlerTemplate: "express",
      pagesDir: "src",
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "cjs",
      setupFiles: [
        {
          path: `src/routes/cms.${ext}`,
          description: "Express CMS router",
          template: "express-router",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    fastify: {
      apiDir: "src/routes",
      routeFileExt: ext,
      apiHandlerTemplate: "fastify",
      pagesDir: "src",
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "esm",
      setupFiles: [
        {
          path: `src/routes/cms.${ext}`,
          description: "Fastify CMS plugin",
          template: "fastify-plugin",
        },
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
    unknown: {
      apiDir: "api",
      routeFileExt: ext,
      apiHandlerTemplate: "generic",
      pagesDir: "src",
      dataDir: "data",
      configFileName: "cms.config.ts",
      moduleFormat: "auto",
      setupFiles: [
        {
          path: "cms.config.ts",
          description: "CMS configuration",
          template: "config",
        },
      ],
    },
  };

  return adapters[id];
}

function buildFrameworkInfo(scan: ProjectScan, resolved: ResolvedProjectAdapter): FrameworkInfo {
  return {
    id: resolved.id,
    name: FRAMEWORK_DISPLAY_NAMES[resolved.id],
    version: resolved.version,
    packageManager: scan.packageManager,
    typescript: scan.typescript,
    rootDir: scan.rootDir,
    srcDir: scan.srcDir,
    configFile: resolved.configFile,
    features: buildFeatures(resolved.id, scan),
    adapter: buildAdapter(resolved.id, scan, scan.typescript),
    capabilities: scan.capabilities,
    nextRouter: scan.nextRouter,
    detection: {
      confidence: resolved.confidence,
      evidence: resolved.evidence,
    },
  };
}

export async function detectFramework(rootDir: string = process.cwd()): Promise<FrameworkInfo> {
  const scan = await scanProject(rootDir);
  const resolved = resolveProjectAdapter(scan);
  return buildFrameworkInfo(scan, resolved);
}

export async function getFrameworkInfoById(id: FrameworkId, rootDir: string = process.cwd()): Promise<FrameworkInfo> {
  const scan = await scanProject(rootDir);
  const detected = resolveProjectAdapter(scan);
  const version = detected.id === id ? detected.version : undefined;
  const configFile = detected.id === id ? detected.configFile : undefined;

  return buildFrameworkInfo(scan, {
    id,
    name: FRAMEWORK_DISPLAY_NAMES[id],
    confidence: 100,
    version,
    configFile,
    evidence: ["override:manual"],
    scan,
  });
}

export function parseFrameworkId(value: string): FrameworkId | null {
  return isDetectedFrameworkId(value) ? value : null;
}

export function formatDetectionSummary(info: FrameworkInfo): string {
  const enabledCapabilities = Object.entries(info.capabilities)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());

  const lines: string[] = [
    `  Framework:       ${info.name}${info.version ? ` v${info.version}` : ""}`,
    `  TypeScript:      ${info.typescript ? "Yes" : "No"}`,
    `  Package Manager: ${info.packageManager}`,
    `  Data Directory:  ${info.adapter.dataDir}`,
    `  API Directory:   ${info.adapter.apiDir}`,
    `  Confidence:      ${info.detection.confidence}`,
  ];

  if (info.id === "nextjs") {
    lines.push(`  Next Router:     ${info.nextRouter}`);
  }

  if (enabledCapabilities.length > 0) {
    lines.push(`  Capabilities:    ${enabledCapabilities.join(", ")}`);
  }

  if (info.detection.evidence.length > 0) {
    lines.push(`  Evidence:        ${info.detection.evidence.join(", ")}`);
  }

  lines.push("  Features:");
  lines.push(
    ...Object.entries(info.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => `    - ${feature.replace(/([A-Z])/g, " $1").toLowerCase()}`)
  );

  return lines.join("\n");
}

