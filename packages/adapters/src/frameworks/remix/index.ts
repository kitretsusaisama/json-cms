import type { AdapterDescriptor } from "../../types";

export const remixAdapterDescriptor: AdapterDescriptor = {
  id: "remix",
  framework: "remix",
  packageName: "@upflame/adapters",
  displayName: "Remix Adapter",
  versionRange: ">=2.0.0",
  capabilities: ["ssr", "preview", "component-hydration"],
  entrypoint: "@upflame/adapters/remix",
};

export function createRemixAdapterPlaceholder() {
  return {
    status: "planned" as const,
    message: "Remix adapter implementation is scaffolded but not yet published.",
  };
}
