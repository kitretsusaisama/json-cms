import type { AdapterV1 } from "@upflame/adapter-contract";

export interface NextjsAdapterContext {
  runtime?: "pages" | "app";
}

export const nextjsAdapterV1: AdapterV1<NextjsAdapterContext, NextjsAdapterContext, NextjsAdapterContext, NextjsAdapterContext> = {
  setup() {
    return;
  },
  registerRoutes() {
    return;
  },
  registerCMS() {
    return;
  },
  injectComponents() {
    return;
  },
  getDiagnostics() {
    return {
      adapterName: "nextjs",
      adapterVersion: "1",
      productionReady: true,
      capabilities: {
        ssr: true,
        ssg: true,
        apiRoutes: true,
        serverComponents: true,
        streaming: true,
      },
    };
  },
};
