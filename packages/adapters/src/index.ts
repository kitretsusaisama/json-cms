export type { AdapterBoundary } from "./legacy";
export type { AdapterCapability, AdapterDescriptor, ResolveAdapterRequest } from "./types";
export { AdapterRegistry, adapterRegistry, hasCapabilities, satisfiesVersion } from "./registry";
export { nextjsAdapterDescriptor } from "./frameworks/nextjs";
export { astroAdapterDescriptor } from "./frameworks/astro";
export { gatsbyAdapterDescriptor } from "./frameworks/gatsby";
export { remixAdapterDescriptor } from "./frameworks/remix";
