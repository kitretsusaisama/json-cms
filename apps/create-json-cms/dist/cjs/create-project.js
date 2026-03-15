"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const cli_utils_1 = require("@upflame/cli-utils");
const template_composition_js_1 = require("./template-composition.js");
const health_checks_js_1 = require("./health-checks.js");
function resolveTemplateDirectory(framework) {
    const cliEntryDir = process.argv[1] ? path_1.default.dirname(path_1.default.resolve(process.argv[1])) : process.cwd();
    const candidates = [
        path_1.default.resolve(process.cwd(), `apps/create-json-cms/templates/${framework}`),
        path_1.default.resolve(cliEntryDir, `../templates/${framework}`),
        path_1.default.resolve(cliEntryDir, `../../templates/${framework}`),
        path_1.default.resolve(process.cwd(), `templates/${framework}`),
    ];
    const found = candidates.find((candidate) => (0, fs_1.existsSync)(candidate));
    if (!found) {
        throw new Error(`Could not locate create-json-cms template directory for framework '${framework}'.`);
    }
    return found;
}
function titleCaseProject(projectName) {
    return projectName
        .split("-")
        .filter(Boolean)
        .map((segment) => segment[0].toUpperCase() + segment.slice(1))
        .join(" ");
}
function cmsRouteTemplate(framework) {
    if (framework === "astro") {
        return `---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>UpFlame CMS</title>
  </head>
  <body>
    <main style="padding: 2rem; font-family: system-ui, sans-serif;">
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  </body>
</html>
`;
    }
    return `export default function CmsPage(): JSX.Element {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>UpFlame CMS</h1>
      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>
    </main>
  );
}
`;
}
function schemaTemplate() {
    return `export default {
  name: "page",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", required: true },
    { name: "content", type: "richtext" }
  ]
} as const;
`;
}
function pluginsTemplate() {
    return `export const cmsPlugins = [] as const;
`;
}
function frameworkRuntimeDependencies(framework) {
    if (framework === "astro") {
        return {
            astro: "5.0.0",
        };
    }
    return {
        next: "15.5.0",
        react: "18.3.1",
        "react-dom": "18.3.1",
    };
}
function cmsRoutePath(framework) {
    if (framework === "astro") {
        return path_1.default.join("src", "pages", "cms.astro");
    }
    return path_1.default.join("app", "cms", "page.tsx");
}
async function createProject(options) {
    const packageName = (0, cli_utils_1.sanitizeProjectName)(options.projectName);
    const projectDir = path_1.default.resolve(options.targetDir);
    const templateDir = resolveTemplateDirectory(options.framework);
    if (options.force) {
        await (0, promises_1.rm)(projectDir, { recursive: true, force: true });
    }
    await (0, promises_1.mkdir)(projectDir, { recursive: true });
    const existingEntries = await (0, promises_1.readdir)(projectDir);
    if (existingEntries.length > 0) {
        throw new Error(`Target directory is not empty: ${projectDir}. Use --force to overwrite it.`);
    }
    const parentDir = path_1.default.dirname(projectDir);
    const stageDir = path_1.default.join(parentDir, `.json-cms-stage-${path_1.default.basename(projectDir)}-${Date.now()}`);
    const requiredDependencies = (0, template_composition_js_1.composeTemplateDependencies)(options.framework, options.preset, options.plugins);
    const manifest = (0, cli_utils_1.buildProjectManifest)({ packageName, preset: options.preset, framework: options.framework });
    try {
        await (0, promises_1.mkdir)(stageDir, { recursive: true });
        await (0, cli_utils_1.copyDirectory)(templateDir, stageDir);
        await (0, cli_utils_1.replaceTokensInDirectory)(stageDir, {
            PROJECT_NAME: packageName,
            PROJECT_TITLE: titleCaseProject(packageName),
            PRESET: options.preset,
        });
        const manifestDependencies = { ...(manifest.dependencies ?? {}) };
        if (options.plugins?.length) {
            for (const dependencyName of Object.keys(manifestDependencies)) {
                if (dependencyName.startsWith("@upflame/plugin-")) {
                    delete manifestDependencies[dependencyName];
                }
            }
        }
        const deterministicDependencies = {
            ...manifestDependencies,
            ...Object.fromEntries(requiredDependencies.map((dependency) => [dependency, "latest"])),
            ...frameworkRuntimeDependencies(options.framework),
        };
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, "package.json"), `${JSON.stringify({
            ...manifest,
            scripts: manifest.scripts,
            dependencies: deterministicDependencies,
            devDependencies: manifest.devDependencies,
        }, null, 2)}\n`, "utf-8");
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, "cms.config.ts"), (0, cli_utils_1.renderCmsConfig)(options.preset, options.plugins, options.framework), "utf-8");
        await (0, promises_1.mkdir)(path_1.default.join(stageDir, "cms", "schema"), { recursive: true });
        await (0, promises_1.mkdir)(path_1.default.join(stageDir, "cms", "plugins"), { recursive: true });
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, "cms", "schema", "page.ts"), schemaTemplate(), "utf-8");
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, "cms", "plugins", "index.ts"), pluginsTemplate(), "utf-8");
        const routePath = cmsRoutePath(options.framework);
        await (0, promises_1.mkdir)(path_1.default.dirname(path_1.default.join(stageDir, routePath)), { recursive: true });
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, routePath), cmsRouteTemplate(options.framework), "utf-8");
        if (!options.includeExampleContent) {
            await (0, promises_1.rm)(path_1.default.join(stageDir, "data"), { recursive: true, force: true });
        }
        await (0, promises_1.rm)(projectDir, { recursive: true, force: true });
        await (0, promises_1.rename)(stageDir, projectDir);
    }
    catch (error) {
        await (0, promises_1.rm)(stageDir, { recursive: true, force: true });
        throw error;
    }
    if (options.installDependencies) {
        (0, child_process_1.execSync)((0, cli_utils_1.getInstallCommand)(options.packageManager), {
            cwd: projectDir,
            stdio: "inherit",
        });
    }
    await (0, health_checks_js_1.runPostGenerationHealthChecks)(projectDir, options.packageManager, options.installDependencies);
    return { projectDir };
}
//# sourceMappingURL=create-project.js.map