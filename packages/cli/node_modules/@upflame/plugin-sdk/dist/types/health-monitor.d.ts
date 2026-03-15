/**
 * Plugin SDK — Health Monitor
 * Polls registered plugin health checks and aggregates status.
 */
import type { PluginHealthStatus } from "./types";
export declare class PluginHealthMonitor {
    private readonly entries;
    private intervalHandle;
    register(pluginId: string, checker: () => Promise<PluginHealthStatus>): void;
    unregister(pluginId: string): void;
    checkAll(): Promise<Record<string, PluginHealthStatus>>;
    getLastStatus(): Record<string, PluginHealthStatus>;
    /** Start periodic health checks */
    startPolling(intervalMs?: number): void;
    stopPolling(): void;
}
export declare const pluginHealthMonitor: PluginHealthMonitor;
//# sourceMappingURL=health-monitor.d.ts.map