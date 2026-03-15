import { defineAdapterV1ConformanceTests } from "@upflame/adapter-contract/testing";
import { nextjsAdapterV1 } from "../nextjs-adapter-v1";

defineAdapterV1ConformanceTests({
  adapterName: "@upflame/adapter-nextjs",
  createAdapter: () => nextjsAdapterV1,
  setupContext: { runtime: "app" },
  routeContext: { runtime: "app" },
  cmsContext: { runtime: "app" },
  componentContext: { runtime: "app" },
});
