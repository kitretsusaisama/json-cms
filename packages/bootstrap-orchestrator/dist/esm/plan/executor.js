export async function executeCompiledPlan(plan, stepExecutor) {
    const compiledSteps = [...plan.steps];
    for (const step of compiledSteps) {
        await stepExecutor.execute(step, plan);
    }
}
//# sourceMappingURL=executor.js.map