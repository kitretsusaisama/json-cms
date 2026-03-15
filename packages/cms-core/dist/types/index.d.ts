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
export declare function createCmsCore(options: CmsCoreOptions): CmsCore;
//# sourceMappingURL=index.d.ts.map