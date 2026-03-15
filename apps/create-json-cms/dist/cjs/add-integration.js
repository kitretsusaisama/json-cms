"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIntegrationToProject = addIntegrationToProject;
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const fs_2 = require("fs");
const cli_utils_1 = require("@upflame/cli-utils");
const installer_core_1 = require("@upflame/installer-core");
const health_checks_js_1 = require("./health-checks.js");
const template_composition_js_1 = require("./template-composition.js");
async function fileExists(filePath) {
    try {
        await (0, promises_1.access)(filePath, fs_2.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
function resolveTemplateDirectoryForFramework(framework) {
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
function mergeDependencies(current, ordered) {
    const result = { ...(current ?? {}) };
    for (const dependency of ordered) {
        if (!result[dependency]) {
            result[dependency] = "latest";
        }
    }
    return result;
}
function frameworkRoutePath(framework) {
    if (framework === "astro") {
        return path_1.default.join("src", "pages", "cms.astro");
    }
    return path_1.default.join("app", "cms", "page.tsx");
}
function frameworkRouteTemplate(framework) {
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
    return `export default function CmsPage(): JSX.Element {\n  return (\n    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>\n      <h1>UpFlame CMS</h1>\n      <p>CMS bootstrap is active. Configure content in <code>cms/</code> and <code>cms.config.ts</code>.</p>\n    </main>\n  );\n}\n`;
}
async function addIntegrationToProject(options) {
    const projectDir = path_1.default.resolve(options.targetDir);
    const packageJsonPath = path_1.default.join(projectDir, "package.json");
    if (!await fileExists(packageJsonPath)) {
        throw new Error(`Could not find package.json in ${projectDir}.`);
    }
    const cmsConfigPath = path_1.default.join(projectDir, installer_core_1.CANONICAL_CONFIG_FILE);
    const legacyConfigPath = path_1.default.join(projectDir, installer_core_1.LEGACY_CONFIG_FILE);
    const hasCanonicalConfig = await fileExists(cmsConfigPath);
    const hasLegacyConfig = await fileExists(legacyConfigPath);
    if (hasCanonicalConfig) {
        throw new Error(`Refusing to overwrite existing ${installer_core_1.CANONICAL_CONFIG_FILE} in ${projectDir}.`);
    }
    if (hasLegacyConfig) {
        console.warn(`Warning: Found ${installer_core_1.LEGACY_CONFIG_FILE}. It remains supported, but please migrate to ${installer_core_1.CANONICAL_CONFIG_FILE}.`);
    }
    const requiredDependencies = (0, template_composition_js_1.composeTemplateDependencies)(options.framework, options.preset, options.plugins);
    const currentPackageJson = JSON.parse(await (0, promises_1.readFile)(packageJsonPath, "utf-8"));
    const manifest = (0, cli_utils_1.buildProjectManifest)({
        packageName: (0, cli_utils_1.sanitizeProjectName)(currentPackageJson.name ?? options.projectName),
        preset: options.preset,
        framework: options.framework,
    });
    const nextPackageJson = {
        ...currentPackageJson,
        scripts: {
            ...(currentPackageJson.scripts ?? {}),
            ...manifest.scripts,
        },
        dependencies: mergeDependencies(currentPackageJson.dependencies, requiredDependencies),
        devDependencies: {
            ...(currentPackageJson.devDependencies ?? {}),
            ...Object.fromEntries(Object.entries(manifest.devDependencies).filter(([name]) => !(currentPackageJson.devDependencies ?? {})[name])),
        },
    };
    const stageDir = path_1.default.join(projectDir, ".json-cms-stage");
    await (0, promises_1.rm)(stageDir, { recursive: true, force: true });
    await (0, promises_1.mkdir)(stageDir, { recursive: true });
    try {
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, "package.json"), `${JSON.stringify(nextPackageJson, null, 2)}\n`, "utf-8");
        await (0, promises_1.writeFile)(path_1.default.join(stageDir, installer_core_1.CANONICAL_CONFIG_FILE), (0, cli_utils_1.renderCmsConfig)(options.preset, options.plugins, options.framework), "utf-8");
        if (options.includeExampleContent) {
            const templateHome = path_1.default.join(resolveTemplateDirectoryForFramework(options.framework), "data", "pages", "home.json");
            const targetHome = path_1.default.join(projectDir, "data", "pages", "home.json");
            if (!await fileExists(targetHome)) {
                await (0, promises_1.mkdir)(path_1.default.dirname(targetHome), { recursive: true });
                await (0, promises_1.copyFile)(templateHome, targetHome);
            }
        }
        await (0, promises_1.copyFile)(path_1.default.join(stageDir, "package.json"), packageJsonPath);
        if (!hasLegacyConfig) {
            await (0, promises_1.copyFile)(path_1.default.join(stageDir, installer_core_1.CANONICAL_CONFIG_FILE), cmsConfigPath);
        }
        const cmsSchemaPath = path_1.default.join(projectDir, "cms", "schema", "page.ts");
        const cmsPluginsPath = path_1.default.join(projectDir, "cms", "plugins", "index.ts");
        const cmsRoutePath = path_1.default.join(projectDir, frameworkRoutePath(options.framework));
        if (!await fileExists(cmsSchemaPath)) {
            await (0, promises_1.mkdir)(path_1.default.dirname(cmsSchemaPath), { recursive: true });
            await (0, promises_1.writeFile)(cmsSchemaPath, `export default {\n  name: "page",\n  fields: [\n    { name: "title", type: "string", required: true },\n    { name: "slug", type: "string", required: true },\n    { name: "content", type: "richtext" }\n  ]\n} as const;\n`, "utf-8");
        }
        if (!await fileExists(cmsPluginsPath)) {
            await (0, promises_1.mkdir)(path_1.default.dirname(cmsPluginsPath), { recursive: true });
            await (0, promises_1.writeFile)(cmsPluginsPath, "export const cmsPlugins = [] as const;\n", "utf-8");
        }
        if (!await fileExists(cmsRoutePath)) {
            await (0, promises_1.mkdir)(path_1.default.dirname(cmsRoutePath), { recursive: true });
            await (0, promises_1.writeFile)(cmsRoutePath, frameworkRouteTemplate(options.framework), "utf-8");
        }
    }
    finally {
        await (0, promises_1.rm)(stageDir, { recursive: true, force: true });
    }
    if (options.installDependencies) {
        (0, child_process_1.execSync)((0, cli_utils_1.getInstallCommand)(options.packageManager), { cwd: projectDir, stdio: "inherit" });
    }
    await (0, health_checks_js_1.runPostGenerationHealthChecks)(projectDir, options.packageManager, options.installDependencies);
    console.log(`\nAdded JSON CMS integration with preset '${options.preset}'.`);
    console.log(`Plugins: ${(0, cli_utils_1.getPresetDefinition)(options.preset).plugins.join(", ")}`);
    return { projectDir };
}
//# sourceMappingURL=add-integration.js.map