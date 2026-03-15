"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPackageManager = detectPackageManager;
exports.getInstallCommand = getInstallCommand;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
async function exists(filePath) {
    try {
        await (0, promises_1.access)(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function detectPackageManager(cwd) {
    if (await exists(path_1.default.join(cwd, "pnpm-lock.yaml"))) {
        return "pnpm";
    }
    if (await exists(path_1.default.join(cwd, "yarn.lock"))) {
        return "yarn";
    }
    if (await exists(path_1.default.join(cwd, "bun.lockb")) || await exists(path_1.default.join(cwd, "bun.lock"))) {
        return "bun";
    }
    return "npm";
}
function getInstallCommand(pm) {
    switch (pm) {
        case "pnpm":
            return "pnpm install";
        case "yarn":
            return "yarn install";
        case "bun":
            return "bun install";
        default:
            return "npm install";
    }
}
//# sourceMappingURL=package-manager.js.map