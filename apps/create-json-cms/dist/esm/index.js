import path from "path";
import { detectPackageManager, sanitizeProjectName } from "@upflame/cli-utils";
import { createProject } from "./create-project.js";
import { promptForOptions } from "./prompt.js";
import { addPluginToProject, parseAddPluginArgs } from "./add-plugin.js";
import { detectFrameworkFromProject } from "./framework-detection.js";
import { addIntegrationToProject } from "./add-integration.js";
function normalizePluginFlagValue(value) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((plugin) => {
        if (plugin.startsWith("@upflame/plugin-")) {
            return plugin;
        }
        if (plugin.startsWith("@upflame/")) {
            return plugin.replace("@upflame/", "@upflame/plugin-");
        }
        return `@upflame/plugin-${plugin.replace(/^plugin-/, "")}`;
    });
}
function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (!value.startsWith("--") && !options.projectName) {
            options.projectName = value;
            continue;
        }
        switch (value) {
            case "--dir":
                options.targetDir = argv[index + 1];
                index += 1;
                break;
            case "--framework":
                options.framework = argv[index + 1];
                index += 1;
                break;
            case "--preset":
                options.preset = argv[index + 1];
                index += 1;
                break;
            case "--mode":
                options.preset = argv[index + 1];
                index += 1;
                break;
            case "--plugins":
                options.plugins = normalizePluginFlagValue(argv[index + 1] ?? "");
                index += 1;
                break;
            case "--package-manager":
                options.packageManager = argv[index + 1];
                index += 1;
                break;
            case "--no-install":
                options.installDependencies = false;
                break;
            case "--skip-install":
                options.installDependencies = false;
                break;
            case "--no-example-content":
                options.includeExampleContent = false;
                break;
            case "--force":
                options.force = true;
                break;
            case "--yes":
                break;
            default:
                break;
        }
    }
    return options;
}
function hasYesFlag(argv) {
    return argv.includes("--yes");
}
function resolveCommand(argv) {
    const first = argv[0];
    if (first === "init" || first === "add" || first === "add-plugin") {
        return { command: first, rest: argv.slice(1) };
    }
    return { command: "init", rest: argv };
}
async function resolveFramework(parsed) {
    if (parsed.framework) {
        if (String(parsed.framework).toLowerCase() === "next") {
            return "nextjs";
        }
        return parsed.framework;
    }
    const detection = await detectFrameworkFromProject(process.cwd());
    if (detection.detected === "nextjs") {
        return "nextjs";
    }
    if (detection.detected && detection.supported) {
        return detection.detected;
    }
    if (detection.detected && !detection.supported && (detection.confidence ?? 0) >= 0.4) {
        const confidence = detection.confidence ? ` (${Math.round(detection.confidence * 100)}% confidence)` : "";
        console.warn(`[create-json-cms] Detected ${detection.detected}${confidence}, but this framework is not yet scaffold-ready. Falling back to --framework next.`);
    }
    return "nextjs";
}
async function resolveOptions(argv, nonInteractive, command) {
    const parsed = parseArgs(argv);
    const framework = await resolveFramework(parsed);
    if (nonInteractive) {
        return {
            projectName: sanitizeProjectName(parsed.projectName ?? (command === "add" ? path.basename(process.cwd()) : "my-json-cms")),
            targetDir: parsed.targetDir ?? (command === "add" ? process.cwd() : sanitizeProjectName(parsed.projectName ?? "my-json-cms")),
            framework,
            packageManager: parsed.packageManager ?? await detectPackageManager(process.cwd()),
            preset: parsed.preset ?? "marketing",
            plugins: parsed.plugins,
            includeExampleContent: parsed.includeExampleContent ?? true,
            installDependencies: parsed.installDependencies ?? true,
            force: parsed.force ?? false,
        };
    }
    return promptForOptions({ ...parsed, framework });
}
export async function runCreateJsonCms(argv = process.argv.slice(2)) {
    const { command, rest } = resolveCommand(argv);
    if (command === "add-plugin") {
        const { plugin, options } = parseAddPluginArgs(rest);
        if (!plugin) {
            throw new Error("Usage: npx create-json-cms add-plugin <plugin-name> [--no-install] [--config cms.config.ts]");
        }
        await addPluginToProject(plugin, options);
        return;
    }
    const options = await resolveOptions(rest, command === "add" || hasYesFlag(rest), command);
    if (command === "add") {
        await addIntegrationToProject({
            ...options,
            targetDir: options.targetDir ?? process.cwd(),
        });
        return;
    }
    const result = await createProject(options);
    console.log(`\nCreated ${options.projectName} in ${result.projectDir}`);
    console.log(`Framework: ${options.framework}`);
    console.log(`Preset: ${options.preset}`);
    console.log("\nNext steps:");
    console.log(`  cd ${options.targetDir}`);
    if (!options.installDependencies) {
        console.log(`  ${options.packageManager === "yarn" ? "yarn" : `${options.packageManager} install`}`);
    }
    console.log(`  ${options.packageManager === "npm" ? "npm run dev" : `${options.packageManager} run dev`}`);
}
//# sourceMappingURL=index.js.map