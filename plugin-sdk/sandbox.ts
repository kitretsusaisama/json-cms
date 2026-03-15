import type React from "react";
import type { HookName, PluginComponentDef, SdkRegistry } from "./types";
import { componentCatalog } from "@/core/components/catalog";
import { pluginHookRegistry } from "@/core/plugins/hook-registry";

export function createSandboxedRegistry(pluginId: string): SdkRegistry {
  const registeredKeys: string[] = [];
  const unregisterHookFns: Array<() => void> = [];

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

      const existing = componentCatalog.get(key);
      if (existing && existing.source !== pluginId) {
        throw new Error(
          `[Plugin: ${pluginId}] Component key "${key}" is already registered by "${existing.source}".`
        );
      }

      componentCatalog.registerPluginComponent(pluginId, key, component, {
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

      const unregister = pluginHookRegistry.register(pluginId, hookName, handler, priority);
      unregisterHookFns.push(unregister);
      return unregister;
    },

    unregisterComponent(key: string): void {
      componentCatalog.unregister(key);
      const index = registeredKeys.indexOf(key);
      if (index >= 0) {
        registeredKeys.splice(index, 1);
      }
    },
  };
}

export function createPluginCleanup(pluginId: string): () => void {
  return () => {
    componentCatalog.unregisterPlugin(pluginId);
    pluginHookRegistry.unregisterPlugin(pluginId);
  };
}
