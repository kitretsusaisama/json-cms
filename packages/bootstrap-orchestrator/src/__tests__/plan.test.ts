import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileBootstrapPlan } from "../plan/compiler";
import { executeCompiledPlan } from "../plan/executor";

describe("bootstrap plan compiler", () => {
  it("compiles decisions and persists the plan to .cms/bootstrap-plan.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "bootstrap-plan-"));

    const plan = await compileBootstrapPlan(
      {
        projectRoot: root,
        frameworkDecision: { framework: "nextjs", confidence: 0.97, evidence: ["package.json has next"] },
        intentDecision: { intent: "marketing-site", preset: "marketing" },
        installPlan: {
          adapterPackage: { name: "@upflame/adapter-nextjs", version: "1.0.0", reason: "adapter" },
          additionalPackages: [{ name: "@upflame/plugin-seo", version: "latest", reason: "preset" }],
        },
        fileMutations: [{ path: "cms.config.ts", operation: "create" }],
        validationCheckpoints: [
          { id: "typecheck", description: "Run typecheck", command: "npm run typecheck", expectedOutcome: "exit 0" },
        ],
      },
      { clock: () => new Date("2026-01-01T00:00:00.000Z") }
    );

    const persisted = JSON.parse(await readFile(join(root, ".cms", "bootstrap-plan.json"), "utf8"));

    expect(persisted).toEqual(plan);
    expect(plan.steps.some((step) => step.kind === "detect-framework")).toBe(true);
    expect(plan.steps.some((step) => step.kind === "validate")).toBe(true);
  });

  it("returns the compiled plan when persistence fails", async () => {
    const persistErrors: unknown[] = [];

    const plan = await compileBootstrapPlan(
      {
        projectRoot: "\0",
        frameworkDecision: { framework: "nextjs", confidence: 0.5 },
        intentDecision: { intent: "marketing-site", preset: "marketing" },
        installPlan: {
          adapterPackage: { name: "@upflame/adapter-nextjs", version: "1.0.0", reason: "adapter" },
          additionalPackages: [],
        },
        fileMutations: [],
        validationCheckpoints: [],
      },
      {
        onPersistError(error) {
          persistErrors.push(error);
        },
      }
    );

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(persistErrors.length).toBe(1);
  });
});

describe("compiled plan executor", () => {
  it("executes only precompiled steps", async () => {
    const executedSteps: string[] = [];

    const plan = await compileBootstrapPlan(
      {
        projectRoot: "/repo",
        frameworkDecision: { framework: "astro", confidence: 0.88 },
        intentDecision: { intent: "docs-site", preset: "headless" },
        installPlan: {
          adapterPackage: { name: "@upflame/adapter-astro", version: "1.0.0", reason: "adapter" },
          additionalPackages: [],
        },
        fileMutations: [],
        validationCheckpoints: [],
      },
      { persist: false }
    );

    await executeCompiledPlan(plan, {
      async execute(step) {
        executedSteps.push(step.id);
      },
    });

    expect(executedSteps).toEqual(plan.steps.map((step) => step.id));
  });

  it("uses a snapshot of steps for deterministic execution", async () => {
    const executedSteps: string[] = [];
    const plan = await compileBootstrapPlan(
      {
        projectRoot: "/repo",
        frameworkDecision: { framework: "nextjs", confidence: 0.9 },
        intentDecision: { intent: "marketing-site", preset: "marketing" },
        installPlan: {
          adapterPackage: { name: "@upflame/adapter-nextjs", version: "1.0.0", reason: "adapter" },
          additionalPackages: [],
        },
        fileMutations: [],
        validationCheckpoints: [],
      },
      { persist: false }
    );

    await executeCompiledPlan(plan, {
      async execute(step) {
        executedSteps.push(step.id);
        (plan.steps as { pop: () => unknown }).pop();
      },
    });

    expect(executedSteps).toEqual(["framework-detection", "intent-selection", "adapter-install"]);
  });
});
