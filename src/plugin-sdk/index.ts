/**
 * @upflame/json-cms - Plugin SDK
 */

export { createPlugin, definePlugin } from "./define-plugin";
export { PluginManifestSchema, validateManifest, assertValidManifest } from "./manifest";
export type { ValidatedManifest, ManifestValidationResult } from "./manifest";

export { PluginEventBus, globalEventBus } from "./event-bus";
export { PluginConfigStore } from "./config-store";
export { createPluginLogger } from "./plugin-logger";
export { PluginHealthMonitor, pluginHealthMonitor } from "./health-monitor";
export { defineContentType, extendSchema, extendUI, extendAPI, defineRenderer } from "./extensions";
export { createSandboxedRegistry, createPluginCleanup } from "./sandbox";

export { semverSatisfies } from "./semver";
export { CMS_SDK_VERSION } from "./version";

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


