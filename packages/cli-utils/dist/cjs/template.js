"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyDirectory = copyDirectory;
exports.replaceTokensInDirectory = replaceTokensInDirectory;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const textExtensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".txt",
]);
async function copyDirectory(sourceDir, targetDir) {
    await (0, promises_1.mkdir)(targetDir, { recursive: true });
    const entries = await (0, promises_1.readdir)(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path_1.default.join(sourceDir, entry.name);
        const targetPath = path_1.default.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, targetPath);
            continue;
        }
        await (0, promises_1.copyFile)(sourcePath, targetPath);
    }
}
async function replaceTokensInDirectory(rootDir, tokens) {
    const entries = await (0, promises_1.readdir)(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path_1.default.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            await replaceTokensInDirectory(entryPath, tokens);
            continue;
        }
        if (!textExtensions.has(path_1.default.extname(entry.name))) {
            continue;
        }
        const fileStats = await (0, promises_1.stat)(entryPath);
        if (fileStats.size > 256 * 1024) {
            continue;
        }
        let content = await (0, promises_1.readFile)(entryPath, "utf-8");
        for (const [token, value] of Object.entries(tokens)) {
            content = content.replaceAll(`__${token}__`, value);
        }
        await (0, promises_1.writeFile)(entryPath, content, "utf-8");
    }
}
//# sourceMappingURL=template.js.map