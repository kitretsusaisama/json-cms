import type { BootstrapPlan, BootstrapStep } from "./types";
export interface PlanStepExecutor {
    execute(step: BootstrapStep, plan: BootstrapPlan): Promise<void>;
}
export declare function executeCompiledPlan(plan: BootstrapPlan, stepExecutor: PlanStepExecutor): Promise<void>;
//# sourceMappingURL=executor.d.ts.map