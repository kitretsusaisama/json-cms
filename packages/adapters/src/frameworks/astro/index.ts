import type { AdapterDescriptor } from "../../types";

export const astroAdapterDescriptor: AdapterDescriptor = {
  id: "astro",
  framework: "astro",
  packageName: "@upflame/adapters",
  displayName: "Astro Adapter",
  versionRange: ">=4.0.0",
  capabilities: ["ssr", "ssg", "isr", "component-hydration"],
  entrypoint: "@upflame/adapters/astro",
};

export function createAstroAdapterPlaceholder() {
  return {
    status: "planned" as const,
    message: "Astro adapter implementation is scaffolded but not yet published.",
  };
}
