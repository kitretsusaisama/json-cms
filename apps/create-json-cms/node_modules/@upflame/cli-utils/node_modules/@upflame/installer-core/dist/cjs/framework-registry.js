"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkIntelligenceAdapters = exports.defaultFrameworkAdapters = void 0;
exports.createFrameworkRegistry = createFrameworkRegistry;
exports.detectFrameworkFromDependencies = detectFrameworkFromDependencies;
exports.detectWorkspaceTopology = detectWorkspaceTopology;
exports.detectPackageManager = detectPackageManager;
exports.scoreFrameworkCandidates = scoreFrameworkCandidates;
exports.detectFrameworkFromSignals = detectFrameworkFromSignals;
exports.inspectProjectIntelligence = inspectProjectIntelligence;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const SIGNAL_WEIGHTS = {
    dependency: 45,
    configFile: 25,
    directory: 20,
    script: 10,
};
function createFrameworkRegistry(initial = exports.defaultFrameworkAdapters) {
    const adapters = new Map(initial.map((adapter) => [adapter.id, adapter]));
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
exports.defaultFrameworkAdapters = [
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
exports.frameworkIntelligenceAdapters = [
    ...exports.defaultFrameworkAdapters,
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
async function detectFrameworkFromDependencies(cwd, registry = createFrameworkRegistry()) {
    try {
        const manifest = await readPackageManifest(cwd);
        const allDependencies = getAllDependencies(manifest);
        for (const adapter of registry.list()) {
            if (adapter.detectDependencies.every((dependency) => dependency in allDependencies)) {
                return adapter.id;
            }
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
async function detectWorkspaceTopology(cwd) {
    const chain = ancestorChain(cwd);
    for (const candidate of chain) {
        const signals = [];
        if (await exists(path_1.default.join(candidate, "pnpm-workspace.yaml"))) {
            signals.push("pnpm-workspace.yaml");
            if (await exists(path_1.default.join(candidate, "turbo.json"))) {
                signals.push("turbo.json");
                return { monorepo: true, kind: "turborepo", rootDir: candidate, signals };
            }
            if (await exists(path_1.default.join(candidate, "nx.json"))) {
                signals.push("nx.json");
                return { monorepo: true, kind: "nx", rootDir: candidate, signals };
            }
            if (await exists(path_1.default.join(candidate, "lerna.json"))) {
                signals.push("lerna.json");
                return { monorepo: true, kind: "lerna", rootDir: candidate, signals };
            }
            return { monorepo: true, kind: "pnpm-workspace", rootDir: candidate, signals };
        }
        if (await exists(path_1.default.join(candidate, "turbo.json"))) {
            signals.push("turbo.json");
            return { monorepo: true, kind: "turborepo", rootDir: candidate, signals };
        }
        if (await exists(path_1.default.join(candidate, "nx.json"))) {
            signals.push("nx.json");
            return { monorepo: true, kind: "nx", rootDir: candidate, signals };
        }
        if (await exists(path_1.default.join(candidate, "lerna.json"))) {
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
async function detectPackageManager(cwd) {
    if (await exists(path_1.default.join(cwd, "pnpm-lock.yaml")))
        return "pnpm";
    if (await exists(path_1.default.join(cwd, "yarn.lock")))
        return "yarn";
    if (await exists(path_1.default.join(cwd, "bun.lockb")) || await exists(path_1.default.join(cwd, "bun.lock")))
        return "bun";
    return "npm";
}
async function scoreFrameworkCandidates(cwd, registry = createFrameworkRegistry(exports.frameworkIntelligenceAdapters)) {
    const manifest = await readPackageManifestSafe(cwd);
    if (!manifest) {
        return [];
    }
    const allDependencies = getAllDependencies(manifest);
    const scripts = Object.values(manifest.scripts ?? {});
    const candidates = [];
    for (const adapter of registry.list()) {
        const dependencyMatches = adapter.detectDependencies.filter((dependency) => dependency in allDependencies);
        const configFileMatches = (adapter.detectConfigFiles ?? []).filter((fileName) => pathExistsSync(path_1.default.join(cwd, fileName)));
        const directoryMatches = (adapter.detectDirectories ?? []).filter((dirName) => pathExistsSync(path_1.default.join(cwd, dirName)));
        const scriptMatches = (adapter.detectScripts ?? []).filter((scriptSignal) => scripts.some((script) => scriptContainsSignal(script, scriptSignal)));
        const score = weightedScore(dependencyMatches.length, adapter.detectDependencies.length, SIGNAL_WEIGHTS.dependency) +
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
async function detectFrameworkFromSignals(cwd, registry = createFrameworkRegistry(exports.frameworkIntelligenceAdapters), options) {
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
        return candidate.id;
    }
    return undefined;
}
async function inspectProjectIntelligence(cwd) {
    const workspace = await detectWorkspaceTopology(cwd);
    const packageManager = await detectPackageManager(workspace.rootDir);
    const frameworkCandidates = await scoreFrameworkCandidates(cwd);
    const detectedFramework = await detectFrameworkFromSignals(cwd, createFrameworkRegistry(exports.frameworkIntelligenceAdapters), {
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
function getAllDependencies(manifest) {
    return {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
    };
}
async function readPackageManifest(cwd) {
    const source = await (0, promises_1.readFile)(path_1.default.join(cwd, "package.json"), "utf-8");
    return JSON.parse(source);
}
async function readPackageManifestSafe(cwd) {
    try {
        return await readPackageManifest(cwd);
    }
    catch {
        return undefined;
    }
}
async function exists(filePath) {
    try {
        await (0, promises_1.access)(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function pathExistsSync(filePath) {
    return (0, fs_1.existsSync)(filePath);
}
function weightedScore(matches, totalSignals, weight) {
    if (totalSignals <= 0) {
        return 0;
    }
    return Math.round((matches / totalSignals) * weight);
}
function ancestorChain(start) {
    const chain = [];
    let current = path_1.default.resolve(start);
    while (true) {
        chain.push(current);
        const parent = path_1.default.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    return chain;
}
function scriptContainsSignal(script, signal) {
    const normalizedScript = script.toLowerCase();
    const normalizedSignal = signal.toLowerCase();
    if (normalizedSignal.includes(" ")) {
        return normalizedScript.includes(normalizedSignal);
    }
    const escaped = normalizedSignal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokenRegex = new RegExp(`(^|\\s|[;&|])${escaped}(\\s|$)`);
    return tokenRegex.test(normalizedScript);
}
//# sourceMappingURL=framework-registry.js.map