import type { SdkConfigStore } from "./types";
export declare class PluginConfigStore implements SdkConfigStore {
    private readonly storePath;
    private cache;
    private dirty;
    constructor(pluginId: string, baseDir?: string);
    private load;
    private flush;
    get<T = unknown>(key: string): T | undefined;
    get<T = unknown>(key: string, defaultValue: T): T;
    set<T = unknown>(key: string, value: T): Promise<void>;
    has(key: string): boolean;
    delete(key: string): Promise<void>;
    getAll(): Record<string, unknown>;
    preload(): Promise<void>;
}
//# sourceMappingURL=config-store.d.ts.map