import type { AdapterDescriptor } from "../../types";

export const gatsbyAdapterDescriptor: AdapterDescriptor = {
  id: "gatsby",
  framework: "gatsby",
  packageName: "@upflame/adapters",
  displayName: "Gatsby Adapter",
  versionRange: ">=5.0.0",
  capabilities: ["ssr", "ssg", "preview", "component-hydration"],
  entrypoint: "@upflame/adapters/gatsby",
};

export function createGatsbyAdapterPlaceholder() {
  return {
    status: "planned" as const,
    message: "Gatsby adapter implementation is scaffolded but not yet published.",
  };
}
