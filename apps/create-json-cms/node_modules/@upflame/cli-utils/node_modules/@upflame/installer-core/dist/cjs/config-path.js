"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_CONFIG_FILE = exports.CANONICAL_CONFIG_FILE = void 0;
exports.resolveConfigPath = resolveConfigPath;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
exports.CANONICAL_CONFIG_FILE = "cms.config.ts";
exports.LEGACY_CONFIG_FILE = "jsoncms.config.ts";
async function exists(filePath) {
    try {
        await (0, promises_1.access)(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function resolveConfigPath(cwd, provided) {
    if (provided) {
        return {
            path: path_1.default.resolve(cwd, provided),
            source: "provided",
        };
    }
    const canonicalPath = path_1.default.resolve(cwd, exports.CANONICAL_CONFIG_FILE);
    if (await exists(canonicalPath)) {
        return {
            path: canonicalPath,
            source: "canonical",
        };
    }
    const legacyPath = path_1.default.resolve(cwd, exports.LEGACY_CONFIG_FILE);
    if (await exists(legacyPath)) {
        return {
            path: legacyPath,
            source: "legacy",
        };
    }
    throw new Error(`Could not find ${exports.CANONICAL_CONFIG_FILE} or ${exports.LEGACY_CONFIG_FILE} in this directory.`);
}
//# sourceMappingURL=config-path.js.map