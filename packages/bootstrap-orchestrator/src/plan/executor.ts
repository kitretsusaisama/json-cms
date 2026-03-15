import type { BootstrapPlan, BootstrapStep } from "./types";

export interface PlanStepExecutor {
  execute(step: BootstrapStep, plan: BootstrapPlan): Promise<void>;
}

export async function executeCompiledPlan(plan: BootstrapPlan, stepExecutor: PlanStepExecutor): Promise<void> {
  const compiledSteps = [...plan.steps];

  for (const step of compiledSteps) {
    await stepExecutor.execute(step, plan);
  }
}
