import { CMS_CORE_VERSION } from "./version";

export type CmsCoreFeature = "content" | "components" | "plugins" | "schema";

export interface CmsCoreOptions {
  readonly projectName: string;
  readonly enabledFeatures?: readonly CmsCoreFeature[];
}

export interface CmsCore {
  readonly projectName: string;
  readonly enabledFeatures: readonly CmsCoreFeature[];
  hasFeature(feature: CmsCoreFeature): boolean;
}

const DEFAULT_FEATURES: readonly CmsCoreFeature[] = ["content", "components", "plugins", "schema"];

export function createCmsCore(options: CmsCoreOptions): CmsCore {
  const enabledFeatures = options.enabledFeatures ?? DEFAULT_FEATURES;

  return {
    projectName: options.projectName,
    enabledFeatures,
    hasFeature(feature) {
      return enabledFeatures.includes(feature);
    },
  };
}
