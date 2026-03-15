/**
 * Plugin SDK — Event Bus
 *
 * Typed pub/sub event bus for plugin ↔ CMS communication.
 * Plugins receive their own scoped bus — events are prefixed to prevent collisions.
 */
import type { SdkEventBus } from "./types";
type Handler = (payload: unknown) => void | Promise<void>;
export declare class PluginEventBus implements SdkEventBus {
    private readonly handlers;
    private readonly pluginPrefix;
    constructor(pluginId?: string);
    emit(event: string, payload?: unknown): Promise<void>;
    on(event: string, handler: Handler): () => void;
    off(event: string, handler: Handler): void;
    /** Remove all handlers for this bus (called on plugin deactivation) */
    clear(): void;
    private normalizeEvent;
}
declare class GlobalEventBus extends PluginEventBus {
    private static instance;
    private constructor();
    static getInstance(): GlobalEventBus;
}
export declare const globalEventBus: GlobalEventBus;
export {};
//# sourceMappingURL=event-bus.d.ts.map