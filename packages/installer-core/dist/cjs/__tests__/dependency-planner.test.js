"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const framework_registry_1 = require("../framework-registry");
const dependency_planner_1 = require("../dependency-planner");
(0, vitest_1.describe)("planIntegrationDependencies", () => {
    (0, vitest_1.it)("includes adapter and deduped plugins", () => {
        const registry = (0, framework_registry_1.createFrameworkRegistry)([
            { id: "nextjs", packageName: "@upflame/adapter-nextjs", detectDependencies: ["next"] },
        ]);
        const dependencies = (0, dependency_planner_1.planIntegrationDependencies)("nextjs", "marketing", registry, () => ({
            id: "marketing",
            label: "Marketing",
            description: "",
            plugins: ["@upflame/plugin-pages", "@upflame/plugin-pages"],
        }));
        (0, vitest_1.expect)(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapter-nextjs", "@upflame/plugin-pages"]);
    });
    (0, vitest_1.it)("uses explicit plugins when provided", () => {
        const registry = (0, framework_registry_1.createFrameworkRegistry)([
            { id: "nextjs", packageName: "@upflame/adapter-nextjs", detectDependencies: ["next"] },
        ]);
        const dependencies = (0, dependency_planner_1.planIntegrationDependencies)("nextjs", "marketing", registry, () => ({
            id: "marketing",
            label: "Marketing",
            description: "",
            plugins: ["@upflame/plugin-pages"],
        }), ["@upflame/plugin-seo"]);
        (0, vitest_1.expect)(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapter-nextjs", "@upflame/plugin-seo"]);
    });
    (0, vitest_1.it)("supports astro adapter dependency planning", () => {
        const registry = (0, framework_registry_1.createFrameworkRegistry)([
            { id: "astro", packageName: "@upflame/adapters", detectDependencies: ["astro"] },
        ]);
        const dependencies = (0, dependency_planner_1.planIntegrationDependencies)("astro", "marketing", registry, () => ({
            id: "marketing",
            label: "Marketing",
            description: "",
            plugins: ["@upflame/plugin-pages", "@upflame/plugin-seo"],
        }));
        (0, vitest_1.expect)(dependencies).toEqual([
            "@upflame/json-cms",
            "@upflame/adapters",
            "@upflame/plugin-pages",
            "@upflame/plugin-seo",
        ]);
    });
    (0, vitest_1.it)("supports remix adapter dependency planning", () => {
        const registry = (0, framework_registry_1.createFrameworkRegistry)([
            { id: "remix", packageName: "@upflame/adapters", detectDependencies: ["@remix-run/react"] },
        ]);
        const dependencies = (0, dependency_planner_1.planIntegrationDependencies)("remix", "headless", registry, () => ({
            id: "headless",
            label: "Headless",
            description: "",
            plugins: ["@upflame/plugin-pages"],
        }));
        (0, vitest_1.expect)(dependencies).toEqual(["@upflame/json-cms", "@upflame/adapters", "@upflame/plugin-pages"]);
    });
});
//# sourceMappingURL=dependency-planner.test.js.map