import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { detectFrameworkFromSignals, detectWorkspaceTopology, inspectProjectIntelligence, scoreFrameworkCandidates, } from "../framework-registry";
async function writeJson(filePath, value) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}
describe("framework intelligence", () => {
    it("scores nextjs highest for next.js projects", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-next-"));
        await writeJson(path.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
                react: "18.3.1",
            },
            scripts: {
                dev: "next dev",
                build: "next build",
            },
        });
        await writeFile(path.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await mkdir(path.join(root, "app"), { recursive: true });
        const candidates = await scoreFrameworkCandidates(root);
        expect(candidates[0]?.id).toBe("nextjs");
        expect(candidates[0]?.score).toBeGreaterThanOrEqual(60);
    });
    it("detects astro in supported-only mode", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-astro-"));
        await writeJson(path.join(root, "package.json"), {
            dependencies: {
                astro: "5.0.0",
            },
            scripts: {
                dev: "astro dev",
            },
        });
        await writeFile(path.join(root, "astro.config.mjs"), "export default {};\n", "utf-8");
        const detected = await detectFrameworkFromSignals(root, undefined, { supportedOnly: true });
        expect(detected).toBe("astro");
    });
    it("detects turborepo topology from workspace signals", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-mono-"));
        const appDir = path.join(root, "apps", "web");
        await mkdir(appDir, { recursive: true });
        await writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n", "utf-8");
        await writeFile(path.join(root, "turbo.json"), "{}\n", "utf-8");
        await writeJson(path.join(root, "package.json"), {
            name: "workspace",
            private: true,
        });
        await writeJson(path.join(appDir, "package.json"), {
            name: "web",
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                dev: "next dev",
            },
        });
        const topology = await detectWorkspaceTopology(appDir);
        expect(topology.monorepo).toBe(true);
        expect(topology.kind).toBe("turborepo");
        expect(topology.rootDir).toBe(root);
    });
    it("produces project intelligence summary", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-summary-"));
        await writeJson(path.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                dev: "next dev",
            },
        });
        await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
        await writeFile(path.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await mkdir(path.join(root, "app"), { recursive: true });
        const report = await inspectProjectIntelligence(root);
        expect(report.packageManager).toBe("pnpm");
        expect(report.frameworkCandidates[0]?.id).toBe("nextjs");
        expect(report.detectedFramework).toBe("nextjs");
    });
    it("does not treat vitest scripts as vite framework signal", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-vitest-"));
        await writeJson(path.join(root, "package.json"), {
            dependencies: {
                next: "15.5.0",
            },
            scripts: {
                test: "vitest run",
                dev: "next dev",
            },
        });
        await writeFile(path.join(root, "next.config.ts"), "export default {};\n", "utf-8");
        await mkdir(path.join(root, "app"), { recursive: true });
        const candidates = await scoreFrameworkCandidates(root);
        expect(candidates[0]?.id).toBe("nextjs");
    });
    it("detects remix as supported when project signals match", async () => {
        const root = await mkdtemp(path.join(tmpdir(), "framework-intel-remix-"));
        await writeJson(path.join(root, "package.json"), {
            dependencies: {
                "@remix-run/react": "2.10.0",
            },
            scripts: {
                dev: "remix dev",
                build: "remix build",
            },
        });
        await writeFile(path.join(root, "remix.config.js"), "module.exports = {};\n", "utf-8");
        await mkdir(path.join(root, "app", "routes"), { recursive: true });
        const detected = await detectFrameworkFromSignals(root, undefined, { supportedOnly: true });
        expect(detected).toBe("remix");
    });
});
//# sourceMappingURL=framework-intelligence.test.js.map