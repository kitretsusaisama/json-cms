"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const framework_registry_1 = require("../framework-registry");
async function writeJson(filePath, value) {
    await (0, promises_1.mkdir)(path_1.default.dirname(filePath), { recursive: true });
    await (0, promises_1.writeFile)(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}
(0, vitest_1.describe)("framework intelligence", () => {
    (0, vitest_1.it)("scores nextjs highest for next.js projects", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-next-"));
        await writeJson(path_1.default.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
                react: "18.3.1",
            },
            scripts: {
                dev: "next dev",
                build: "next build",
            },
        });
        await (0, promises_1.writeFile)(path_1.default.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await (0, promises_1.mkdir)(path_1.default.join(root, "app"), { recursive: true });
        const candidates = await (0, framework_registry_1.scoreFrameworkCandidates)(root);
        (0, vitest_1.expect)(candidates[0]?.id).toBe("nextjs");
        (0, vitest_1.expect)(candidates[0]?.score).toBeGreaterThanOrEqual(60);
    });
    (0, vitest_1.it)("detects astro in supported-only mode", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-astro-"));
        await writeJson(path_1.default.join(root, "package.json"), {
            dependencies: {
                astro: "5.0.0",
            },
            scripts: {
                dev: "astro dev",
            },
        });
        await (0, promises_1.writeFile)(path_1.default.join(root, "astro.config.mjs"), "export default {};\n", "utf-8");
        const detected = await (0, framework_registry_1.detectFrameworkFromSignals)(root, undefined, { supportedOnly: true });
        (0, vitest_1.expect)(detected).toBe("astro");
    });
    (0, vitest_1.it)("detects turborepo topology from workspace signals", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-mono-"));
        const appDir = path_1.default.join(root, "apps", "web");
        await (0, promises_1.mkdir)(appDir, { recursive: true });
        await (0, promises_1.writeFile)(path_1.default.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n", "utf-8");
        await (0, promises_1.writeFile)(path_1.default.join(root, "turbo.json"), "{}\n", "utf-8");
        await writeJson(path_1.default.join(root, "package.json"), {
            name: "workspace",
            private: true,
        });
        await writeJson(path_1.default.join(appDir, "package.json"), {
            name: "web",
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                dev: "next dev",
            },
        });
        const topology = await (0, framework_registry_1.detectWorkspaceTopology)(appDir);
        (0, vitest_1.expect)(topology.monorepo).toBe(true);
        (0, vitest_1.expect)(topology.kind).toBe("turborepo");
        (0, vitest_1.expect)(topology.rootDir).toBe(root);
    });
    (0, vitest_1.it)("produces project intelligence summary", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-summary-"));
        await writeJson(path_1.default.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                dev: "next dev",
            },
        });
        await (0, promises_1.writeFile)(path_1.default.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
        await (0, promises_1.writeFile)(path_1.default.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await (0, promises_1.mkdir)(path_1.default.join(root, "app"), { recursive: true });
        const report = await (0, framework_registry_1.inspectProjectIntelligence)(root);
        (0, vitest_1.expect)(report.packageManager).toBe("pnpm");
        (0, vitest_1.expect)(report.frameworkCandidates[0]?.id).toBe("nextjs");
        (0, vitest_1.expect)(report.detectedFramework).toBe("nextjs");
    });
    (0, vitest_1.it)("does not treat vitest scripts as vite framework signal", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-vitest-"));
        await writeJson(path_1.default.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                test: "vitest run",
                dev: "next dev",
            },
        });
        await (0, promises_1.writeFile)(path_1.default.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await (0, promises_1.mkdir)(path_1.default.join(root, "app"), { recursive: true });
        const candidates = await (0, framework_registry_1.scoreFrameworkCandidates)(root);
        (0, vitest_1.expect)(candidates[0]?.id).toBe("nextjs");
    });
    (0, vitest_1.it)("detects remix as supported when project signals match", async () => {
        const root = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "framework-intel-remix-"));
        await writeJson(path_1.default.join(root, "package.json"), {
            dependencies: {
                "@remix-run/react": "2.10.0",
            },
            scripts: {
                dev: "remix dev",
                build: "remix build",
            },
        });
        await (0, promises_1.writeFile)(path_1.default.join(root, "remix.config.js"), "module.exports = {};\n", "utf-8");
        await (0, promises_1.mkdir)(path_1.default.join(root, "app", "routes"), { recursive: true });
        const detected = await (0, framework_registry_1.detectFrameworkFromSignals)(root, undefined, { supportedOnly: true });
        (0, vitest_1.expect)(detected).toBe("remix");
    });
});
//# sourceMappingURL=framework-intelligence.test.js.map