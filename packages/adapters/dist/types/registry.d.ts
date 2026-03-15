import type { AdapterCapability, AdapterDescriptor, ResolveAdapterRequest } from "./types";
/**
 * Supported range formats:
 * - exact: 1.2.3
 * - >=: >=1.2.3
 * - caret: ^1.2.3
 * - tilde: ~1.2.3
 *
 * Invalid or unsupported versions/ranges return false.
 */
export declare const satisfiesVersion: (version: string, range: string) => boolean;
export declare class AdapterRegistry {
    private readonly descriptors;
    constructor(descriptors?: AdapterDescriptor[]);
    list(): AdapterDescriptor[];
    resolve(request: ResolveAdapterRequest): AdapterDescriptor | undefined;
    capabilityMatrix(): Record<string, AdapterCapability[]>;
    capabilityMatrixByFramework(): Record<string, AdapterCapability[][]>;
}
export declare const hasCapabilities: (availableCapabilities: AdapterCapability[], requiredCapabilities: AdapterCapability[]) => boolean;
export declare const adapterRegistry: AdapterRegistry;
//# sourceMappingURL=registry.d.ts.map