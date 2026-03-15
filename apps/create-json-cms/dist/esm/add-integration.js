import { execSync } from "child_process";
import { access, readFile, rm, writeFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { constants } from "fs";
import { buildProjectManifest, getInstallCommand, getPresetDefinition, renderCmsConfig, sanitizeProjectName, } from "@upflame/cli-utils";
import { CANONICAL_CONFIG_FILE, LEGACY_CONFIG_FILE } from "@upflame/installer-core";
import { runPostGenerationHealthChecks } from "./health-checks.js";
import { composeTemplateDependencies } from "./template-composition.js";
async function fileExists(filePath) {
    try {
        await access(filePath, constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
function resolveTemplateDirectoryForFramework(framework) {
    const cliEntryDir = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd();
    const candidates = [
        path.resolve(process.cwd(), `apps/create-json-cms/templates/${framework}`),
        path.resolve(cliEntryDir, `../templates/${framework}`),
        path.resolve(cliEntryDir, `../../templates/${framework}`),
        path.resolve(process.cwd(), `templates/${framework}`),
    ];
    const found = candidates.find((candidate) => existsSync(candidate));
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
        return path.join("src", "pages", "cms.astro");
    }
    return path.join("app", "cms", "page.tsx");
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
export async function addIntegrationToProject(options) {
    const projectDir = path.resolve(options.targetDir);
    const packageJsonPath = path.join(projectDir, "package.json");
    if (!await fileExists(packageJsonPath)) {
        throw new Error(`Could not find package.json in ${projectDir}.`);
    }
    const cmsConfigPath = path.join(projectDir, CANONICAL_CONFIG_FILE);
    const legacyConfigPath = path.join(projectDir, LEGACY_CONFIG_FILE);
    const hasCanonicalConfig = await fileExists(cmsConfigPath);
    const hasLegacyConfig = await fileExists(legacyConfigPath);
    if (hasCanonicalConfig) {
        throw new Error(`Refusing to overwrite existing ${CANONICAL_CONFIG_FILE} in ${projectDir}.`);
    }
    if (hasLegacyConfig) {
        console.warn(`Warning: Found ${LEGACY_CONFIG_FILE}. It remains supported, but please migrate to ${CANONICAL_CONFIG_FILE}.`);
    }
    const requiredDependencies = composeTemplateDependencies(options.framework, options.preset, options.plugins);
    const currentPackageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    const manifest = buildProjectManifest({
        packageName: sanitizeProjectName(currentPackageJson.name ?? options.projectName),
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
    const stageDir = path.join(projectDir, ".json-cms-stage");
    await rm(stageDir, { recursive: true, force: true });
    await mkdir(stageDir, { recursive: true });
    try {
        await writeFile(path.join(stageDir, "package.json"), `${JSON.stringify(nextPackageJson, null, 2)}\n`, "utf-8");
        await writeFile(path.join(stageDir, CANONICAL_CONFIG_FILE), renderCmsConfig(options.preset, options.plugins, options.framework), "utf-8");
        if (options.includeExampleContent) {
            const templateHome = path.join(resolveTemplateDirectoryForFramework(options.framework), "data", "pages", "home.json");
            const targetHome = path.join(projectDir, "data", "pages", "home.json");
            if (!await fileExists(targetHome)) {
                await mkdir(path.dirname(targetHome), { recursive: true });
                await copyFile(templateHome, targetHome);
            }
        }
        await copyFile(path.join(stageDir, "package.json"), packageJsonPath);
        if (!hasLegacyConfig) {
            await copyFile(path.join(stageDir, CANONICAL_CONFIG_FILE), cmsConfigPath);
        }
        const cmsSchemaPath = path.join(projectDir, "cms", "schema", "page.ts");
        const cmsPluginsPath = path.join(projectDir, "cms", "plugins", "index.ts");
        const cmsRoutePath = path.join(projectDir, frameworkRoutePath(options.framework));
        if (!await fileExists(cmsSchemaPath)) {
            await mkdir(path.dirname(cmsSchemaPath), { recursive: true });
            await writeFile(cmsSchemaPath, `export default {\n  name: "page",\n  fields: [\n    { name: "title", type: "string", required: true },\n    { name: "slug", type: "string", required: true },\n    { name: "content", type: "richtext" }\n  ]\n} as const;\n`, "utf-8");
        }
        if (!await fileExists(cmsPluginsPath)) {
            await mkdir(path.dirname(cmsPluginsPath), { recursive: true });
            await writeFile(cmsPluginsPath, "export const cmsPlugins = [] as const;\n", "utf-8");
        }
        if (!await fileExists(cmsRoutePath)) {
            await mkdir(path.dirname(cmsRoutePath), { recursive: true });
            await writeFile(cmsRoutePath, frameworkRouteTemplate(options.framework), "utf-8");
        }
    }
    finally {
        await rm(stageDir, { recursive: true, force: true });
    }
    if (options.installDependencies) {
        execSync(getInstallCommand(options.packageManager), { cwd: projectDir, stdio: "inherit" });
    }
    await runPostGenerationHealthChecks(projectDir, options.packageManager, options.installDependencies);
    console.log(`\nAdded JSON CMS integration with preset '${options.preset}'.`);
    console.log(`Plugins: ${getPresetDefinition(options.preset).plugins.join(", ")}`);
    return { projectDir };
}
//# sourceMappingURL=add-integration.js.map