import type {
  PluginActivateContext,
  PluginDefinition,
  PluginLifecycle,
  SdkPluginManifest,
  PluginInstallContext,
  PluginHealthStatus,
} from "./types";
import { assertValidManifest } from "./manifest";

export function definePlugin(definition: {
  manifest: SdkPluginManifest;
  lifecycle: PluginLifecycle;
}): PluginDefinition {
  const validatedManifest = assertValidManifest(definition.manifest);

  return {
    manifest: validatedManifest as unknown as SdkPluginManifest,
    lifecycle: withDefaults(definition.lifecycle),
  };
}

export const createPlugin = definePlugin;

function withDefaults(lifecycle: PluginLifecycle): PluginLifecycle {
  return {
    onActivate: lifecycle.onActivate,
    onInstall:
      lifecycle.onInstall ??
      (async (_ctx: PluginInstallContext) => {
        // No installation steps by default.
      }),
    onDeactivate:
      lifecycle.onDeactivate ??
      (async (_ctx: PluginActivateContext) => {
        // No cleanup by default.
      }),
    onUninstall:
      lifecycle.onUninstall ??
      (async (_ctx: PluginInstallContext) => {
        // No uninstall steps by default.
      }),
    onUpgrade:
      lifecycle.onUpgrade ??
      (async (_ctx: PluginInstallContext, _prev: string) => {
        // No upgrade steps by default.
      }),
    onHealthCheck:
      lifecycle.onHealthCheck ??
      (async (_ctx: PluginActivateContext): Promise<PluginHealthStatus> => ({
        status: "healthy",
        message: "Plugin is running normally",
        checkedAt: new Date().toISOString(),
      })),
  };
}
