/**
 * @upflame/json-cms — Plugin SDK
 *
 * The official SDK for building plugins for the @upflame/json-cms runtime.
 *
 * @example
 * ```ts
 * import { definePlugin } from "@upflame/json-cms/plugin-sdk";
 *
 * export default definePlugin({
 *   manifest: {
 *     name: "@myco/my-plugin",
 *     version: "1.0.0",
 *     description: "My CMS plugin",
 *     author: "My Company",
 *     cms: {
 *       components: [{ key: "MyWidget", path: "./components/MyWidget" }],
 *     },
 *   },
 *   lifecycle: {
 *     async onActivate(ctx) {
 *       ctx.registry.registerComponent("MyWidget", MyWidget);
 *       ctx.logger.info("Plugin activated");
 *     },
 *   },
 * });
 * ```
 */

// Core SDK
export { definePlugin, createPluginContext } from "./define-plugin";
export { PluginManifestSchema, validateManifest, assertValidManifest } from "./manifest";
export type { ValidatedManifest, ManifestValidationResult } from "./manifest";

// Runtime services
export { PluginEventBus, globalEventBus } from "./event-bus";
export { PluginConfigStore } from "./config-store";
export { createPluginLogger } from "./plugin-logger";
export { PluginHealthMonitor, pluginHealthMonitor } from "./health-monitor";
export { createSandboxedRegistry, createPluginCleanup } from "./sandbox";

// Utilities
export { semverSatisfies } from "./semver";
export { CMS_SDK_VERSION } from "./version";

// Types — everything a plugin author needs
export type {
  PluginDefinition,
  PluginLifecycle,
  PluginCapabilities,
  PluginInstallContext,
  PluginActivateContext,
  SdkPluginManifest,
  PluginComponentDef,
  PluginHookDef,
  PluginRouteDef,
  PluginApiDef,
  PluginEvent,
  PluginHealthStatus,
  SdkLogger,
  SdkConfigStore,
  SdkRegistry,
  SdkEventBus,
  HookName,
  ConfigFieldDef,
} from "./types";
