/**
 * Plugin SDK — Health Monitor
 * Polls registered plugin health checks and aggregates status.
 */

import type { PluginHealthStatus } from "./types";

interface HealthEntry {
  pluginId: string;
  checker: () => Promise<PluginHealthStatus>;
  lastStatus?: PluginHealthStatus;
  lastChecked?: Date;
}

export class PluginHealthMonitor {
  private readonly entries = new Map<string, HealthEntry>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  register(
    pluginId: string,
    checker: () => Promise<PluginHealthStatus>
  ): void {
    this.entries.set(pluginId, { pluginId, checker });
  }

  unregister(pluginId: string): void {
    this.entries.delete(pluginId);
  }

  async checkAll(): Promise<Record<string, PluginHealthStatus>> {
    const results: Record<string, PluginHealthStatus> = {};

    await Promise.allSettled(
      [...this.entries.values()].map(async (entry) => {
        try {
          const status = await Promise.race([
            entry.checker(),
            new Promise<PluginHealthStatus>((_, reject) =>
              setTimeout(() => reject(new Error("Health check timeout")), 5_000)
            ),
          ]);
          entry.lastStatus = status;
          entry.lastChecked = new Date();
          results[entry.pluginId] = status;
        } catch (err) {
          const status: PluginHealthStatus = {
            status: "unhealthy",
            message: err instanceof Error ? err.message : "Health check failed",
            checkedAt: new Date().toISOString(),
          };
          entry.lastStatus = status;
          entry.lastChecked = new Date();
          results[entry.pluginId] = status;
        }
      })
    );

    return results;
  }

  getLastStatus(): Record<string, PluginHealthStatus> {
    const out: Record<string, PluginHealthStatus> = {};
    for (const entry of this.entries.values()) {
      if (entry.lastStatus) out[entry.pluginId] = entry.lastStatus;
    }
    return out;
  }

  /** Start periodic health checks */
  startPolling(intervalMs = 60_000): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => void this.checkAll(), intervalMs);
  }

  stopPolling(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export const pluginHealthMonitor = new PluginHealthMonitor();
