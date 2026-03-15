export type RenderSource = "core" | "plugin" | "manifest" | "user";

export interface RenderContext {
  schemaType?: string;
  componentKey?: string;
  locale?: string;
  preview?: boolean;
  [key: string]: unknown;
}

export type RenderHandler<TOutput = unknown> = (data: unknown, ctx: RenderContext) => TOutput;

export interface RenderRegistryEntry<TRenderer = unknown> {
  id: string;
  schemaType: string;
  source: RenderSource;
  renderer?: TRenderer;
  componentKey?: string;
  pluginId?: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface RegisterRenderOptions<TRenderer = unknown> {
  id?: string;
  source?: RenderSource;
  renderer?: TRenderer;
  componentKey?: string;
  pluginId?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

function normalizeEntry<TRenderer>(
  schemaType: string,
  options: RegisterRenderOptions<TRenderer>
): RenderRegistryEntry<TRenderer> {
  return {
    id: options.id ?? `${schemaType}:${options.componentKey ?? "renderer"}`,
    schemaType,
    source: options.source ?? "core",
    renderer: options.renderer,
    componentKey: options.componentKey,
    pluginId: options.pluginId,
    priority: options.priority ?? 100,
    metadata: options.metadata,
  };
}

export class RenderRegistry<TRenderer = unknown> {
  private readonly entries = new Map<string, RenderRegistryEntry<TRenderer>[]>();
  private readonly pluginEntries = new Map<string, Set<string>>();

  register(schemaType: string, options: RegisterRenderOptions<TRenderer>): RenderRegistryEntry<TRenderer> {
    if (!schemaType.trim()) {
      throw new Error("Render registry schemaType must be a non-empty string.");
    }

    const entry = normalizeEntry(schemaType, options);
    const current = this.entries.get(schemaType) ?? [];

    const existingIndex = current.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1, entry);
    } else {
      current.push(entry);
    }

    current.sort((left, right) => right.priority - left.priority);
    this.entries.set(schemaType, current);

    if (entry.pluginId) {
      if (!this.pluginEntries.has(entry.pluginId)) {
        this.pluginEntries.set(entry.pluginId, new Set());
      }
      this.pluginEntries.get(entry.pluginId)!.add(entry.id);
    }

    return entry;
  }

  registerPluginRenderer(
    pluginId: string,
    schemaType: string,
    options: RegisterRenderOptions<TRenderer>
  ): RenderRegistryEntry<TRenderer> {
    return this.register(schemaType, {
      ...options,
      pluginId,
      source: options.source ?? "plugin",
    });
  }

  resolve(schemaType: string): RenderRegistryEntry<TRenderer> | null {
    const entries = this.entries.get(schemaType);
    return entries?.[0] ?? null;
  }

  list(schemaType?: string): RenderRegistryEntry<TRenderer>[] {
    if (schemaType) {
      return [...(this.entries.get(schemaType) ?? [])];
    }
    return [...this.entries.values()].flat();
  }

  unregister(schemaType: string, entryId?: string): void {
    const current = this.entries.get(schemaType);
    if (!current) {
      return;
    }

    if (!entryId) {
      this.entries.delete(schemaType);
      return;
    }

    const next = current.filter((entry) => entry.id !== entryId);
    if (next.length === 0) {
      this.entries.delete(schemaType);
    } else {
      this.entries.set(schemaType, next);
    }
  }

  unregisterPlugin(pluginId: string): void {
    const ids = this.pluginEntries.get(pluginId);
    if (!ids) {
      return;
    }

    for (const [schemaType, entries] of this.entries.entries()) {
      const filtered = entries.filter((entry) => entry.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.entries.delete(schemaType);
      } else {
        this.entries.set(schemaType, filtered);
      }
    }

    this.pluginEntries.delete(pluginId);
  }
}

export const renderRegistry = new RenderRegistry();
