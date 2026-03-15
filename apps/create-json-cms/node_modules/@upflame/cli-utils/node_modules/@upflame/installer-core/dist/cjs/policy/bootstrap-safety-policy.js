"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBootstrapSafetyPolicy = createBootstrapSafetyPolicy;
exports.applyMutationPlan = applyMutationPlan;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const DEFAULT_PROTECTED_FILES = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "bun.lock",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.ts",
    "astro.config.mjs",
    "vite.config.ts",
];
async function exists(path) {
    try {
        await (0, promises_1.stat)(path);
        return true;
    }
    catch {
        return false;
    }
}
function nowIso() {
    return new Date().toISOString();
}
function toRelative(rootDir, targetPath) {
    return (0, path_1.relative)(rootDir, targetPath).replaceAll("\\", "/");
}
function createBootstrapSafetyPolicy(options) {
    const ci = options.ci ?? process.env.CI === "true";
    const interactivityMode = options.interactivityMode ?? (ci ? "nonInteractive" : "interactive");
    const applyExplicitlyRequested = options.applyExplicitlyRequested ?? false;
    const requestedExecutionMode = options.executionMode ?? "apply";
    const executionMode = ci && requestedExecutionMode === "apply" && !applyExplicitlyRequested ? "dryRun" : requestedExecutionMode;
    return {
        rootDir: options.rootDir,
        interactivityMode,
        executionMode,
        ci,
        applyExplicitlyRequested,
        protectedFiles: new Set([...(options.protectedFiles ?? []), ...DEFAULT_PROTECTED_FILES]),
        auditLogPath: options.auditLogPath,
        assertPromptAllowed() {
            if (this.interactivityMode !== "interactive") {
                throw new Error("Interactive prompts are disabled in nonInteractive mode.");
            }
        },
        assertMutationAllowed() {
            if (this.executionMode !== "apply") {
                throw new Error("Filesystem mutations are disabled in dryRun mode.");
            }
            if (this.ci && !this.applyExplicitlyRequested) {
                throw new Error("Auto-write in CI is blocked unless --apply is explicitly passed.");
            }
        },
    };
}
async function applyMutationPlan(policy, plan) {
    const conflicts = [];
    const auditLog = [];
    for (const mutation of plan.mutations) {
        const relPath = toRelative(policy.rootDir, mutation.path);
        if (policy.protectedFiles.has(relPath)) {
            conflicts.push({ path: relPath, reason: "protected" });
            auditLog.push({ timestamp: nowIso(), kind: mutation.kind, path: relPath, status: "blocked", detail: "protected file" });
            continue;
        }
        if (mutation.kind === "writeFile" && !mutation.overwrite && (await exists(mutation.path))) {
            conflicts.push({ path: relPath, reason: "exists" });
            auditLog.push({ timestamp: nowIso(), kind: mutation.kind, path: relPath, status: "blocked", detail: "file already exists" });
            continue;
        }
        auditLog.push({ timestamp: nowIso(), kind: mutation.kind, path: relPath, status: "planned" });
    }
    if (conflicts.length > 0) {
        await persistAuditLog(policy, auditLog, false);
        return { status: "blocked", conflicts, auditLog };
    }
    if (policy.executionMode === "dryRun") {
        // Keep dry-run side-effect free: return the in-memory audit trail only.
        return { status: "dryRun", conflicts: [], auditLog };
    }
    policy.assertMutationAllowed();
    const rollbacks = [];
    const deferredBackupCleanupPaths = [];
    try {
        for (const mutation of plan.mutations) {
            const relPath = toRelative(policy.rootDir, mutation.path);
            if (mutation.kind === "mkdir") {
                const dirExisted = await exists(mutation.path);
                await (0, promises_1.mkdir)(mutation.path, { recursive: true });
                if (!dirExisted) {
                    rollbacks.unshift(async () => {
                        await (0, promises_1.rm)(mutation.path, { recursive: true, force: true });
                    });
                }
            }
            if (mutation.kind === "writeFile") {
                await (0, promises_1.mkdir)((0, path_1.dirname)(mutation.path), { recursive: true });
                const didExist = await exists(mutation.path);
                const backupPath = didExist ? `${mutation.path}.bak` : undefined;
                if (backupPath && didExist) {
                    await (0, promises_1.rename)(mutation.path, backupPath);
                    deferredBackupCleanupPaths.push(backupPath);
                    rollbacks.unshift(async () => {
                        await (0, promises_1.rm)(mutation.path, { force: true });
                        await (0, promises_1.rename)(backupPath, mutation.path);
                    });
                }
                else {
                    rollbacks.unshift(async () => {
                        await (0, promises_1.rm)(mutation.path, { force: true });
                    });
                }
                await (0, promises_1.writeFile)(mutation.path, mutation.content ?? "", "utf-8");
            }
            auditLog.push({ timestamp: nowIso(), kind: mutation.kind, path: relPath, status: "applied" });
        }
        for (const backupPath of deferredBackupCleanupPaths) {
            if (await exists(backupPath)) {
                await (0, promises_1.rm)(backupPath, { force: true });
            }
        }
        await persistAuditLog(policy, auditLog, true);
        return { status: "applied", conflicts: [], auditLog };
    }
    catch (error) {
        for (const rollback of rollbacks) {
            await rollback();
        }
        auditLog.push({
            timestamp: nowIso(),
            kind: "writeFile",
            path: "*",
            status: "rolledBack",
            detail: error instanceof Error ? error.message : "unknown error",
        });
        await persistAuditLog(policy, auditLog, true);
        throw error;
    }
}
async function persistAuditLog(policy, entries, allowFsWrites) {
    if (!policy.auditLogPath || !allowFsWrites) {
        return;
    }
    await (0, promises_1.mkdir)((0, path_1.dirname)(policy.auditLogPath), { recursive: true });
    const existing = (await exists(policy.auditLogPath)) ? await (0, promises_1.readFile)(policy.auditLogPath, "utf-8") : "";
    const newLines = entries.map((entry) => JSON.stringify(entry)).join("\n");
    await (0, promises_1.writeFile)(policy.auditLogPath, `${existing}${existing && newLines ? "\n" : ""}${newLines}`, "utf-8");
}
//# sourceMappingURL=bootstrap-safety-policy.js.map