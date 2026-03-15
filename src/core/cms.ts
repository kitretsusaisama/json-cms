import { detectFramework, frameworkAdapters } from "@/adapters";
import type { SupportedFramework } from "@/adapters";
import { componentCatalog } from "@/core/components/catalog";
import { schemaRegistry } from "@/core/registry/schema-registry";
import { renderRegistry } from "@/core/registry/render-registry";
import { cmsContentRepository, ensureDataDirectories } from "@/core/content/service";
import { pluginHost } from "@/core/plugins/host";
import { eventBus } from "@/lib/events/event-bus";
import { setRuntimeFramework } from "@/core/runtime/framework-context";
import type { PluginDefinition } from "@/plugin-sdk/types";

export interface CreateCmsOptions {
  rootDir?: string;
  framework?: SupportedFramework;
}

export async function createCMS(options: CreateCmsOptions = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  await ensureDataDirectories();

  const detection = options.framework
    ? {
        framework: options.framework,
        adapter: frameworkAdapters[options.framework] ?? frameworkAdapters.unknown,
      }
    : await detectFramework(rootDir);

  setRuntimeFramework(detection.framework);
  await detection.adapter.bootstrap(rootDir);

  return {
    framework: detection.framework,
    adapter: detection.adapter,
    content: cmsContentRepository,
    components: componentCatalog,
    schemas: schemaRegistry,
    renderers: renderRegistry,
    plugins: pluginHost,
    events: eventBus,
  };
}

export async function registerPlugin(
  input: PluginDefinition | { pluginPath: string; pluginId?: string; autoActivate?: boolean }
) {
  if ("manifest" in input) {
    return pluginHost.registerPlugin(input as PluginDefinition);
  }

  return pluginHost.installPlugin(input);
}


