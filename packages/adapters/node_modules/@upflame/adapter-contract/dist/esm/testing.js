import { describe, expect, it } from "vitest";
export function defineAdapterV1ConformanceTests(target) {
    describe(`AdapterV1 conformance: ${target.adapterName}`, () => {
        it("implements required AdapterV1 methods", () => {
            const adapter = target.createAdapter();
            expect(typeof adapter.setup).toBe("function");
            expect(typeof adapter.registerRoutes).toBe("function");
            expect(typeof adapter.registerCMS).toBe("function");
            expect(typeof adapter.injectComponents).toBe("function");
        });
        it("runs all required methods without throwing", async () => {
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
        it("returns diagnostics that include adapter metadata when provided", () => {
            const adapter = target.createAdapter();
            if (!adapter.getDiagnostics) {
                expect(adapter.getDiagnostics).toBeUndefined();
                return;
            }
            const diagnostics = adapter.getDiagnostics();
            expect(diagnostics.adapterName).toBeTruthy();
            expect(typeof diagnostics.productionReady).toBe("boolean");
        });
    });
}
