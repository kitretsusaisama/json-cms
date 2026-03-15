import { createCMS, type CreateCmsOptions } from "@/core/cms";
import type { ContentTypeDefinition } from "@/core/content/schemas";
import type { InstalledPluginState } from "@/core/plugins/host";
import { CMS_SDK_VERSION } from "@/plugin-sdk/version";

export interface BootCmsOptions extends CreateCmsOptions {
  contentTypes?: ContentTypeDefinition[];
  activateAllPlugins?: boolean;
  autoActivate?: boolean;
}

export interface BootCmsResult {
  runtime: Awaited<ReturnType<typeof createCMS>>;
  installedPlugins: InstalledPluginState[];
  activatedPlugins: InstalledPluginState[];
  bootedAt: string;
}

export async function bootCMS(options: BootCmsOptions = {}): Promise<BootCmsResult> {
  const runtime = await createCMS(options);

  if (options.contentTypes && options.contentTypes.length > 0) {
    runtime.schemas.registerMany(options.contentTypes, { source: "core" });
  }

  const installedPlugins = await runtime.plugins.listPlugins();
  const activatedPlugins: InstalledPluginState[] = [];

  if (options.autoActivate ?? true) {
    for (const plugin of installedPlugins) {
      if (options.activateAllPlugins || plugin.active) {
        const activated = await runtime.plugins.activatePlugin(plugin.id);
        activatedPlugins.push(activated);
      }
    }
  }

  runtime.events.emit("cms:ready", {
    version: CMS_SDK_VERSION,
    framework: runtime.framework,
  });

  return {
    runtime,
    installedPlugins,
    activatedPlugins,
    bootedAt: new Date().toISOString(),
  };
}
