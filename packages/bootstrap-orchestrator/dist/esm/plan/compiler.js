import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function compileBootstrapPlan(input, options = {}) {
    const compiledAt = (options.clock ?? (() => new Date()))().toISOString();
    const steps = compileSteps(input);
    const plan = {
        schemaVersion: "1",
        compiledAt,
        projectRoot: input.projectRoot,
        frameworkDecision: input.frameworkDecision,
        intentDecision: input.intentDecision,
        installPlan: input.installPlan,
        fileMutations: input.fileMutations,
        validationCheckpoints: input.validationCheckpoints,
        steps,
    };
    if (options.persist !== false) {
        try {
            const outputDir = join(input.projectRoot, ".cms");
            await mkdir(outputDir, { recursive: true });
            await writeFile(join(outputDir, "bootstrap-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
        }
        catch (error) {
            options.onPersistError?.(error);
        }
    }
    return plan;
}
function compileSteps(input) {
    const steps = [
        {
            id: "framework-detection",
            kind: "detect-framework",
            description: `Detected framework ${input.frameworkDecision.framework} (confidence: ${input.frameworkDecision.confidence}).`,
            payload: input.frameworkDecision,
        },
        {
            id: "intent-selection",
            kind: "select-intent",
            description: `Selected intent ${input.intentDecision.intent} with preset ${input.intentDecision.preset}.`,
            payload: input.intentDecision,
        },
        {
            id: "adapter-install",
            kind: "adapter-install",
            description: `Install adapter package ${input.installPlan.adapterPackage.name}@${input.installPlan.adapterPackage.version}.`,
            payload: input.installPlan.adapterPackage,
        },
    ];
    for (const packageItem of input.installPlan.additionalPackages) {
        steps.push({
            id: `package-install:${packageItem.name}`,
            kind: "package-install",
            description: `Install package ${packageItem.name}@${packageItem.version}.`,
            payload: packageItem,
        });
    }
    for (const mutation of input.fileMutations) {
        steps.push({
            id: `file:${mutation.operation}:${mutation.path}`,
            kind: mutation.operation === "create" ? "file-generate" : "file-mutate",
            description: `${mutation.operation} ${mutation.path}`,
            payload: mutation,
        });
    }
    for (const checkpoint of input.validationCheckpoints) {
        steps.push({
            id: `validate:${checkpoint.id}`,
            kind: "validate",
            description: checkpoint.description,
            payload: checkpoint,
        });
    }
    return steps;
}
//# sourceMappingURL=compiler.js.map