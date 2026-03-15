import { mkdir, readdir, rm, writeFile, rename } from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { buildProjectManifest, copyDirectory, getInstallCommand, renderCmsConfig, replaceTokensInDirectory, sanitizeProjectName, } from "@upflame/cli-utils";
import { composeTemplateDependencies } from "./template-composition.js";
import { runPostGenerationHealthChecks } from "./health-checks.js";
function resolveTemplateDirectory(framework) {
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
        return path.join("src", "pages", "cms.astro");
    }
    return path.join("app", "cms", "page.tsx");
}
export async function createProject(options) {
    const packageName = sanitizeProjectName(options.projectName);
    const projectDir = path.resolve(options.targetDir);
    const templateDir = resolveTemplateDirectory(options.framework);
    if (options.force) {
        await rm(projectDir, { recursive: true, force: true });
    }
    await mkdir(projectDir, { recursive: true });
    const existingEntries = await readdir(projectDir);
    if (existingEntries.length > 0) {
        throw new Error(`Target directory is not empty: ${projectDir}. Use --force to overwrite it.`);
    }
    const parentDir = path.dirname(projectDir);
    const stageDir = path.join(parentDir, `.json-cms-stage-${path.basename(projectDir)}-${Date.now()}`);
    const requiredDependencies = composeTemplateDependencies(options.framework, options.preset, options.plugins);
    const manifest = buildProjectManifest({ packageName, preset: options.preset, framework: options.framework });
    try {
        await mkdir(stageDir, { recursive: true });
        await copyDirectory(templateDir, stageDir);
        await replaceTokensInDirectory(stageDir, {
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
        await writeFile(path.join(stageDir, "package.json"), `${JSON.stringify({
            ...manifest,
            scripts: manifest.scripts,
            dependencies: deterministicDependencies,
            devDependencies: manifest.devDependencies,
        }, null, 2)}\n`, "utf-8");
        await writeFile(path.join(stageDir, "cms.config.ts"), renderCmsConfig(options.preset, options.plugins, options.framework), "utf-8");
        await mkdir(path.join(stageDir, "cms", "schema"), { recursive: true });
        await mkdir(path.join(stageDir, "cms", "plugins"), { recursive: true });
        await writeFile(path.join(stageDir, "cms", "schema", "page.ts"), schemaTemplate(), "utf-8");
        await writeFile(path.join(stageDir, "cms", "plugins", "index.ts"), pluginsTemplate(), "utf-8");
        const routePath = cmsRoutePath(options.framework);
        await mkdir(path.dirname(path.join(stageDir, routePath)), { recursive: true });
        await writeFile(path.join(stageDir, routePath), cmsRouteTemplate(options.framework), "utf-8");
        if (!options.includeExampleContent) {
            await rm(path.join(stageDir, "data"), { recursive: true, force: true });
        }
        await rm(projectDir, { recursive: true, force: true });
        await rename(stageDir, projectDir);
    }
    catch (error) {
        await rm(stageDir, { recursive: true, force: true });
        throw error;
    }
    if (options.installDependencies) {
        execSync(getInstallCommand(options.packageManager), {
            cwd: projectDir,
            stdio: "inherit",
        });
    }
    await runPostGenerationHealthChecks(projectDir, options.packageManager, options.installDependencies);
    return { projectDir };
}
//# sourceMappingURL=create-project.js.map