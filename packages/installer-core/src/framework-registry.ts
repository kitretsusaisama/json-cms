import { existsSync as fsExistsSync } from "fs";
import { access, readFile } from "fs/promises";
import path from "path";
import type { FrameworkAdapter, FrameworkId, PackageManager } from "./types";

export interface FrameworkRegistry {
  register(adapter: FrameworkAdapter): void;
  get(id: string): FrameworkAdapter | undefined;
  list(): FrameworkAdapter[];
}

export interface FrameworkDetectionCandidate {
  id: FrameworkId | (string & {});
  packageName: string;
  supported: boolean;
  capabilities: string[];
  score: number;
  confidence: number;
  matches: {
    dependencies: string[];
    configFiles: string[];
    directories: string[];
    scripts: string[];
  };
}

export interface WorkspaceTopology {
  monorepo: boolean;
  kind: "single" | "pnpm-workspace" | "turborepo" | "nx" | "lerna" | "workspaces";
  rootDir: string;
  signals: string[];
}

export interface ProjectIntelligenceReport {
  cwd: string;
  packageManager: PackageManager;
  workspace: WorkspaceTopology;
  frameworkCandidates: FrameworkDetectionCandidate[];
  detectedFramework?: FrameworkId;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: unknown;
}

const SIGNAL_WEIGHTS = {
  dependency: 45,
  configFile: 25,
  directory: 20,
  script: 10,
} as const;

export function createFrameworkRegistry(initial: FrameworkAdapter[] = defaultFrameworkAdapters): FrameworkRegistry {
  const adapters = new Map<string, FrameworkAdapter>(initial.map((adapter) => [adapter.id, adapter]));

  return {
    register(adapter) {
      adapters.set(adapter.id, adapter);
    },
    get(id) {
      return adapters.get(id);
    },
    list() {
      return [...adapters.values()];
    },
  };
}

export const defaultFrameworkAdapters: FrameworkAdapter[] = [
  {
    id: "nextjs",
    packageName: "@upflame/adapter-nextjs",
    detectDependencies: ["next"],
    detectConfigFiles: ["next.config.js", "next.config.mjs", "next.config.ts"],
    detectDirectories: ["app", "pages", "src/app", "src/pages"],
    detectScripts: ["next dev", "next build"],
    supported: true,
    capabilities: ["ssr", "isr", "rsc", "edge"],
  },
  {
    id: "astro",
    packageName: "@upflame/adapters",
    detectDependencies: ["astro"],
    detectConfigFiles: ["astro.config.mjs", "astro.config.ts"],
    detectDirectories: ["src/pages"],
    detectScripts: ["astro dev", "astro build"],
    supported: true,
    capabilities: ["static", "islands"],
  },
  {
    id: "remix",
    packageName: "@upflame/adapters",
    detectDependencies: ["@remix-run/react"],
    detectConfigFiles: ["remix.config.js", "remix.config.mjs", "remix.config.ts"],
    detectDirectories: ["app/routes"],
    detectScripts: ["remix dev", "remix build"],
    supported: true,
    capabilities: ["ssr", "nested-routes"],
  },
];

export const frameworkIntelligenceAdapters: FrameworkAdapter[] = [
  ...defaultFrameworkAdapters,
  {
    id: "vite",
    packageName: "@upflame/adapter-vite",
    detectDependencies: ["vite"],
    detectConfigFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
    detectDirectories: ["src"],
    detectScripts: ["vite", "vite build"],
    supported: false,
    capabilities: ["spa", "ssg"],
  },
  {
    id: "react",
    packageName: "@upflame/adapter-react",
    detectDependencies: ["react"],
    detectConfigFiles: [],
    detectDirectories: ["src"],
    detectScripts: ["react-scripts start"],
    supported: false,
    capabilities: ["spa"],
  },
  {
    id: "express",
    packageName: "@upflame/adapter-express",
    detectDependencies: ["express"],
    detectConfigFiles: [],
    detectDirectories: [],
    detectScripts: ["node server", "nodemon"],
    supported: false,
    capabilities: ["api-runtime", "middleware"],
  },
  {
    id: "node",
    packageName: "@upflame/adapter-node",
    detectDependencies: [],
    detectConfigFiles: [],
    detectDirectories: [],
    detectScripts: ["node"],
    supported: false,
    capabilities: ["api-runtime"],
  },
];

