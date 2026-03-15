"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const vitest_1 = require("vitest");
const scaffold_1 = require("../scaffold");
async function exists(path) {
    try {
        await (0, promises_1.stat)(path);
        return true;
    }
    catch {
        return false;
    }
}
(0, vitest_1.describe)("scaffoldDataDirectory", () => {
    (0, vitest_1.it)("does not write files in CI when --apply is not explicitly passed", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "scaffold-test-"));
        const created = await (0, scaffold_1.scaffoldDataDirectory)(rootDir, "data", { ci: true, applyExplicitlyRequested: false });
        (0, vitest_1.expect)(created).toEqual([]);
        (0, vitest_1.expect)(await exists((0, path_1.join)(rootDir, "data", "pages", "home.json"))).toBe(false);
    });
    (0, vitest_1.it)("writes files when apply is explicitly requested", async () => {
        const rootDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), "scaffold-test-"));
        const created = await (0, scaffold_1.scaffoldDataDirectory)(rootDir, "data", { ci: true, applyExplicitlyRequested: true });
        (0, vitest_1.expect)(created).toContain("data/pages/home.json");
        (0, vitest_1.expect)(await exists((0, path_1.join)(rootDir, "data", "pages", "home.json"))).toBe(true);
    });
});
//# sourceMappingURL=scaffold.test.js.map