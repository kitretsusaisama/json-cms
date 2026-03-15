import Ajv from "ajv";
import type React from "react";

export interface ComponentSlotDefinition {
  name: string;
  description?: string;
  required?: boolean;
  accepts?: string[];
}

export interface ComponentVariantDefinition {
  name: string;
  description?: string;
  props?: Record<string, unknown>;
}

export interface ComponentCatalogMetadata {
  name: string;
  description?: string;
  category: string;
  version: string;
  author?: string;
  tags?: string[];
  slots?: ComponentSlotDefinition[];
  variants?: ComponentVariantDefinition[];
}

export interface ComponentCatalogEntry {
  key: string;
  metadata: ComponentCatalogMetadata;
  schema?: Record<string, unknown>;
  lazy: boolean;
  source: string;
  runtime: "core" | "plugin" | "manifest";
  component?: React.ComponentType<Record<string, unknown>>;
  pluginId?: string;
}

export interface ComponentValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

export interface RegisterComponentOptions {
  metadata: ComponentCatalogMetadata;
  schema?: Record<string, unknown>;
  lazy?: boolean;
  source?: string;
  runtime?: ComponentCatalogEntry["runtime"];
  pluginId?: string;
}

const ajv = new Ajv({ allErrors: true, strict: false });

function normalizeMetadata(metadata: ComponentCatalogMetadata): ComponentCatalogMetadata {
  return {
    ...metadata,
    tags: metadata.tags ?? [],
    slots: metadata.slots ?? [],
    variants: metadata.variants ?? [],
  };
}

export class ComponentCatalog {
  private readonly entries = new Map<string, ComponentCatalogEntry>();
  private readonly pluginEntries = new Map<string, Set<string>>();

  registerComponent(
    key: string,
    component: React.ComponentType<Record<string, unknown>> | undefined,
    options: RegisterComponentOptions
  ): ComponentCatalogEntry {
    const entry: ComponentCatalogEntry = {
      key,
      component,
      metadata: normalizeMetadata(options.metadata),
      schema: options.schema,
      lazy: options.lazy ?? false,
      source: options.source ?? "core",
      runtime: options.runtime ?? "core",
      pluginId: options.pluginId,
    };

    this.entries.set(key, entry);
    return entry;
  }

  registerCoreComponent(
    key: string,
    component: React.ComponentType<Record<string, unknown>>,
    options: RegisterComponentOptions
  ): ComponentCatalogEntry {
    return this.registerComponent(key, component, {
      ...options,
      runtime: options.runtime ?? "core",
      source: options.source ?? "core",
    });
  }

  registerManifestEntry(key: string, options: RegisterComponentOptions): ComponentCatalogEntry {
    return this.registerComponent(key, undefined, {
      ...options,
      runtime: options.runtime ?? "manifest",
    });
  }

  registerPluginComponent(
    pluginId: string,
    key: string,
    component: React.ComponentType<Record<string, unknown>> | undefined,
    options: RegisterComponentOptions
  ): ComponentCatalogEntry {
    const entry = this.registerComponent(key, component, {
      ...options,
      source: pluginId,
      runtime: "plugin",
      pluginId,
    });

    if (!this.pluginEntries.has(pluginId)) {
      this.pluginEntries.set(pluginId, new Set());
    }
    this.pluginEntries.get(pluginId)!.add(key);

    return entry;
  }

  updateEntry(key: string, patch: Partial<Omit<ComponentCatalogEntry, "key">>): ComponentCatalogEntry | null {
    const current = this.entries.get(key);
    if (!current) {
      return null;
    }

    const next: ComponentCatalogEntry = {
      ...current,
      ...patch,
      metadata: patch.metadata ? normalizeMetadata({ ...current.metadata, ...patch.metadata }) : current.metadata,
    };
    this.entries.set(key, next);

    return next;
  }

  get(key: string): ComponentCatalogEntry | null {
    return this.entries.get(key) ?? null;
  }

  getComponent(key: string): React.ComponentType<Record<string, unknown>> | null {
    return this.entries.get(key)?.component ?? null;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  list(): ComponentCatalogEntry[] {
    return [...this.entries.values()].sort((left, right) => left.key.localeCompare(right.key));
  }

  listByCategory(category: string): ComponentCatalogEntry[] {
    return this.list().filter((entry) => entry.metadata.category === category);
  }

  search(query: string): ComponentCatalogEntry[] {
    const needle = query.toLowerCase();
    return this.list().filter((entry) => {
      const haystacks = [
        entry.key,
        entry.metadata.name,
        entry.metadata.description ?? "",
        ...(entry.metadata.tags ?? []),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(needle));
    });
  }

  unregister(key: string): void {
    const entry = this.entries.get(key);
    this.entries.delete(key);

    if (entry?.pluginId) {
      this.pluginEntries.get(entry.pluginId)?.delete(key);
    }
  }

  unregisterPlugin(pluginId: string): void {
    const keys = this.pluginEntries.get(pluginId);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.entries.delete(key);
    }

    this.pluginEntries.delete(pluginId);
  }

  validateProps(key: string, props: Record<string, unknown>): ComponentValidationResult {
    const entry = this.entries.get(key);
    if (!entry) {
      return {
        valid: false,
        errors: [{ path: "component", message: `Component "${key}" is not registered.` }],
      };
    }

    if (!entry.schema) {
      return {
        valid: true,
        errors: [],
      };
    }

    const validate = ajv.compile(entry.schema);
    const valid = validate(props);

    return {
      valid: Boolean(valid),
      errors: (validate.errors ?? []).map((issue) => ({
        path: issue.instancePath || issue.schemaPath,
        message: issue.message ?? "Validation failed",
      })),
    };
  }
}

export const componentCatalog = new ComponentCatalog();
