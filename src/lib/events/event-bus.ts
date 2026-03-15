/**
 * @upflame/json-cms — Central Event Bus
 *
 * Lightweight, typed, synchronous-first event dispatcher.
 * Supports async handlers via fire-and-forget or await-all modes.
 * Used throughout the pipeline for observability and plugin extensibility.
 *
 * Pipeline events:
 *   cms:ready         — system initialized
 *   page:validate     — validation started
 *   page:validated    — validation completed
 *   page:resolve      — resolution started
 *   page:resolved     — resolution completed
 *   page:plan         — planning started
 *   page:planned      — planning completed
 *   page:render       — rendering started
 *   page:rendered     — rendering completed
 *   block:loaded      — block JSON loaded
 *   plugin:installed  — plugin installed
 *   plugin:activated  — plugin activated
 *   plugin:error      — plugin lifecycle error
 *   seo:generated     — SEO metadata generated
 *   cache:hit         — cache lookup succeeded
 *   cache:miss        — cache lookup missed
 *   cache:invalidated — cache entry invalidated
 *   security:blocked  — request blocked by security layer
 *   error:pipeline    — unhandled pipeline error
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** All typed CMS events */
export interface CMSEventMap {
  // System
  "cms:ready": { version: string; framework?: string };
  "cms:shutdown": { reason?: string };

  // Pipeline — validate
  "page:validate": { slug: string; type: "page" | "block" };
  "page:validated": { slug: string; valid: boolean; errorCount: number; warningCount: number; durationMs: number };

  // Pipeline — resolve
  "page:resolve": { slug: string; ctx: Record<string, unknown> };
  "page:resolved": { slug: string; blockCount: number; warningCount: number; durationMs: number; cacheHit: boolean };

  // Pipeline — plan
  "page:plan": { slug: string; componentCount: number };
  "page:planned": { slug: string; componentCount: number; constraintsPassed: number; constraintsFailed: number; durationMs: number };

  // Pipeline — render
  "page:render": { slug: string; componentCount: number };
  "page:rendered": { slug: string; durationMs: number };

  // Blocks
  "block:loaded": { blockId: string; fromCache: boolean; durationMs: number };
  "block:missing": { blockId: string; slug: string };

  // Plugins
  "plugin:installed": { pluginId: string; version: string };
  "plugin:activated": { pluginId: string; componentCount: number; hookCount: number };
  "plugin:deactivated": { pluginId: string };
  "plugin:error": { pluginId: string; lifecycle: string; error: string };

  // SEO
  "seo:generated": { slug: string; locale: string; titleLength: number };
  "seo:validated": { slug: string; score: number; issueCount: number };

  // Cache
  "cache:hit": { key: string; ttlRemainingMs?: number };
  "cache:miss": { key: string };
  "cache:set": { key: string; ttlMs: number };
  "cache:invalidated": { key: string; reason?: string };

  // Security
  "security:blocked": { reason: string; ip?: string; path?: string };
  "security:rateLimited": { ip: string; limit: number; windowMs: number };

  // Errors
  "error:pipeline": { stage: string; slug?: string; error: string; stack?: string };
  "error:unhandled": { error: string; context?: Record<string, unknown> };

  // Custom events (plugins can emit these)
  [key: `plugin:${string}:${string}`]: Record<string, unknown>;
}

export type CMSEventName = keyof CMSEventMap;
export type CMSEventPayload<T extends CMSEventName> = CMSEventMap[T];

export type SyncHandler<T extends CMSEventName> = (payload: CMSEventPayload<T>) => void;
export type AsyncHandler<T extends CMSEventName> = (payload: CMSEventPayload<T>) => Promise<void>;
export type AnyHandler<T extends CMSEventName> = SyncHandler<T> | AsyncHandler<T>;

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EmitOptions {
  /** If true, await all async handlers before returning. Default: false */
  await?: boolean;
  /** Suppress handler errors from propagating. Default: true */
  suppressErrors?: boolean;
}

