"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const vitest_1 = require("vitest");
const config_path_1 = require("../config-path");
(0, vitest_1.describe)("resolveConfigPath", () => {
    (0, vitest_1.it)("prefers canonical config when both files exist", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "installer-config-test-"));
        await (0, promises_1.writeFile)((0, path_1.join)(cwd, config_path_1.CANONICAL_CONFIG_FILE), "export default {};\n", "utf-8");
        await (0, promises_1.writeFile)((0, path_1.join)(cwd, config_path_1.LEGACY_CONFIG_FILE), "export default {};\n", "utf-8");
        const resolved = await (0, config_path_1.resolveConfigPath)(cwd);
        (0, vitest_1.expect)(resolved.source).toBe("canonical");
        (0, vitest_1.expect)(resolved.path).toContain(config_path_1.CANONICAL_CONFIG_FILE);
    });
    (0, vitest_1.it)("falls back to legacy config", async () => {
        const cwd = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "installer-config-test-"));
        await (0, promises_1.writeFile)((0, path_1.join)(cwd, config_path_1.LEGACY_CONFIG_FILE), "export default {};\n", "utf-8");
        const resolved = await (0, config_path_1.resolveConfigPath)(cwd);
        (0, vitest_1.expect)(resolved.source).toBe("legacy");
        (0, vitest_1.expect)(resolved.path).toContain(config_path_1.LEGACY_CONFIG_FILE);
    });
});
//# sourceMappingURL=config-path.test.js.map