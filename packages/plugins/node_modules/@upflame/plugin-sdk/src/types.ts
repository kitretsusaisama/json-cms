/**
 * @upflame/json-cms Plugin SDK — Type Definitions
 *
 * All types a plugin author needs. Nothing internal leaks here.
 */

import type React from "react";
import type { ContentTypeDefinition } from "@upflame/schema-engine";

// ─── Manifest ─────────────────────────────────────────────────────────────────

/** Full plugin manifest as stored in plugin.json */
export interface SdkPluginManifest {
  /** npm package name (scoped allowed): `@vendor/my-plugin` */
  name: string;
  /** semver version string */
  version: string;
  description: string;
  author: string | { name: string; email?: string; url?: string };
  license?: string;
  homepage?: string;
  repository?: string | { type: string; url: string };
  keywords?: string[];

  /** CMS-specific capabilities this plugin declares */
  cms: PluginCapabilities;

  /** Runtime engine version constraints */
  engines?: {
    "json-cms"?: string;
    node?: string;
  };

  /** Peer dependencies that must exist in the host project */
  peerDependencies?: Record<string, string>;

  /** Internal dependencies bundled with the plugin */
  dependencies?: Record<string, string>;
}

/** Everything a plugin can register with the CMS */
export interface PluginCapabilities {
  /** React components to add to the global registry */
  components?: PluginComponentDef[];
  /** Schema/content types provided by the plugin */
  contentTypes?: ContentTypeDefinition[];
  /** Renderer mappings for schema/content types */
  renderers?: PluginRendererDef[];
  /** Named lifecycle / data hooks */
  hooks?: PluginHookDef[];
  /** Next.js App Router route extensions */
  routes?: PluginRouteDef[];
  /** API route extensions under /api/plugins/<name>/ */
  api?: PluginApiDef[];
  /** Required permission scopes */
  permissions?: PluginPermissionDef[];
  /** Runtime configuration schema */
  configSchema?: Record<string, ConfigFieldDef>;
}

// ─── Component registration ────────────────────────────────────────────────────

export interface PluginComponentDef {
  /** Registry key — must be globally unique across all plugins */
  key: string;
  /** Path to the component file relative to plugin root */
  path: string;
  /** Human-readable display name */
  displayName?: string;
  /** Short description */
  description?: string;
  /** Component category for the visual editor */
  category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom";
  /** JSON Schema for the component props (used for CMS editor UI) */
  propsSchema?: Record<string, unknown>;
  /** Example props for the visual editor preview */
  exampleProps?: Record<string, unknown>;
  /** Icon URL or data URI for editor display */
  iconUrl?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export type HookName =
  | "page:before-resolve"
  | "page:after-resolve"
  | "page:before-plan"
  | "page:after-plan"
  | "page:before-render"
  | "component:before-render"
  | "component:after-render"
  | "cms:request"
  | "cms:response"
  | "settings:save"
  | "plugin:activate"
  | "plugin:deactivate"
  | string; // allow custom hook names

export interface PluginRendererDef {
  /** Schema/content type name to render */
  schemaType: string;
  /** Component key registered in the component registry */
  componentKey: string;
  /** Higher priority wins when multiple renderers exist */
  priority?: number;
}

export interface PluginHookDef {
  /** Hook event name */
  name: HookName;
  /** Path to the handler function relative to plugin root */
  handler: string;
  /** Lower number = higher priority (runs first). Default: 100 */
  priority?: number;
}

// ─── Routes & API ─────────────────────────────────────────────────────────────

export interface PluginRouteDef {
  /** URL pattern: /products/[slug] */
  path: string;
  /** Path to page component relative to plugin root */
  component: string;
  /** Optional layout component path */
  layout?: string;
  /** Required permissions to access this route */
  permissions?: string[];
}

export interface PluginApiDef {
  /** Sub-path under /api/plugins/<plugin-name>/ */
  path: string;
  methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  /** Path to route handler relative to plugin root */
  handler: string;
  /** Required permissions */
  permissions?: string[];
  rateLimit?: { requests: number; windowMs: number };
}

export interface PluginPermissionDef {
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

// ─── Config Schema ────────────────────────────────────────────────────────────

export interface ConfigFieldDef {
  type: "string" | "number" | "boolean" | "object" | "array";
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  secret?: boolean; // masked in editor UI, stored encrypted
}

// ─── Plugin definition (what the plugin author exports) ───────────────────────

/**
 * A plugin definition — the object returned by `definePlugin()`.
 * This is what the CMS runtime uses to load and manage the plugin.
 */
export interface PluginDefinition {
  manifest: SdkPluginManifest;
  lifecycle: PluginLifecycle;
}

/** Plugin lifecycle hooks — all optional; implement only what you need */
export interface PluginLifecycle {
  /**
   * Called once when the plugin is first installed.
   * Run migrations, create directories, register default settings.
   */
  onInstall?(ctx: PluginInstallContext): Promise<void>;

