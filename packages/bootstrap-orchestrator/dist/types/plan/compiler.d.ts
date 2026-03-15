import type { BootstrapCompilationInput, BootstrapPlan } from "./types";
export interface CompileBootstrapPlanOptions {
    readonly clock?: () => Date;
    readonly persist?: boolean;
    readonly onPersistError?: (error: unknown) => void;
}
export declare function compileBootstrapPlan(input: BootstrapCompilationInput, options?: CompileBootstrapPlanOptions): Promise<BootstrapPlan>;
//# sourceMappingURL=compiler.d.ts.map