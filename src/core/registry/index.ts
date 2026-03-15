import { ComponentCatalog, componentCatalog } from "@/core/components/catalog";
import { pluginHookRegistry, PluginHookRegistry } from "@/core/plugins/hook-registry";
import { RenderRegistry, renderRegistry } from "@/core/registry/render-registry";
import { ContentSchemaRegistry, schemaRegistry } from "@/core/registry/schema-registry";
import { CMSEventBus, eventBus } from "@/lib/events/event-bus";

export { componentCatalog, ComponentCatalog };
export { renderRegistry, RenderRegistry };
export { schemaRegistry, ContentSchemaRegistry };
export { pluginHookRegistry, PluginHookRegistry };
export { eventBus, CMSEventBus };

export interface RuntimeRegistries {
  components: ComponentCatalog;
  renderers: RenderRegistry;
  schemas: ContentSchemaRegistry;
  hooks: PluginHookRegistry;
  events: CMSEventBus;
}

export function createRuntimeRegistries(): RuntimeRegistries {
  return {
    components: new ComponentCatalog(),
    renderers: new RenderRegistry(),
    schemas: new ContentSchemaRegistry(),
    hooks: new PluginHookRegistry(),
    events: new CMSEventBus(),
  };
}
