import { getCanonicalDataRoot } from "../core/content/paths";
import {
  detectProjectAdapter,
  type DetectedFrameworkId,
  type NextRouterMode,
  type ProjectCapabilities,
} from "./project-detection";
import type {
  FrameworkAdapter,
  FrameworkAdapterContext,
  FrameworkCapabilities,
  FrameworkDetectionResult,
  SupportedFramework,
} from "./types";

function toRuntimeCapabilities(
  framework: SupportedFramework,
  capabilities?: ProjectCapabilities,
  nextRouter: NextRouterMode = "none"
): FrameworkCapabilities {
  if (capabilities) {
    return {
      ssr: capabilities.ssrRuntime,
      ssg: capabilities.staticSite || framework === "nextjs" || framework === "nuxt" || framework === "sveltekit" || framework === "qwik",
      apiRoutes: capabilities.apiRoutes,
      serverComponents: framework === "nextjs" && nextRouter !== "pages",
      streaming: framework === "nextjs" || framework === "remix" || framework === "sveltekit" || framework === "astro" || framework === "qwik",
    };
  }

  const defaults: Record<SupportedFramework, FrameworkCapabilities> = {
    nextjs: { ssr: true, ssg: true, apiRoutes: true, serverComponents: true, streaming: true },
    remix: { ssr: true, ssg: false, apiRoutes: true, serverComponents: false, streaming: true },
    nuxt: { ssr: true, ssg: true, apiRoutes: true, serverComponents: false, streaming: false },
    sveltekit: { ssr: true, ssg: true, apiRoutes: true, serverComponents: false, streaming: true },
    astro: { ssr: true, ssg: true, apiRoutes: true, serverComponents: false, streaming: true },
    gatsby: { ssr: false, ssg: true, apiRoutes: false, serverComponents: false, streaming: false },
    angular: { ssr: true, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    qwik: { ssr: true, ssg: true, apiRoutes: true, serverComponents: false, streaming: true },
    "vite-react": { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    "vite-vue": { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    "vite-svelte": { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    "vite-solid": { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    vite: { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
    express: { ssr: true, ssg: false, apiRoutes: true, serverComponents: false, streaming: false },
    fastify: { ssr: true, ssg: false, apiRoutes: true, serverComponents: false, streaming: false },
    unknown: { ssr: false, ssg: false, apiRoutes: false, serverComponents: false, streaming: false },
  };

  return defaults[framework];
}

function isViteFramework(framework: SupportedFramework | DetectedFrameworkId): boolean {
  return framework === "vite" || framework.startsWith("vite-");
}

function matchesFramework(expected: SupportedFramework, detected: DetectedFrameworkId): boolean {
  return expected === "vite" ? isViteFramework(detected) : expected === detected;
}

function createAdapter(
  name: SupportedFramework,
  options: {
    productionReady: boolean;
    capabilities: FrameworkCapabilities;
  }
): FrameworkAdapter {
  const adapter: FrameworkAdapter = {
    name,
    productionReady: options.productionReady,
    capabilities: options.capabilities,
    async detect(rootDir = process.cwd()) {
      const resolved = await detectProjectAdapter(rootDir);
      return matchesFramework(name, resolved.id);
    },
    async bootstrap(rootDir = process.cwd()) {
      return {
        rootDir,
        dataRoot: getCanonicalDataRoot(rootDir),
        ready: await adapter.detect(rootDir),
      };
    },
    resolveDataRoot(rootDir = process.cwd()) {
      return getCanonicalDataRoot(rootDir);
    },
    async setup(context: FrameworkAdapterContext) {
      await adapter.bootstrap(context.rootDir ?? process.cwd());
    },
    async registerRoutes(_context: FrameworkAdapterContext) {
      return;
    },
    async registerCMS(_context: FrameworkAdapterContext) {
      return;
    },
    async injectComponents(_context: FrameworkAdapterContext) {
      return;
    },
    lifecycle: {},
    getDiagnostics() {
      return {
        adapterName: name,
        productionReady: options.productionReady,
        capabilities: { ...options.capabilities },
      };
    },
    createRuntimeHooks() {
      return {};
    },
  };

  return adapter;
}

const adapterDefinitions: Record<SupportedFramework, { productionReady: boolean; capabilities: FrameworkCapabilities }> = {
  nextjs: {
    productionReady: true,
    capabilities: toRuntimeCapabilities("nextjs"),
  },
  remix: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("remix"),
  },
  nuxt: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("nuxt"),
  },
  sveltekit: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("sveltekit"),
  },
  astro: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("astro"),
  },
  gatsby: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("gatsby"),
  },
  angular: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("angular"),
  },
  qwik: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("qwik"),
  },
  "vite-react": {
    productionReady: false,
    capabilities: toRuntimeCapabilities("vite-react"),
  },
  "vite-vue": {
    productionReady: false,
    capabilities: toRuntimeCapabilities("vite-vue"),
  },
  "vite-svelte": {
    productionReady: false,
    capabilities: toRuntimeCapabilities("vite-svelte"),
  },
  "vite-solid": {
    productionReady: false,
    capabilities: toRuntimeCapabilities("vite-solid"),
  },
  vite: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("vite"),
  },
  express: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("express"),
  },
  fastify: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("fastify"),
  },
  unknown: {
    productionReady: false,
    capabilities: toRuntimeCapabilities("unknown"),
  },
};

export const frameworkAdapters: Record<SupportedFramework, FrameworkAdapter> = Object.fromEntries(
  Object.entries(adapterDefinitions).map(([name, definition]) => [
    name,
    createAdapter(name as SupportedFramework, definition),
  ])
) as Record<SupportedFramework, FrameworkAdapter>;

function resolveSupportedFramework(id: DetectedFrameworkId): SupportedFramework {
  return id;
}

export async function detectFramework(rootDir = process.cwd()): Promise<FrameworkDetectionResult> {
  const resolved = await detectProjectAdapter(rootDir);
  const framework = resolveSupportedFramework(resolved.id);
  const baseAdapter = frameworkAdapters[framework] ?? frameworkAdapters.unknown;

  return {
    framework,
    adapter: {
      ...baseAdapter,
      capabilities: toRuntimeCapabilities(framework, resolved.scan.capabilities, resolved.scan.nextRouter),
    },
  };
}

export type {
  FrameworkAdapter,
  FrameworkCapabilities,
  FrameworkDetectionResult,
  FrameworkRuntimeHooks,
  SupportedFramework,
} from "./types";
