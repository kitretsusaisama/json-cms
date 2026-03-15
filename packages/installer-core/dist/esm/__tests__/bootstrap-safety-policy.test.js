import { mkdtemp, mkdir, readFile, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { applyMutationPlan, createBootstrapSafetyPolicy } from "../policy/bootstrap-safety-policy";
async function pathExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
describe("BootstrapSafetyPolicy", () => {
    it("blocks apply mode in CI when --apply is not explicitly passed", () => {
        const policy = createBootstrapSafetyPolicy({
            rootDir: "/tmp/project",
            ci: true,
            executionMode: "apply",
            applyExplicitlyRequested: false,
        });
        expect(policy.executionMode).toBe("dryRun");
    });
    it("detects protected file and returns blocked result", async () => {
        const rootDir = await mkdtemp(join(tmpdir(), "policy-test-"));
        const policy = createBootstrapSafetyPolicy({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
        });
        const result = await applyMutationPlan(policy, {
            mutations: [{ kind: "writeFile", path: join(rootDir, "package.json"), content: "{}" }],
        });
        expect(result.status).toBe("blocked");
        expect(result.conflicts).toEqual([{ path: "package.json", reason: "protected" }]);
    });
    it("does not persist audit logs in dryRun mode", async () => {
        const rootDir = await mkdtemp(join(tmpdir(), "policy-test-"));
        const auditLogPath = join(rootDir, "audit", "mutations.log");
        const policy = createBootstrapSafetyPolicy({
            rootDir,
            executionMode: "dryRun",
            applyExplicitlyRequested: false,
            auditLogPath,
        });
        const result = await applyMutationPlan(policy, {
            mutations: [{ kind: "writeFile", path: join(rootDir, "data", "settings.json"), content: '{"ok":true}\n' }],
        });
        expect(result.status).toBe("dryRun");
        expect(result.auditLog.some((entry) => entry.status === "planned")).toBe(true);
        expect(await pathExists(auditLogPath)).toBe(false);
    });
    it("writes audit logs and applies non-conflicting writes", async () => {
        const rootDir = await mkdtemp(join(tmpdir(), "policy-test-"));
        const auditLogPath = join(rootDir, "audit", "mutations.log");
        const policy = createBootstrapSafetyPolicy({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
            auditLogPath,
        });
        const filePath = join(rootDir, "data", "settings.json");
        const result = await applyMutationPlan(policy, {
            mutations: [{ kind: "writeFile", path: filePath, content: '{"ok":true}\n' }],
        });
        expect(result.status).toBe("applied");
        expect(await readFile(filePath, "utf-8")).toBe('{"ok":true}\n');
        expect(await pathExists(auditLogPath)).toBe(true);
    });
    it("rolls back earlier overwrite when a later mutation fails", async () => {
        const rootDir = await mkdtemp(join(tmpdir(), "policy-test-"));
        const originalPath = join(rootDir, "data", "existing.json");
        await mkdir(join(rootDir, "data"), { recursive: true });
        await writeFile(originalPath, '{"version":1}\n', "utf-8");
        const policy = createBootstrapSafetyPolicy({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
        });
        await expect(applyMutationPlan(policy, {
            mutations: [
                { kind: "writeFile", path: originalPath, content: '{"version":2}\n', overwrite: true },
                { kind: "writeFile", path: join(rootDir, "package.json"), content: "{}" },
            ],
        })).resolves.toMatchObject({ status: "blocked" });
        // First mutation should not apply because planning detects a protected-file conflict.
        expect(await readFile(originalPath, "utf-8")).toBe('{"version":1}\n');
        await expect(applyMutationPlan(policy, {
            mutations: [
                { kind: "writeFile", path: originalPath, content: '{"version":2}\n', overwrite: true },
                { kind: "writeFile", path: join(rootDir, "nested", "ok.txt"), content: "ok\n" },
                { kind: "writeFile", path: rootDir, content: "will fail\n" },
            ],
        })).resolves.toMatchObject({ status: "blocked" });
        // After runtime failure in later mutation, first overwrite must be restored.
        expect(await readFile(originalPath, "utf-8")).toBe('{"version":1}\n');
    });
});
//# sourceMappingURL=bootstrap-safety-policy.test.js.map