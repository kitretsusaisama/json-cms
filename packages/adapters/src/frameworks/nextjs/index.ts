import type { AdapterDescriptor } from "../../types";

export const nextjsAdapterDescriptor: AdapterDescriptor = {
  id: "nextjs",
  framework: "nextjs",
  packageName: "@upflame/adapters",
  displayName: "Next.js Adapter",
  versionRange: ">=15.0.0",
  capabilities: ["ssr", "ssg", "isr", "edge", "preview", "middleware", "component-hydration"],
  entrypoint: "@upflame/adapters/nextjs",
};

export * from "@upflame/adapter-nextjs";