  /**
   * Called on every server start when the plugin is active.
   * Register components, hooks, and services here.
   */
  onActivate(ctx: PluginActivateContext): Promise<void>;

  /**
   * Called when the plugin is deactivated (not uninstalled).
   * Clean up listeners and release resources.
   */
  onDeactivate?(ctx: PluginActivateContext): Promise<void>;

  /**
   * Called when the plugin is uninstalled.
   * Roll back migrations, remove plugin data.
   */
  onUninstall?(ctx: PluginInstallContext): Promise<void>;

  /**
   * Called when the plugin is upgraded to a new version.
   * Run data migrations between versions.
   */
  onUpgrade?(
    ctx: PluginInstallContext,
    previousVersion: string
  ): Promise<void>;

  /**
   * Periodic health check — return status for admin dashboard.
   * @default always returns { status: "healthy" }
   */
  onHealthCheck?(ctx: PluginActivateContext): Promise<PluginHealthStatus>;
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

/** Context passed to install/uninstall/upgrade lifecycle hooks */
export interface PluginInstallContext {
  pluginId: string;
  pluginDir: string;
  cmsVersion: string;
  logger: SdkLogger;
  config: SdkConfigStore;
}

/** Context passed to activate/deactivate lifecycle hooks */
export interface PluginActivateContext {
  pluginId: string;
  pluginDir: string;
  cmsVersion: string;
  logger: SdkLogger;
  config: SdkConfigStore;
  registry: SdkRegistry;
  events: SdkEventBus;
}

// ─── SDK service interfaces ───────────────────────────────────────────────────

export interface SdkLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface SdkConfigStore {
  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, defaultValue: T): T;
  set<T = unknown>(key: string, value: T): Promise<void>;
  has(key: string): boolean;
  delete(key: string): Promise<void>;
  getAll(): Record<string, unknown>;
}

export interface SdkRegistry {
  registerComponent(
    key: string,
    component: React.ComponentType<Record<string, unknown>>,
    meta?: Partial<PluginComponentDef>
  ): void;
  registerHook(
    hookName: HookName,
    handler: (data: unknown) => Promise<unknown> | unknown,
    priority?: number
  ): () => void; // returns unregister function
  registerContentType(type: ContentTypeDefinition): void;
  registerRenderer(
    schemaType: string,
    options: { componentKey?: string; renderer?: unknown; priority?: number; metadata?: Record<string, unknown> }
  ): void;
  unregisterComponent(key: string): void;
}

export interface SdkEventBus {
  emit(event: string, payload?: unknown): Promise<void>;
  on(event: string, handler: (payload: unknown) => void | Promise<void>): () => void;
  off(event: string, handler: (payload: unknown) => void | Promise<void>): void;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface PluginEvent<T = unknown> {
  name: string;
  payload: T;
  source: string;
  timestamp: number;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface PluginHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  details?: Record<string, unknown>;
  checkedAt?: string;
}





