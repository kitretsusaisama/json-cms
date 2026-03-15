import { describe, expect, it } from "vitest";
import { createFrameworkRegistry } from "../framework-registry";
import { planIntegrationDependencies } from "../dependency-planner";

describe("planIntegrationDependencies", () => {
  it("includes adapter and deduped plugins", () => {
    const registry = createFrameworkRegistry([
      { id: "nextjs", packageName: "@upflame/adapter-nextjs", detectDependencies: ["next"] },
    ]);

    const dependencies = planIntegrationDependencies("nextjs", "marketing", registry, () => ({
      id: "marketing",
      label: "Marketing",
      description: "",
      plugins: ["@upflame/plugin-pages", "@upflame/plugin-pages"],
    }));

    expect(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapter-nextjs", "@upflame/plugin-pages"]);
  });

  it("uses explicit plugins when provided", () => {
    const registry = createFrameworkRegistry([
      { id: "nextjs", packageName: "@upflame/adapter-nextjs", detectDependencies: ["next"] },
    ]);

    const dependencies = planIntegrationDependencies(
      "nextjs",
      "marketing",
      registry,
      () => ({
        id: "marketing",
        label: "Marketing",
        description: "",
        plugins: ["@upflame/plugin-pages"],
      }),
      ["@upflame/plugin-seo"]
    );

    expect(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapter-nextjs", "@upflame/plugin-seo"]);
  });

  it("supports astro adapter dependency planning", () => {
    const registry = createFrameworkRegistry([
      { id: "astro", packageName: "@upflame/adapters", detectDependencies: ["astro"] },
    ]);

    const dependencies = planIntegrationDependencies("astro", "marketing", registry, () => ({
      id: "marketing",
      label: "Marketing",
      description: "",
      plugins: ["@upflame/plugin-pages", "@upflame/plugin-seo"],
    }));

    expect(dependencies).toEqual([
      "@upflame/json-cms",
      "@upflame/adapters",
      "@upflame/plugin-pages",
      "@upflame/plugin-seo",
    ]);
  });

  it("supports remix adapter dependency planning", () => {
    const registry = createFrameworkRegistry([
      { id: "remix", packageName: "@upflame/adapters", detectDependencies: ["@remix-run/react"] },
    ]);

    const dependencies = planIntegrationDependencies("remix", "headless", registry, () => ({
      id: "headless",
      label: "Headless",
      description: "",
      plugins: ["@upflame/plugin-pages"],
    }));

    expect(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapters", "@upflame/plugin-pages"]);
  });
});
