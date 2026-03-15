import type React from "react";
import type { HookName, PluginComponentDef, SdkRegistry } from "@/plugin-sdk/types";
import type { ContentTypeDefinition } from "@/core/content/schemas";
import { componentCatalog, type ComponentCatalog } from "@/core/components/catalog";
import { pluginHookRegistry, type PluginHookRegistry } from "@/core/plugins/hook-registry";
import { schemaRegistry, type ContentSchemaRegistry } from "@/core/registry/schema-registry";
import { renderRegistry, type RenderRegistry } from "@/core/registry/render-registry";

export interface SandboxRegistryDeps {
  components?: ComponentCatalog;
  hooks?: PluginHookRegistry;
  schemas?: ContentSchemaRegistry;
  renderers?: RenderRegistry;
}

function resolveDeps(input: SandboxRegistryDeps | undefined) {
  return {
    components: input?.components ?? componentCatalog,
    hooks: input?.hooks ?? pluginHookRegistry,
    schemas: input?.schemas ?? schemaRegistry,
    renderers: input?.renderers ?? renderRegistry,
  };
}

export function createSandboxedRegistry(pluginId: string, deps?: SandboxRegistryDeps): SdkRegistry {
  const resolved = resolveDeps(deps);
  const registeredKeys: string[] = [];
  const unregisterHookFns = hookCleanupRegistry.get(pluginId) ?? [];
  hookCleanupRegistry.set(pluginId, unregisterHookFns);

  return {
    registerComponent(
      key: string,
      component: React.ComponentType<Record<string, unknown>>,
      meta?: Partial<PluginComponentDef>
    ): void {
      if (!/^[A-Z][A-Za-z0-9]+$/.test(key)) {
        throw new Error(
          `[Plugin: ${pluginId}] Component key "${key}" must be PascalCase (for example, MyComponent).`
        );
      }

      const existing = resolved.components.get(key);
      if (existing && existing.source !== pluginId) {
        throw new Error(
          `[Plugin: ${pluginId}] Component key "${key}" is already registered by "${existing.source}".`
        );
      }

      resolved.components.registerPluginComponent(pluginId, key, component, {
        metadata: {
          name: meta?.displayName ?? key,
          description: meta?.description,
          category: meta?.category ?? "custom",
          version: "1.0.0",
          author: pluginId,
          tags: [pluginId, "plugin"],
        },
        schema: meta?.propsSchema,
        lazy: false,
      });
      registeredKeys.push(key);
    },

    registerHook(
      hookName: HookName,
      handler: (data: unknown) => Promise<unknown> | unknown,
      priority = 100
    ): () => void {
      if (priority < 0 || priority > 1000) {
        throw new Error(`[Plugin: ${pluginId}] Hook priority must be between 0 and 1000.`);
      }

      const unregister = resolved.hooks.register(pluginId, hookName, handler, priority);
      unregisterHookFns.push(unregister);
      return unregister;
    },

    registerContentType(type: ContentTypeDefinition): void {
      resolved.schemas.register(type, { source: "plugin", pluginId });
    },

    registerRenderer(
      schemaType: string,
      options: { componentKey?: string; renderer?: unknown; priority?: number; metadata?: Record<string, unknown> }
    ): void {
      resolved.renderers.registerPluginRenderer(pluginId, schemaType, {
        componentKey: options.componentKey,
        renderer: options.renderer,
        priority: options.priority,
        metadata: options.metadata,
      });
    },

    unregisterComponent(key: string): void {
      resolved.components.unregister(key);
      const index = registeredKeys.indexOf(key);
      if (index >= 0) {
        registeredKeys.splice(index, 1);
      }
    },
  };
}

export function createPluginCleanup(pluginId: string, deps?: SandboxRegistryDeps): () => void {
  const resolved = resolveDeps(deps);
  return () => {
    for (const unregister of unregisterHookFnsByPlugin(pluginId)) {
      unregister();
    }
    resolved.components.unregisterPlugin(pluginId);
    resolved.hooks.unregisterPlugin(pluginId);
    resolved.schemas.unregisterPlugin(pluginId);
    resolved.renderers.unregisterPlugin(pluginId);
  };
}

const hookCleanupRegistry = new Map<string, Array<() => void>>();

function unregisterHookFnsByPlugin(pluginId: string): Array<() => void> {
  const registered = hookCleanupRegistry.get(pluginId) ?? [];
  hookCleanupRegistry.delete(pluginId);
  return registered;
}
