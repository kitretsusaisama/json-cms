"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdapterV1ConformanceTests = defineAdapterV1ConformanceTests;
const vitest_1 = require("vitest");
function defineAdapterV1ConformanceTests(target) {
    (0, vitest_1.describe)(`AdapterV1 conformance: ${target.adapterName}`, () => {
        (0, vitest_1.it)("implements required AdapterV1 methods", () => {
            const adapter = target.createAdapter();
            (0, vitest_1.expect)(typeof adapter.setup).toBe("function");
            (0, vitest_1.expect)(typeof adapter.registerRoutes).toBe("function");
            (0, vitest_1.expect)(typeof adapter.registerCMS).toBe("function");
            (0, vitest_1.expect)(typeof adapter.injectComponents).toBe("function");
        });
        (0, vitest_1.it)("runs all required methods without throwing", async () => {
            const adapter = target.createAdapter();
            await Promise.resolve(adapter.setup(target.setupContext));
            await Promise.resolve(adapter.registerRoutes(target.routeContext));
            await Promise.resolve(adapter.registerCMS(target.cmsContext));
            await Promise.resolve(adapter.injectComponents(target.componentContext));
            if (target.assertMethodInvocations) {
                await target.assertMethodInvocations({
                    adapter,
                    setupContext: target.setupContext,
                    routeContext: target.routeContext,
                    cmsContext: target.cmsContext,
                    componentContext: target.componentContext,
                });
            }
        });
        (0, vitest_1.it)("returns diagnostics that include adapter metadata when provided", () => {
            const adapter = target.createAdapter();
            if (!adapter.getDiagnostics) {
                (0, vitest_1.expect)(adapter.getDiagnostics).toBeUndefined();
                return;
            }
            const diagnostics = adapter.getDiagnostics();
            (0, vitest_1.expect)(diagnostics.adapterName).toBeTruthy();
            (0, vitest_1.expect)(typeof diagnostics.productionReady).toBe("boolean");
        });
    });
}
