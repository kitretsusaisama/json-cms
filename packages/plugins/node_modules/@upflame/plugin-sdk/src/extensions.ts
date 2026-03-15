import { defineContentType as defineContentTypeSchema } from "@upflame/schema-engine";
import type { ContentTypeDefinition } from "@upflame/schema-engine";
import type { PluginApiDef, PluginComponentDef, PluginRendererDef } from "./types";

export function defineContentType(input: ContentTypeDefinition): ContentTypeDefinition {
  return defineContentTypeSchema(input);
}

export function extendSchema(...types: Array<ContentTypeDefinition | ContentTypeDefinition[]>): ContentTypeDefinition[] {
  if (types.length === 1 && Array.isArray(types[0])) {
    return types[0] as ContentTypeDefinition[];
  }
  return types as ContentTypeDefinition[];
}

export function extendUI(component: PluginComponentDef): PluginComponentDef {
  return component;
}

export function extendAPI(api: PluginApiDef): PluginApiDef {
  return api;
}

export function defineRenderer(definition: PluginRendererDef): PluginRendererDef {
  return definition;
}
