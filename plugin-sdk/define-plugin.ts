/**
 * Plugin SDK — definePlugin()
 *
 * The primary entry point for plugin authors.
 * Provides type safety, default lifecycle implementations, and validation.
 */

import type {
  PluginDefinition,
  PluginLifecycle,
  SdkPluginManifest,
  PluginActivateContext,
  PluginInstallContext,
  PluginHealthStatus,
} from "./types";
import { assertValidManifest } from "./manifest";

/**
 * Define a plugin with a typed manifest and lifecycle hooks.
 *
 * @example
 * ```ts
 * export default definePlugin({
 *   manifest: {
 *     name: "@myco/analytics-plugin",
 *     version: "1.0.0",
 *     description: "Analytics integration for json-cms",
 *     author: "My Company",
 *     cms: {
 *       components: [{ key: "AnalyticsBadge", path: "./components/Badge" }],
 *     },
 *   },
 *   lifecycle: {
 *     async onActivate(ctx) {
 *       ctx.logger.info("Analytics plugin activated");
 *       ctx.registry.registerComponent("AnalyticsBadge", AnalyticsBadgeComponent);
 *     },
 *   },
 * });
 * ```
 */
export function definePlugin(definition: {
  manifest: SdkPluginManifest;
  lifecycle: PluginLifecycle;
}): PluginDefinition {
  // Validate manifest at definition time — catches errors before runtime
  const validatedManifest = assertValidManifest(definition.manifest);

  return {
    manifest: validatedManifest as unknown as SdkPluginManifest,
    lifecycle: withDefaults(definition.lifecycle),
  };
}

/** Apply safe no-op defaults to optional lifecycle hooks */
function withDefaults(lifecycle: PluginLifecycle): PluginLifecycle {
  return {
    // Required: no default — must be provided
    onActivate: lifecycle.onActivate,

    // Optional: no-op defaults
    onInstall:
      lifecycle.onInstall ??
      (async (_ctx: PluginInstallContext) => {
        // No installation steps by default
      }),

    onDeactivate:
      lifecycle.onDeactivate ??
      (async (_ctx: PluginActivateContext) => {
        // No cleanup by default
      }),

    onUninstall:
      lifecycle.onUninstall ??
      (async (_ctx: PluginInstallContext) => {
        // No uninstall steps by default
      }),

    onUpgrade:
      lifecycle.onUpgrade ??
      (async (_ctx: PluginInstallContext, _prev: string) => {
        // No migration by default
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

/**
 * Create a plugin activation context — used internally by the plugin manager
 * and exposed for testing plugin lifecycle hooks directly.
 */
export function createPluginContext(
  pluginId: string,
  pluginDir: string
): PluginActivateContext {
  const { PluginConfigStore } = require("./config-store");
  const { PluginEventBus } = require("./event-bus");
  const { createPluginLogger } = require("./plugin-logger");
  const { createSandboxedRegistry } = require("./sandbox");

  return {
    pluginId,
    pluginDir,
    cmsVersion: require("./version").CMS_SDK_VERSION,
    logger: createPluginLogger(pluginId),
    config: new PluginConfigStore(pluginId),
    registry: createSandboxedRegistry(pluginId),
    events: new PluginEventBus(),
  };
}
