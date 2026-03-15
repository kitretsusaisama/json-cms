import type { ContentTypeDefinition } from "@upflame/schema-engine";
import type { PluginApiDef, PluginComponentDef, PluginRendererDef } from "./types";
export declare function defineContentType(input: ContentTypeDefinition): ContentTypeDefinition;
export declare function extendSchema(...types: Array<ContentTypeDefinition | ContentTypeDefinition[]>): ContentTypeDefinition[];
export declare function extendUI(component: PluginComponentDef): PluginComponentDef;
export declare function extendAPI(api: PluginApiDef): PluginApiDef;
export declare function defineRenderer(definition: PluginRendererDef): PluginRendererDef;
//# sourceMappingURL=extensions.d.ts.map