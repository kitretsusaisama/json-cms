import { access } from "fs/promises";
import path from "path";
export const CANONICAL_CONFIG_FILE = "cms.config.ts";
export const LEGACY_CONFIG_FILE = "jsoncms.config.ts";
async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export async function resolveConfigPath(cwd, provided) {
    if (provided) {
        return {
            path: path.resolve(cwd, provided),
            source: "provided",
        };
    }
    const canonicalPath = path.resolve(cwd, CANONICAL_CONFIG_FILE);
    if (await exists(canonicalPath)) {
        return {
            path: canonicalPath,
            source: "canonical",
        };
    }
    const legacyPath = path.resolve(cwd, LEGACY_CONFIG_FILE);
    if (await exists(legacyPath)) {
        return {
            path: legacyPath,
            source: "legacy",
        };
    }
    throw new Error(`Could not find ${CANONICAL_CONFIG_FILE} or ${LEGACY_CONFIG_FILE} in this directory.`);
}
//# sourceMappingURL=config-path.js.map