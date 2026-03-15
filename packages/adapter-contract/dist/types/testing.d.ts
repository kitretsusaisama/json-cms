import type { AdapterV1 } from "./contracts";
export interface AdapterV1ConformanceTarget<SetupContext = unknown, RouteContext = unknown, CMSContext = unknown, ComponentContext = unknown> {
    adapterName: string;
    createAdapter: () => AdapterV1<SetupContext, RouteContext, CMSContext, ComponentContext>;
    setupContext: SetupContext;
    routeContext: RouteContext;
    cmsContext: CMSContext;
    componentContext: ComponentContext;
    assertMethodInvocations?: (params: {
        adapter: AdapterV1<SetupContext, RouteContext, CMSContext, ComponentContext>;
        setupContext: SetupContext;
        routeContext: RouteContext;
        cmsContext: CMSContext;
        componentContext: ComponentContext;
    }) => Promise<void> | void;
}
export declare function defineAdapterV1ConformanceTests<SetupContext, RouteContext, CMSContext, ComponentContext>(target: AdapterV1ConformanceTarget<SetupContext, RouteContext, CMSContext, ComponentContext>): void;
//# sourceMappingURL=testing.d.ts.map