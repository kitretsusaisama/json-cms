export type AdapterCapability =
  | "ssr"
  | "ssg"
  | "isr"
  | "edge"
  | "preview"
  | "middleware"
  | "component-hydration";

export type AdapterDescriptor = {
  id: string;
  framework: string;
  packageName: string;
  displayName: string;
  versionRange: string;
  capabilities: AdapterCapability[];
  entrypoint: string;
};

export type ResolveAdapterRequest = {
  framework: string;
  version: string;
  requiredCapabilities?: AdapterCapability[];
};
