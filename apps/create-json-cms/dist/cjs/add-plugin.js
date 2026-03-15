"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPluginToProject = addPluginToProject;
exports.parseAddPluginArgs = parseAddPluginArgs;
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const cli_utils_1 = require("@upflame/cli-utils");
const installer_core_1 = require("@upflame/installer-core");
function normalizePluginName(input) {
    if (input.startsWith("@")) {
        return input;
    }
    if (input.includes("/")) {
        return input;
    }
    return `@upflame/${input}`;
}
function toImportIdentifier(pkgName) {
    const base = pkgName.split("/").pop() ?? pkgName;
    const cleaned = base.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    if (!cleaned) {
        return "plugin";
    }
    const parts = cleaned.split(/\s+/);
    const [first, ...rest] = parts;
    const camel = [
        first.charAt(0).toLowerCase() + first.slice(1),
        ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)),
    ].join("");
    return camel || "plugin";
}
function installCommand(pm, pkg) {
    switch (pm) {
        case "pnpm":
            return `pnpm add ${pkg}`;
        case "yarn":
            return `yarn add ${pkg}`;
        case "bun":
            return `bun add ${pkg}`;
        default:
            return `npm install ${pkg}`;
    }
}
function upsertPluginImport(source, importName, pkgName) {
    if (source.includes(`from \"${pkgName}\"`) || source.includes(`from '${pkgName}'`)) {
        return source;
    }
    const importLine = `import ${importName} from "${pkgName}";`;
    const importBlockMatch = source.match(/^(?:import .*;\r?\n)+/);
    if (importBlockMatch?.index === 0) {
        const block = importBlockMatch[0];
        return source.replace(block, `${block.trimEnd()}\r\n${importLine}\r\n\r\n`);
    }
    return `${importLine}\r\n\r\n${source}`;
}
function upsertPluginArray(source, importName) {
    const pluginArrayRegex = /plugins\s*:\s*\[([\s\S]*?)\]/m;
    const match = source.match(pluginArrayRegex);
    if (!match) {
        throw new Error("Could not find plugins array in config file.");
    }
    const items = match[1].trim();
    if (items.includes(importName)) {
        return source;
    }
    const nextItems = items.length === 0 ? importName : `${items.replace(/\s*$/, "")}, ${importName}`;
    return source.replace(pluginArrayRegex, `plugins: [${nextItems}]`);
}
async function addPluginToProject(pluginInput, options = {}) {
    const cwd = process.cwd();
    const packageManager = options.packageManager ?? await (0, cli_utils_1.detectPackageManager)(cwd);
    const pluginName = normalizePluginName(pluginInput);
    const resolvedConfig = await (0, installer_core_1.resolveConfigPath)(cwd, options.configPath);
    const configPath = resolvedConfig.path;
    const importName = toImportIdentifier(pluginName);
    if (resolvedConfig.source === "legacy") {
        console.warn(`Warning: ${installer_core_1.LEGACY_CONFIG_FILE} is deprecated. Please migrate to cms.config.ts.`);
    }
    if (options.installDependencies ?? true) {
        (0, child_process_1.execSync)(installCommand(packageManager, pluginName), { stdio: "inherit", cwd });
    }
    const configSource = await (0, promises_1.readFile)(configPath, "utf-8");
    let updated = upsertPluginImport(configSource, importName, pluginName);
    updated = upsertPluginArray(updated, importName);
    await (0, promises_1.writeFile)(configPath, updated, "utf-8");
    console.log(`\nAdded ${pluginName} to ${path_1.default.basename(configPath)}.`);
}
function parseAddPluginArgs(argv) {
    const options = {};
    let plugin;
    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (!value.startsWith("--") && !plugin) {
            plugin = value;
            continue;
        }
        switch (value) {
            case "--package-manager":
                options.packageManager = argv[index + 1];
                index += 1;
                break;
            case "--config":
                options.configPath = argv[index + 1];
                index += 1;
                break;
            case "--no-install":
                options.installDependencies = false;
                break;
            default:
                break;
        }
    }
    return { plugin, options };
}
//# sourceMappingURL=add-plugin.js.map