import { expect } from "vitest";
import type { AdapterV1 } from "../index";
import { defineAdapterV1ConformanceTests } from "../testing";

type TestContext = { calls: string[] };

function createCompliantAdapter(): AdapterV1<TestContext, TestContext, TestContext, TestContext> {
  return {
    setup(ctx) {
      ctx.calls.push("setup");
    },
    registerRoutes(ctx) {
      ctx.calls.push("registerRoutes");
    },
    registerCMS(ctx) {
      ctx.calls.push("registerCMS");
    },
    injectComponents(ctx) {
      ctx.calls.push("injectComponents");
    },
    getDiagnostics() {
      return {
        adapterName: "test-adapter",
        productionReady: true,
      };
    },
  };
}

const sharedContext: TestContext = { calls: [] };

defineAdapterV1ConformanceTests({
  adapterName: "contract fixture",
  createAdapter: createCompliantAdapter,
  setupContext: sharedContext,
  routeContext: sharedContext,
  cmsContext: sharedContext,
  componentContext: sharedContext,
  assertMethodInvocations: ({ setupContext }) => {
    expect(setupContext.calls).toEqual(["setup", "registerRoutes", "registerCMS", "injectComponents"]);
  },
});
