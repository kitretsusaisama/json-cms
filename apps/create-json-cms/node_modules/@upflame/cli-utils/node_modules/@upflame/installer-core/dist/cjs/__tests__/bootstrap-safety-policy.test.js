"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const vitest_1 = require("vitest");
const bootstrap_safety_policy_1 = require("../policy/bootstrap-safety-policy");
async function pathExists(path) {
    try {
        await (0, promises_1.stat)(path);
        return true;
    }
    catch {
        return false;
    }
}
(0, vitest_1.describe)("BootstrapSafetyPolicy", () => {
    (0, vitest_1.it)("blocks apply mode in CI when --apply is not explicitly passed", () => {
        const policy = (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir: "/tmp/project",
            ci: true,
            executionMode: "apply",
            applyExplicitlyRequested: false,
        });
        (0, vitest_1.expect)(policy.executionMode).toBe("dryRun");
    });
    (0, vitest_1.it)("detects protected file and returns blocked result", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "policy-test-"));
        const policy = (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
        });
        const result = await (0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
            mutations: [{ kind: "writeFile", path: (0, path_1.join)(rootDir, "package.json"), content: "{}" }],
        });
        (0, vitest_1.expect)(result.status).toBe("blocked");
        (0, vitest_1.expect)(result.conflicts).toEqual([{ path: "package.json", reason: "protected" }]);
    });
    (0, vitest_1.it)("does not persist audit logs in dryRun mode", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "policy-test-"));
        const auditLogPath = (0, path_1.join)(rootDir, "audit", "mutations.log");
        const policy = (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir,
            executionMode: "dryRun",
            applyExplicitlyRequested: false,
            auditLogPath,
        });
        const result = await (0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
            mutations: [{ kind: "writeFile", path: (0, path_1.join)(rootDir, "data", "settings.json"), content: '{"ok":true}\n' }],
        });
        (0, vitest_1.expect)(result.status).toBe("dryRun");
        (0, vitest_1.expect)(result.auditLog.some((entry) => entry.status === "planned")).toBe(true);
        (0, vitest_1.expect)(await pathExists(auditLogPath)).toBe(false);
    });
    (0, vitest_1.it)("writes audit logs and applies non-conflicting writes", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "policy-test-"));
        const auditLogPath = (0, path_1.join)(rootDir, "audit", "mutations.log");
        const policy = (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
            auditLogPath,
        });
        const filePath = (0, path_1.join)(rootDir, "data", "settings.json");
        const result = await (0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
            mutations: [{ kind: "writeFile", path: filePath, content: '{"ok":true}\n' }],
        });
        (0, vitest_1.expect)(result.status).toBe("applied");
        (0, vitest_1.expect)(await (0, promises_1.readFile)(filePath, "utf-8")).toBe('{"ok":true}\n');
        (0, vitest_1.expect)(await pathExists(auditLogPath)).toBe(true);
    });
    (0, vitest_1.it)("rolls back earlier overwrite when a later mutation fails", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "policy-test-"));
        const originalPath = (0, path_1.join)(rootDir, "data", "existing.json");
        await (0, promises_1.mkdir)((0, path_1.join)(rootDir, "data"), { recursive: true });
        await (0, promises_1.writeFile)(originalPath, '{"version":1}\n', "utf-8");
        const policy = (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir,
            executionMode: "apply",
            applyExplicitlyRequested: true,
        });
        await (0, vitest_1.expect)((0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
            mutations: [
                { kind: "writeFile", path: originalPath, content: '{"version":2}\n', overwrite: true },
                { kind: "writeFile", path: (0, path_1.join)(rootDir, "package.json"), content: "{}" },
            ],
        })).resolves.toMatchObject({ status: "blocked" });
        // First mutation should not apply because planning detects a protected-file conflict.
        (0, vitest_1.expect)(await (0, promises_1.readFile)(originalPath, "utf-8")).toBe('{"version":1}\n');
        await (0, vitest_1.expect)((0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
            mutations: [
                { kind: "writeFile", path: originalPath, content: '{"version":2}\n', overwrite: true },
                { kind: "writeFile", path: (0, path_1.join)(rootDir, "nested", "ok.txt"), content: "ok\n" },
                { kind: "writeFile", path: rootDir, content: "will fail\n" },
            ],
        })).resolves.toMatchObject({ status: "blocked" });
        // After runtime failure in later mutation, first overwrite must be restored.
        (0, vitest_1.expect)(await (0, promises_1.readFile)(originalPath, "utf-8")).toBe('{"version":1}\n');
    });
});
//# sourceMappingURL=bootstrap-safety-policy.test.js.map