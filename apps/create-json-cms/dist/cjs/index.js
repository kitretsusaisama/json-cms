"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreateJsonCms = runCreateJsonCms;
const path_1 = __importDefault(require("path"));
const cli_utils_1 = require("@upflame/cli-utils");
const create_project_js_1 = require("./create-project.js");
const prompt_js_1 = require("./prompt.js");
const add_plugin_js_1 = require("./add-plugin.js");
const framework_detection_js_1 = require("./framework-detection.js");
const add_integration_js_1 = require("./add-integration.js");
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
    const detection = await (0, framework_detection_js_1.detectFrameworkFromProject)(process.cwd());
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
            projectName: (0, cli_utils_1.sanitizeProjectName)(parsed.projectName ?? (command === "add" ? path_1.default.basename(process.cwd()) : "my-json-cms")),
            targetDir: parsed.targetDir ?? (command === "add" ? process.cwd() : (0, cli_utils_1.sanitizeProjectName)(parsed.projectName ?? "my-json-cms")),
            framework,
            packageManager: parsed.packageManager ?? await (0, cli_utils_1.detectPackageManager)(process.cwd()),
            preset: parsed.preset ?? "marketing",
            plugins: parsed.plugins,
            includeExampleContent: parsed.includeExampleContent ?? true,
            installDependencies: parsed.installDependencies ?? true,
            force: parsed.force ?? false,
        };
    }
    return (0, prompt_js_1.promptForOptions)({ ...parsed, framework });
}
async function runCreateJsonCms(argv = process.argv.slice(2)) {
    const { command, rest } = resolveCommand(argv);
    if (command === "add-plugin") {
        const { plugin, options } = (0, add_plugin_js_1.parseAddPluginArgs)(rest);
        if (!plugin) {
            throw new Error("Usage: npx create-json-cms add-plugin <plugin-name> [--no-install] [--config cms.config.ts]");
        }
        await (0, add_plugin_js_1.addPluginToProject)(plugin, options);
        return;
    }
    const options = await resolveOptions(rest, command === "add" || hasYesFlag(rest), command);
    if (command === "add") {
        await (0, add_integration_js_1.addIntegrationToProject)({
            ...options,
            targetDir: options.targetDir ?? process.cwd(),
        });
        return;
    }
    const result = await (0, create_project_js_1.createProject)(options);
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