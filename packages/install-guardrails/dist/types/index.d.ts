export type DiagnosticLevel = "error" | "warning" | "info";
export interface Diagnostic {
    level: DiagnosticLevel;
    code: string;
    message: string;
    remediation?: string[];
}
export interface GuardrailOptions {
    cwd?: string;
    strict?: boolean;
    postinstall?: boolean;
    framework?: string;
    adapter?: string;
}
export interface GuardrailReport {
    framework: string;
    diagnostics: Diagnostic[];
    errorCount: number;
    warningCount: number;
    shouldFail: boolean;
}
export declare function runInstallGuardrails(options?: GuardrailOptions): GuardrailReport;
//# sourceMappingURL=index.d.ts.map