// ─── EventBus Class ───────────────────────────────────────────────────────────

export class CMSEventBus {
  private readonly handlers = new Map<string, Set<AnyHandler<CMSEventName>>>();
  private readonly wildcardHandlers = new Set<(name: CMSEventName, payload: unknown) => void | Promise<void>>();
  private _eventHistory: Array<{ name: string; payload: unknown; timestamp: number }> = [];
  private readonly maxHistorySize = 500;
  private metricsEnabled = process.env.NODE_ENV !== "production";

  // ── Subscribe ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to a specific typed event.
   * Returns an unsubscribe function.
   */
  on<T extends CMSEventName>(
    event: T,
    handler: AnyHandler<T>
  ): EventSubscription {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    // Cast necessary because Map stores a union type
    this.handlers.get(event)!.add(handler as AnyHandler<CMSEventName>);

    return {
      unsubscribe: () => this.off(event, handler),
    };
  }

  /**
   * Subscribe to all events (wildcard).
   * Useful for logging, tracing, and monitoring.
   */
  onAll(
    handler: (name: CMSEventName, payload: unknown) => void | Promise<void>
  ): EventSubscription {
    this.wildcardHandlers.add(handler);
    return { unsubscribe: () => this.wildcardHandlers.delete(handler) };
  }

  /**
   * Subscribe to an event once — auto-unsubscribes after first emission.
   */
  once<T extends CMSEventName>(
    event: T,
    handler: AnyHandler<T>
  ): EventSubscription {
    const wrapper: AnyHandler<T> = (payload) => {
      sub.unsubscribe();
      return (handler as SyncHandler<T>)(payload);
    };
    const sub = this.on(event, wrapper);
    return sub;
  }

  /**
   * Unsubscribe a handler from a specific event.
   */
  off<T extends CMSEventName>(event: T, handler: AnyHandler<T>): void {
    this.handlers.get(event)?.delete(handler as AnyHandler<CMSEventName>);
  }

  // ── Emit ────────────────────────────────────────────────────────────────────

  /**
   * Emit an event synchronously.
   * Async handlers are fire-and-forget unless opts.await = true.
   */
  emit<T extends CMSEventName>(
    event: T,
    payload: CMSEventPayload<T>,
    opts: EmitOptions = {}
  ): void {
    const { suppressErrors = true } = opts;

    // Track history in non-production
    if (this.metricsEnabled) {
      this._eventHistory.push({ name: event, payload, timestamp: Date.now() });
      if (this._eventHistory.length > this.maxHistorySize) {
        this._eventHistory.shift();
      }
    }

    // Run specific handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(payload);
          if (result instanceof Promise && !suppressErrors) {
            result.catch((err) =>
              console.error(`[CMS EventBus] Async handler error for "${event}":`, err)
            );
          }
        } catch (err) {
          if (!suppressErrors) throw err;
          console.error(`[CMS EventBus] Handler error for "${event}":`, err);
        }
      }
    }

    // Run wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        handler(event, payload);
      } catch (err) {
        if (!suppressErrors) throw err;
        console.error(`[CMS EventBus] Wildcard handler error:`, err);
      }
    }
  }

  /**
   * Emit an event and await all async handlers.
   * Use sparingly — prefer fire-and-forget for performance.
   */
  async emitAsync<T extends CMSEventName>(
    event: T,
    payload: CMSEventPayload<T>,
    opts: Omit<EmitOptions, "await"> = {}
  ): Promise<void> {
    const { suppressErrors = true } = opts;

    if (this.metricsEnabled) {
      this._eventHistory.push({ name: event, payload, timestamp: Date.now() });
    }

    const promises: Promise<void>[] = [];

    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        promises.push(Promise.resolve(handler(payload) as void | Promise<void>).catch((err) => {
          if (!suppressErrors) throw err;
          console.error(`[CMS EventBus] Async handler error for "${event}":`, err);
        }));
      }
    }

    for (const handler of this.wildcardHandlers) {
      promises.push(Promise.resolve(handler(event, payload)).catch((err) => {
        if (!suppressErrors) throw err;
      }));
    }

    await Promise.allSettled(promises);
  }

  // ── Introspection ────────────────────────────────────────────────────────────

  /** Number of subscribers for a specific event */
  listenerCount(event: CMSEventName): number {
    return (this.handlers.get(event)?.size ?? 0) + this.wildcardHandlers.size;
  }

  /** List all events that have subscribers */
  activeEvents(): CMSEventName[] {
    return [...this.handlers.keys()].filter(
      (k) => (this.handlers.get(k)?.size ?? 0) > 0
    ) as CMSEventName[];
  }

  /** Recent event history (non-production only) */
  recentEvents(limit = 50): Array<{ name: string; payload: unknown; timestamp: number }> {
    return this._eventHistory.slice(-limit);
  }

  /** Remove all subscribers (useful for testing cleanup) */
  removeAllListeners(event?: CMSEventName): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
      this.wildcardHandlers.clear();
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Global CMS event bus — single instance per process */
export const eventBus = new CMSEventBus();

