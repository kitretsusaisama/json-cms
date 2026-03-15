"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInstallGuardrails = runInstallGuardrails;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_module_1 = require("node:module");
const semver_1 = __importDefault(require("semver"));
const FRAMEWORK_ADAPTERS = {
    nextjs: "@upflame/adapter-nextjs",
};
function readJson(filePath) {
    try {
        return {
            ok: true,
            value: JSON.parse((0, node_fs_1.readFileSync)(filePath, "utf8")),
        };
    }
    catch (error) {
        const err = error;
        if (err.code === "ENOENT")
            return { ok: false, reason: "missing" };
        if (error instanceof SyntaxError)
            return { ok: false, reason: "invalid", error };
        return { ok: false, reason: "unreadable", error: error };
    }
}
function detectFramework(pkg) {
    const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
    };
    if (deps.next)
        return "nextjs";
    if (deps.nuxt)
        return "nuxt";
    if (deps["@sveltejs/kit"])
        return "sveltekit";
    if (deps.remix || deps["@remix-run/react"])
        return "remix";
    return "unknown";
}
function packageVersion(cwd, packageName) {
    const req = (0, node_module_1.createRequire)(node_path_1.default.join(cwd, "package.json"));
    let pkgJsonPath;
    try {
        pkgJsonPath = req.resolve(`${packageName}/package.json`, { paths: [cwd] });
    }
    catch {
        return { version: null, reason: "missing" };
    }
    const pkg = readJson(pkgJsonPath);
    if (!pkg.ok) {
        return {
            version: null,
            reason: pkg.reason,
            packageJsonPath: pkgJsonPath,
            error: pkg.error,
        };
    }
    return typeof pkg.value.version === "string"
        ? { version: pkg.value.version, packageJsonPath: pkgJsonPath }
        : { version: null, reason: "invalid", packageJsonPath: pkgJsonPath };
}
function collectPluginNames(pkg) {
    const names = new Set();
    for (const group of [pkg.dependencies, pkg.optionalDependencies]) {
        for (const name of Object.keys(group ?? {})) {
            if (name.startsWith("@upflame/plugin-"))
                names.add(name);
        }
    }
    return [...names].sort();
}
function readPluginCompatibility(cwd, pluginName) {
    const diagnostics = [];
    const packageResult = packageVersion(cwd, pluginName);
    if (!packageResult.version || !packageResult.packageJsonPath) {
        return { compatibility: {}, diagnostics };
    }
    const pluginDir = node_path_1.default.dirname(packageResult.packageJsonPath);
    const pkgRead = readJson(packageResult.packageJsonPath);
    if (!pkgRead.ok) {
        diagnostics.push({
            level: "error",
            code: "GUARDRAIL_PLUGIN_PACKAGE_JSON_INVALID",
            message: `${pluginName} has an invalid package.json (${packageResult.packageJsonPath}).`,
            remediation: [
                `Fix JSON syntax in ${packageResult.packageJsonPath}`,
                `npm install ${pluginName}@latest`,
            ],
        });
        return { compatibility: {}, diagnostics };
    }
    const pluginManifestPath = node_path_1.default.join(pluginDir, "plugin.json");
    const pluginManifest = readJson(pluginManifestPath);
    if (!pluginManifest.ok && pluginManifest.reason === "invalid") {
        diagnostics.push({
            level: "error",
            code: "GUARDRAIL_PLUGIN_MANIFEST_INVALID",
            message: `${pluginName} has an invalid plugin.json (${pluginManifestPath}).`,
            remediation: [
                `Fix JSON syntax in ${pluginManifestPath}`,
                `npm install ${pluginName}@latest`,
            ],
        });
    }
    const manifestValue = pluginManifest.ok ? pluginManifest.value : undefined;
    const fromManifest = manifestValue?.compatibility;
    const engines = manifestValue?.engines;
    const peerDeps = pkgRead.value.peerDependencies;
    const adapters = (fromManifest?.adapters && typeof fromManifest.adapters === "object"
        ? fromManifest.adapters
        : {});
    for (const [name, range] of Object.entries(peerDeps ?? {})) {
        if (name.startsWith("@upflame/adapter-") && typeof range === "string") {
            adapters[name] = range;
        }
    }
    const jsonCms = (typeof fromManifest?.jsonCms === "string" && fromManifest.jsonCms) ||
        (typeof engines?.["json-cms"] === "string" && engines["json-cms"]) ||
        (typeof peerDeps?.["@upflame/json-cms"] === "string" && peerDeps["@upflame/json-cms"]) ||
        (typeof peerDeps?.["@upflame/cms-core"] === "string" && peerDeps["@upflame/cms-core"]) ||
        undefined;
    return { compatibility: { jsonCms, adapters }, diagnostics };
}
function isSupportedRange(range) {
    return semver_1.default.validRange(range, { includePrerelease: true }) !== null;
}
function runInstallGuardrails(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const strict = options.strict ?? process.env.JSONCMS_GUARDRAILS_STRICT === "1";
    if (process.env.JSONCMS_GUARDRAILS === "0") {
        return { framework: "disabled", diagnostics: [], errorCount: 0, warningCount: 0, shouldFail: false };
    }
    const diagnostics = [];
    const projectPkgPath = node_path_1.default.join(cwd, "package.json");
    const projectPkgRead = readJson(projectPkgPath);
    if (!projectPkgRead.ok) {
        diagnostics.push({
            level: "error",
            code: projectPkgRead.reason === "invalid" ? "GUARDRAIL_PACKAGE_JSON_INVALID" : "GUARDRAIL_PACKAGE_JSON_MISSING",
            message: projectPkgRead.reason === "invalid"
                ? `package.json contains invalid JSON (${projectPkgPath}).`
                : "Could not read package.json from the current working directory.",
            remediation: [
                "cd <project-root>",
                projectPkgRead.reason === "invalid" ? `Fix JSON syntax in ${projectPkgPath}` : "npx jsoncms-install-guardrails",
            ],
        });
        return { framework: "unknown", diagnostics, errorCount: 1, warningCount: 0, shouldFail: true };
    }
    const projectPkg = projectPkgRead.value;
    const framework = options.framework ?? process.env.JSONCMS_GUARDRAILS_FRAMEWORK ?? detectFramework(projectPkg);
    const expectedAdapter = options.adapter ?? FRAMEWORK_ADAPTERS[framework];
    if (framework === "unknown") {
        diagnostics.push({
            level: "warning",
            code: "GUARDRAIL_FRAMEWORK_UNKNOWN",
            message: "Could not auto-detect your framework; adapter compatibility checks were skipped.",
            remediation: ["npx jsoncms-install-guardrails --framework nextjs"],
        });
    }
    if (expectedAdapter) {
        const adapterResult = packageVersion(cwd, expectedAdapter);
        if (!adapterResult.version) {
            diagnostics.push({
                level: "error",
                code: "GUARDRAIL_ADAPTER_MISSING",
                message: `Detected framework \"${framework}\" requires ${expectedAdapter}, but it is not installed/resolvable from this project.`,
                remediation: [`npm install ${expectedAdapter}`],
            });
        }
    }
    const coreResult = packageVersion(cwd, "@upflame/json-cms");
    const fallbackCoreResult = coreResult.version ? null : packageVersion(cwd, "@upflame/cms-core");
    const installedCore = coreResult.version ?? fallbackCoreResult?.version ?? null;
    if (!installedCore) {
        diagnostics.push({
            level: "warning",
            code: "GUARDRAIL_CORE_MISSING",
            message: "No @upflame/json-cms or @upflame/cms-core runtime was detected.",
            remediation: ["npm install @upflame/json-cms"],
        });
    }
    for (const pluginName of collectPluginNames(projectPkg)) {
        const pluginVersionResult = packageVersion(cwd, pluginName);
        if (!pluginVersionResult.version)
            continue;
        const { compatibility, diagnostics: pluginDiagnostics } = readPluginCompatibility(cwd, pluginName);
        diagnostics.push(...pluginDiagnostics);
        if (installedCore && compatibility.jsonCms) {
            if (!isSupportedRange(compatibility.jsonCms)) {
                diagnostics.push({
                    level: "error",
                    code: "GUARDRAIL_PLUGIN_CORE_RANGE_INVALID",
                    message: `${pluginName} declares unsupported json-cms range \"${compatibility.jsonCms}\".`,
                    remediation: [
                        `Update ${pluginName} compatibility range to valid semver syntax`,
                        `npm install ${pluginName}@latest`,
                    ],
                });
            }
            else if (!semver_1.default.satisfies(installedCore, compatibility.jsonCms, { includePrerelease: true })) {
                diagnostics.push({
                    level: "error",
                    code: "GUARDRAIL_PLUGIN_CORE_INCOMPATIBLE",
                    message: `${pluginName} expects json-cms ${compatibility.jsonCms}, but ${installedCore} is installed.`,
                    remediation: [`npm install @upflame/json-cms@\"${compatibility.jsonCms}\"`, `npm install ${pluginName}@latest`],
                });
            }
        }
        for (const [adapterName, range] of Object.entries(compatibility.adapters ?? {})) {
            if (!isSupportedRange(range)) {
                diagnostics.push({
                    level: "error",
                    code: "GUARDRAIL_PLUGIN_ADAPTER_RANGE_INVALID",
                    message: `${pluginName} declares unsupported adapter range ${adapterName}@${range}.`,
                    remediation: [
                        `Update ${pluginName} compatibility range for ${adapterName}`,
                        `npm install ${pluginName}@latest`,
                    ],
                });
                continue;
            }
            const installedAdapter = packageVersion(cwd, adapterName);
            if (!installedAdapter.version) {
                diagnostics.push({
                    level: "error",
                    code: "GUARDRAIL_PLUGIN_ADAPTER_MISSING",
                    message: `${pluginName} requires ${adapterName}@${range}, but ${adapterName} is not installed/resolvable from this project.`,
                    remediation: [`npm install ${adapterName}@\"${range}\"`],
                });
                continue;
            }
            if (!semver_1.default.satisfies(installedAdapter.version, range, { includePrerelease: true })) {
                diagnostics.push({
                    level: "error",
                    code: "GUARDRAIL_PLUGIN_ADAPTER_INCOMPATIBLE",
                    message: `${pluginName} requires ${adapterName}@${range}, but ${installedAdapter.version} is installed.`,
                    remediation: [`npm install ${adapterName}@\"${range}\"`],
                });
            }
        }
    }
    const errorCount = diagnostics.filter((item) => item.level === "error").length;
    const warningCount = diagnostics.filter((item) => item.level === "warning").length;
    const failOnError = options.postinstall ? strict : true;
    return {
        framework,
        diagnostics,
        errorCount,
        warningCount,
        shouldFail: failOnError && errorCount > 0,
    };
}
//# sourceMappingURL=index.js.map