export async function detectFrameworkFromDependencies(
  cwd: string,
  registry: FrameworkRegistry = createFrameworkRegistry()
): Promise<FrameworkId | undefined> {
  try {
    const manifest = await readPackageManifest(cwd);
    const allDependencies = getAllDependencies(manifest);

    for (const adapter of registry.list()) {
      if (adapter.detectDependencies.every((dependency) => dependency in allDependencies)) {
        return adapter.id as FrameworkId;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function detectWorkspaceTopology(cwd: string): Promise<WorkspaceTopology> {
  const chain = ancestorChain(cwd);
  for (const candidate of chain) {
    const signals: string[] = [];

    if (await exists(path.join(candidate, "pnpm-workspace.yaml"))) {
      signals.push("pnpm-workspace.yaml");
      if (await exists(path.join(candidate, "turbo.json"))) {
        signals.push("turbo.json");
        return { monorepo: true, kind: "turborepo", rootDir: candidate, signals };
      }
      if (await exists(path.join(candidate, "nx.json"))) {
        signals.push("nx.json");
        return { monorepo: true, kind: "nx", rootDir: candidate, signals };
      }
      if (await exists(path.join(candidate, "lerna.json"))) {
        signals.push("lerna.json");
        return { monorepo: true, kind: "lerna", rootDir: candidate, signals };
      }
      return { monorepo: true, kind: "pnpm-workspace", rootDir: candidate, signals };
    }

    if (await exists(path.join(candidate, "turbo.json"))) {
      signals.push("turbo.json");
      return { monorepo: true, kind: "turborepo", rootDir: candidate, signals };
    }

    if (await exists(path.join(candidate, "nx.json"))) {
      signals.push("nx.json");
      return { monorepo: true, kind: "nx", rootDir: candidate, signals };
    }

    if (await exists(path.join(candidate, "lerna.json"))) {
      signals.push("lerna.json");
      return { monorepo: true, kind: "lerna", rootDir: candidate, signals };
    }

    const manifest = await readPackageManifestSafe(candidate);
    if (manifest?.workspaces) {
      signals.push("package.json#workspaces");
      return { monorepo: true, kind: "workspaces", rootDir: candidate, signals };
    }
  }

  return { monorepo: false, kind: "single", rootDir: cwd, signals: [] };
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  if (await exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(path.join(cwd, "yarn.lock"))) return "yarn";
  if (await exists(path.join(cwd, "bun.lockb")) || await exists(path.join(cwd, "bun.lock"))) return "bun";
  return "npm";
}

export async function scoreFrameworkCandidates(
  cwd: string,
  registry: FrameworkRegistry = createFrameworkRegistry(frameworkIntelligenceAdapters)
): Promise<FrameworkDetectionCandidate[]> {
  const manifest = await readPackageManifestSafe(cwd);
  if (!manifest) {
    return [];
  }

  const allDependencies = getAllDependencies(manifest);
  const scripts = Object.values(manifest.scripts ?? {});
  const candidates: FrameworkDetectionCandidate[] = [];

  for (const adapter of registry.list()) {
    const dependencyMatches = adapter.detectDependencies.filter((dependency) => dependency in allDependencies);
    const configFileMatches = (adapter.detectConfigFiles ?? []).filter((fileName) =>
      pathExistsSync(path.join(cwd, fileName))
    );
    const directoryMatches = (adapter.detectDirectories ?? []).filter((dirName) =>
      pathExistsSync(path.join(cwd, dirName))
    );
    const scriptMatches = (adapter.detectScripts ?? []).filter((scriptSignal) =>
      scripts.some((script) => scriptContainsSignal(script, scriptSignal))
    );

    const score =
      weightedScore(dependencyMatches.length, adapter.detectDependencies.length, SIGNAL_WEIGHTS.dependency) +
      weightedScore(configFileMatches.length, adapter.detectConfigFiles?.length ?? 0, SIGNAL_WEIGHTS.configFile) +
      weightedScore(directoryMatches.length, adapter.detectDirectories?.length ?? 0, SIGNAL_WEIGHTS.directory) +
      weightedScore(scriptMatches.length, adapter.detectScripts?.length ?? 0, SIGNAL_WEIGHTS.script);

    if (score <= 0) {
      continue;
    }

    candidates.push({
      id: adapter.id,
      packageName: adapter.packageName,
      supported: adapter.supported ?? false,
      capabilities: [...(adapter.capabilities ?? [])],
      score,
      confidence: Math.max(0.01, Math.min(0.99, score / 100)),
      matches: {
        dependencies: dependencyMatches,
        configFiles: configFileMatches,
        directories: directoryMatches,
        scripts: scriptMatches,
      },
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function detectFrameworkFromSignals(
  cwd: string,
  registry: FrameworkRegistry = createFrameworkRegistry(frameworkIntelligenceAdapters),
  options?: { supportedOnly?: boolean; minScore?: number }
): Promise<FrameworkId | undefined> {
  const candidates = await scoreFrameworkCandidates(cwd, registry);
  const minScore = options?.minScore ?? 25;
  const supportedOnly = options?.supportedOnly ?? false;

  for (const candidate of candidates) {
    if (candidate.score < minScore) {
      continue;
    }
    if (supportedOnly && !candidate.supported) {
      continue;
    }
    return candidate.id as FrameworkId;
  }

  return undefined;
}

export async function inspectProjectIntelligence(cwd: string): Promise<ProjectIntelligenceReport> {
  const workspace = await detectWorkspaceTopology(cwd);
  const packageManager = await detectPackageManager(workspace.rootDir);
  const frameworkCandidates = await scoreFrameworkCandidates(cwd);
  const detectedFramework = await detectFrameworkFromSignals(cwd, createFrameworkRegistry(frameworkIntelligenceAdapters), {
    minScore: 25,
  });

  return {
    cwd,
    packageManager,
    workspace,
    frameworkCandidates,
    detectedFramework,
  };
}

function getAllDependencies(manifest: PackageManifest): Record<string, string> {
  return {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
}

async function readPackageManifest(cwd: string): Promise<PackageManifest> {
  const source = await readFile(path.join(cwd, "package.json"), "utf-8");
  return JSON.parse(source) as PackageManifest;
}

async function readPackageManifestSafe(cwd: string): Promise<PackageManifest | undefined> {
  try {
    return await readPackageManifest(cwd);
  } catch {
    return undefined;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function pathExistsSync(filePath: string): boolean {
  return fsExistsSync(filePath);
}

function weightedScore(matches: number, totalSignals: number, weight: number): number {
  if (totalSignals <= 0) {
    return 0;
  }
  return Math.round((matches / totalSignals) * weight);
}

function ancestorChain(start: string): string[] {
  const chain: string[] = [];
  let current = path.resolve(start);
  while (true) {
    chain.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return chain;
}

function scriptContainsSignal(script: string, signal: string): boolean {
  const normalizedScript = script.toLowerCase();
  const normalizedSignal = signal.toLowerCase();
  if (normalizedSignal.includes(" ")) {
    return normalizedScript.includes(normalizedSignal);
  }

  const escaped = normalizedSignal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokenRegex = new RegExp(`(^|\\s|[;&|])${escaped}(\\s|$)`);
  return tokenRegex.test(normalizedScript);
}