// ─── Instrumentation Helper ───────────────────────────────────────────────────

/**
 * Wrap a pipeline stage with automatic timing and event emission.
 *
 * @example
 * const result = await withStageEvents(
 *   "page:resolve", "page:resolved",
 *   { slug: "home" },
 *   async () => loadResolvedPage("home"),
 *   (result) => ({ blockCount: result.blocks.length, warningCount: result.warnings.length })
 * );
 */
export async function withStageEvents<TResult, TStart extends CMSEventName, TEnd extends CMSEventName>(
  startEvent: TStart,
  endEvent: TEnd,
  startPayload: CMSEventPayload<TStart>,
  fn: () => Promise<TResult>,
  endPayloadFn: (result: TResult, durationMs: number) => Omit<CMSEventPayload<TEnd>, "durationMs">
): Promise<TResult> {
  eventBus.emit(startEvent, startPayload);
  const start = performance.now();

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    const endPayload = { ...endPayloadFn(result, durationMs), durationMs } as CMSEventPayload<TEnd>;
    eventBus.emit(endEvent, endPayload);
    return result;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    eventBus.emit("error:pipeline", {
      stage: String(startEvent).split(":")[0],
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

// ─── Built-in Listeners ───────────────────────────────────────────────────────

/**
 * Enable structured logging of all pipeline events.
 * Call once during app initialization.
 */
export function enableEventLogging(opts: { level?: "debug" | "info"; structured?: boolean } = {}): EventSubscription {
  const { level = "debug", structured = false } = opts;

  return eventBus.onAll((name, payload) => {
    if (process.env.NODE_ENV === "production" && level === "debug") return;

    const entry = { event: name, payload, timestamp: new Date().toISOString() };

    if (structured) {
      console.log(JSON.stringify(entry));
    } else if (level === "debug") {
      console.debug(`[CMS] ${name}`, payload);
    }
  });
}

/**
 * Collect performance metrics from pipeline events.
 * Returns an object that accumulates timing data.
 */
export function createPerformanceCollector(): {
  metrics: Record<string, number[]>;
  subscription: EventSubscription;
  summary(): Record<string, { p50: number; p99: number; count: number }>;
} {
  const metrics: Record<string, number[]> = {};

  const subscription = eventBus.onAll((name, payload) => {
    const p = payload as Record<string, unknown>;
    if (typeof p.durationMs === "number") {
      if (!metrics[name]) metrics[name] = [];
      metrics[name].push(p.durationMs);
    }
  });

  return {
    metrics,
    subscription,
    summary() {
      const out: Record<string, { p50: number; p99: number; count: number }> = {};
      for (const [event, durations] of Object.entries(metrics)) {
        const sorted = [...durations].sort((a, b) => a - b);
        out[event] = {
          count: sorted.length,
          p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
          p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
        };
      }
      return out;
    },
  };
}

