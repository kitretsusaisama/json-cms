export type BootstrapInteractivityMode = "interactive" | "nonInteractive";
export type BootstrapExecutionMode = "dryRun" | "apply";
export interface BootstrapSafetyPolicyOptions {
    rootDir: string;
    interactivityMode?: BootstrapInteractivityMode;
    executionMode?: BootstrapExecutionMode;
    ci?: boolean;
    applyExplicitlyRequested?: boolean;
    protectedFiles?: string[];
    auditLogPath?: string;
}
export interface BootstrapSafetyPolicy {
    rootDir: string;
    interactivityMode: BootstrapInteractivityMode;
    executionMode: BootstrapExecutionMode;
    ci: boolean;
    applyExplicitlyRequested: boolean;
    protectedFiles: Set<string>;
    auditLogPath?: string;
    assertPromptAllowed(): void;
    assertMutationAllowed(): void;
}
export type MutationKind = "mkdir" | "writeFile";
export interface Mutation {
    kind: MutationKind;
    path: string;
    content?: string;
    overwrite?: boolean;
}
export interface MutationPlan {
    mutations: Mutation[];
}
export interface MutationConflict {
    path: string;
    reason: "exists" | "protected";
}
export interface MutationAuditEntry {
    timestamp: string;
    kind: MutationKind;
    path: string;
    status: "planned" | "applied" | "rolledBack" | "blocked";
    detail?: string;
}
export interface MutationApplyResult {
    status: "dryRun" | "applied" | "blocked";
    conflicts: MutationConflict[];
    auditLog: MutationAuditEntry[];
}
export declare function createBootstrapSafetyPolicy(options: BootstrapSafetyPolicyOptions): BootstrapSafetyPolicy;
export declare function applyMutationPlan(policy: BootstrapSafetyPolicy, plan: MutationPlan): Promise<MutationApplyResult>;
//# sourceMappingURL=bootstrap-safety-policy.d.ts.map