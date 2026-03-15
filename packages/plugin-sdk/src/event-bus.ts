/**
 * Plugin SDK — Event Bus
 *
 * Typed pub/sub event bus for plugin ↔ CMS communication.
 * Plugins receive their own scoped bus — events are prefixed to prevent collisions.
 */

import type { SdkEventBus } from "./types";

type Handler = (payload: unknown) => void | Promise<void>;

export class PluginEventBus implements SdkEventBus {
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly pluginPrefix: string;

  constructor(pluginId?: string) {
    this.pluginPrefix = pluginId ? `plugin:${pluginId}:` : "";
  }

  async emit(event: string, payload?: unknown): Promise<void> {
    const key = this.normalizeEvent(event);
    const handlers = this.handlers.get(key);
    if (!handlers || handlers.size === 0) return;

    // Run all handlers concurrently — errors are isolated per handler
    const results = await Promise.allSettled(
      [...handlers].map((h) => Promise.resolve(h(payload)))
    );

    for (const result of results) {
      if (result.status === "rejected") {
        // eslint-disable-next-line no-console
        console.error(`[PluginEventBus] Handler error for "${event}":`, result.reason);
      }
    }
  }

  on(event: string, handler: Handler): () => void {
    const key = this.normalizeEvent(event);
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    const key = this.normalizeEvent(event);
    this.handlers.get(key)?.delete(handler);
  }

  /** Remove all handlers for this bus (called on plugin deactivation) */
  clear(): void {
    this.handlers.clear();
  }

  private normalizeEvent(event: string): string {
    // Plugin-scoped events are prefixed; global events (with ':') pass through
    if (event.includes(":")) return event;
    return this.pluginPrefix ? `${this.pluginPrefix}${event}` : event;
  }
}

// ─── Global event bus (singleton) ────────────────────────────────────────────

class GlobalEventBus extends PluginEventBus {
  private static instance: GlobalEventBus;

  private constructor() {
    super();
  }

  static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }
}

export const globalEventBus = GlobalEventBus.getInstance();
