import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { componentCatalog, type ComponentCatalogMetadata, type ComponentCatalog } from "@/core/components/catalog";
import { schemaRegistry, type ContentSchemaRegistry } from "@/core/registry/schema-registry";
import { renderRegistry, type RenderRegistry } from "@/core/registry/render-registry";
import { getCanonicalDataPath } from "@/core/content/paths";
import { getRuntimeFramework } from "@/core/runtime/framework-context";
import { logger } from "@/lib/logger";
import { eventBus, type CMSEventBus } from "@/lib/events/event-bus";
import { PluginConfigStore } from "@/plugin-sdk/config-store";
import { PluginEventBus } from "@/plugin-sdk/event-bus";
import { pluginHealthMonitor, type PluginHealthMonitor } from "@/plugin-sdk/health-monitor";
import { createPluginLogger } from "@/plugin-sdk/plugin-logger";
import { createPluginCleanup, createSandboxedRegistry } from "@/core/plugins/sandbox";
import { semverSatisfies } from "@/plugin-sdk/semver";
import { assertValidManifest } from "@/plugin-sdk/manifest";
import type {
  PluginActivateContext,
  PluginComponentDef,
  PluginDefinition,
  PluginHealthStatus,
  PluginInstallContext,
  SdkPluginManifest,
} from "@/plugin-sdk/types";
import { CMS_SDK_VERSION } from "@/plugin-sdk/version";
import { pluginHookRegistry, type PluginHookRegistry } from "./hook-registry";

export interface RuntimePluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  compatibility: {
    frameworks: string[];
    node?: string;
    jsonCms?: string;
  };
  capabilities: NonNullable<SdkPluginManifest["cms"]>;
  entry?: string;
  keywords: string[];
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

export interface InstalledPluginState {
  id: string;
  sourcePath: string;
  manifest: RuntimePluginManifest;
  installedAt: string;
  updatedAt: string;
  active: boolean;
  activatedAt?: string;
  runtimeLoaded: boolean;
  lastError?: string;
}

export interface PluginDiscoveryInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  compatibility: RuntimePluginManifest["compatibility"];
  keywords: string[];
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}


export interface PluginHostDependencies {
  components?: ComponentCatalog;
  hooks?: PluginHookRegistry;
  schemas?: ContentSchemaRegistry;
  renderers?: RenderRegistry;
  events?: CMSEventBus;
  healthMonitor?: PluginHealthMonitor;
}

interface RuntimePluginRecord {
  definition: PluginDefinition;
  context: PluginActivateContext;
  cleanup: () => void;
  events: PluginEventBus;
  configStore: PluginConfigStore;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAuthor(author: SdkPluginManifest["author"] | unknown): string {
  if (typeof author === "string" && author.trim()) {
    return author;
  }

  if (isRecord(author) && typeof author.name === "string" && author.name.trim()) {
    return author.name;
  }

  return "unknown";
}

function normalizeManifest(raw: unknown, sourcePath: string, pluginId?: string): RuntimePluginManifest {
  if (!isRecord(raw)) {
    throw new Error("Plugin manifest must be an object.");
  }

  const fallbackName =
    (typeof raw.name === "string" && raw.name.trim()) ||
    pluginId ||
    path.basename(sourcePath);
  const manifestId =
    pluginId ||
    (typeof raw.id === "string" && raw.id.trim()) ||
    fallbackName;

  if (isRecord(raw.cms)) {
    const sdkManifest = assertValidManifest(raw);
    return {
      id: manifestId,
      name: sdkManifest.name,
      version: sdkManifest.version,
      description: sdkManifest.description,
      author: normalizeAuthor(sdkManifest.author),
      compatibility: {
        frameworks: ["nextjs"],
        node: sdkManifest.engines?.node,
        jsonCms: sdkManifest.engines?.["json-cms"],
      },
      capabilities: {
        components: sdkManifest.cms.components ?? [],
        contentTypes: sdkManifest.cms.contentTypes ?? [],
        renderers: sdkManifest.cms.renderers ?? [],
        hooks: sdkManifest.cms.hooks ?? [],
        routes: sdkManifest.cms.routes ?? [],
        api: sdkManifest.cms.api ?? [],
        permissions: sdkManifest.cms.permissions ?? [],
        configSchema: sdkManifest.cms.configSchema ?? {},
      },
      entry: typeof raw.entry === "string" ? raw.entry : undefined,
      keywords: sdkManifest.keywords ?? [],
      dependencies: sdkManifest.dependencies ?? {},
      peerDependencies: sdkManifest.peerDependencies ?? {},
    };
  }

  const compatibility = isRecord(raw.compatibility) ? raw.compatibility : {};
  const capabilities = isRecord(raw.capabilities) ? raw.capabilities : {};

  return {
    id: manifestId,
    name: fallbackName,
    version: typeof raw.version === "string" ? raw.version : "1.0.0",
    description: typeof raw.description === "string" ? raw.description : fallbackName,
    author: normalizeAuthor(raw.author),
    compatibility: {
      frameworks: Array.isArray(compatibility.frameworks)
        ? compatibility.frameworks.filter((item): item is string => typeof item === "string" && item.length > 0)
        : ["nextjs"],
      node: typeof compatibility.node === "string" ? compatibility.node : undefined,
      jsonCms: typeof compatibility.jsonCms === "string" ? compatibility.jsonCms : undefined,
    },
    capabilities: {
      components: Array.isArray(capabilities.components)
        ? (capabilities.components as PluginComponentDef[])
        : [],
      contentTypes: Array.isArray(capabilities.contentTypes)
        ? (capabilities.contentTypes as NonNullable<SdkPluginManifest["cms"]>["contentTypes"])
        : [],
      renderers: Array.isArray(capabilities.renderers)
        ? (capabilities.renderers as NonNullable<SdkPluginManifest["cms"]>["renderers"])
        : [],
      hooks: Array.isArray(capabilities.hooks) ? capabilities.hooks : [],
      routes: Array.isArray(capabilities.routes) ? capabilities.routes : [],
      api: Array.isArray(capabilities.api) ? capabilities.api : [],
      permissions: Array.isArray(capabilities.permissions) ? capabilities.permissions : [],
      configSchema: isRecord(capabilities.configSchema)
        ? (capabilities.configSchema as NonNullable<SdkPluginManifest["cms"]>["configSchema"])
        : {},
    },
    entry: typeof raw.entry === "string" ? raw.entry : undefined,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [],
    dependencies: isRecord(raw.dependencies) ? (raw.dependencies as Record<string, string>) : {},
    peerDependencies: isRecord(raw.peerDependencies)
      ? (raw.peerDependencies as Record<string, string>)
      : {},
  };
}

function metadataFromComponentDef(component: PluginComponentDef, pluginId: string): ComponentCatalogMetadata {
  return {
    name: component.displayName ?? component.key,
    description: component.description,
    category: component.category ?? "custom",
    version: "1.0.0",
    author: pluginId,
    tags: [pluginId, "plugin"],
  };
}

async function readPluginManifestFromPath(sourcePath: string): Promise<Record<string, unknown>> {
  const pluginManifestPath = path.join(sourcePath, "plugin.json");
  try {
    return JSON.parse(await fs.readFile(pluginManifestPath, "utf-8")) as Record<string, unknown>;
  } catch {
    const packageJsonPath = path.join(sourcePath, "package.json");
    return JSON.parse(await fs.readFile(packageJsonPath, "utf-8")) as Record<string, unknown>;
  }
}

function ensurePluginEntryWithinRoot(sourcePath: string, candidatePath: string): string {
  const resolvedRoot = path.resolve(sourcePath);
  const resolvedEntry = path.resolve(candidatePath);
  const relativePath = path.relative(resolvedRoot, resolvedEntry);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Plugin entry must stay within the plugin root: ${resolvedEntry}`);
  }

  return resolvedEntry;
}

async function findRuntimeEntry(sourcePath: string, entry?: string): Promise<string | null> {
  const candidates = [entry, "index.ts", "index.tsx", "index.js", "dist/index.js"].filter(
    (candidate): candidate is string => Boolean(candidate)
  );

  for (const candidate of candidates) {
    const fullPath = ensurePluginEntryWithinRoot(
      sourcePath,
      path.isAbsolute(candidate) ? candidate : path.join(sourcePath, candidate)
    );

    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      // Keep searching.
    }
  }

  return null;
}

async function withTimeout<T>(work: Promise<T>, label: string, timeoutMs = 5_000): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

const importPluginModule = new Function(
  "moduleUrl",
  "return import(moduleUrl);"
) as (moduleUrl: string) => Promise<{
  default?: PluginDefinition;
  plugin?: PluginDefinition;
}>;

async function loadPluginModule(runtimeEntry: string): Promise<{
  default?: PluginDefinition;
  plugin?: PluginDefinition;
}> {
  const moduleUrl = pathToFileURL(runtimeEntry).href;
  return importPluginModule(moduleUrl);
}

function createInstallContext(pluginId: string, pluginDir: string): {
  context: PluginInstallContext;
  configStore: PluginConfigStore;
} {
  const configStore = new PluginConfigStore(pluginId, getCanonicalDataPath("plugins"));
  const context: PluginInstallContext = Object.freeze({
    pluginId,
    pluginDir,
    cmsVersion: CMS_SDK_VERSION,
    logger: createPluginLogger(pluginId),
    config: configStore,
  });

  return { context, configStore };
}

export class PluginHost {
  private readonly components: ComponentCatalog;
  private readonly hooks: PluginHookRegistry;
  private readonly schemas: ContentSchemaRegistry;
  private readonly renderers: RenderRegistry;
  private readonly events: CMSEventBus;
  private readonly healthMonitor: PluginHealthMonitor;
  private readonly registryPath = getCanonicalDataPath("plugins", "registry.json");
  private readonly states = new Map<string, InstalledPluginState>();
  private readonly runtimeDefinitions = new Map<string, PluginDefinition>();
  private readonly activeRuntime = new Map<string, RuntimePluginRecord>();
  private loaded = false;

  constructor(deps: PluginHostDependencies = {}) {
    this.components = deps.components ?? componentCatalog;
    this.hooks = deps.hooks ?? pluginHookRegistry;
    this.schemas = deps.schemas ?? schemaRegistry;
    this.renderers = deps.renderers ?? renderRegistry;
    this.events = deps.events ?? eventBus;
    this.healthMonitor = deps.healthMonitor ?? pluginHealthMonitor;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const raw = JSON.parse(await fs.readFile(this.registryPath, "utf-8")) as InstalledPluginState[];
      for (const state of raw) {
        this.states.set(state.id, state);
      }
    } catch {
      await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    }

    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const payload = [...this.states.values()].sort((left, right) => left.id.localeCompare(right.id));
    await fs.writeFile(this.registryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  }

  private async assertCompatibility(manifest: RuntimePluginManifest): Promise<void> {
    const framework = getRuntimeFramework();
    if (
      manifest.compatibility.frameworks.length > 0 &&
      !manifest.compatibility.frameworks.includes(framework)
    ) {
      throw new Error(`Plugin ${manifest.id} does not support the detected framework (${framework}).`);
    }

    if (manifest.compatibility.node && !semverSatisfies(process.versions.node, manifest.compatibility.node)) {
      throw new Error(
        `Plugin ${manifest.id} requires Node ${manifest.compatibility.node}, current is ${process.versions.node}.`
      );
    }

    if (manifest.compatibility.jsonCms && !semverSatisfies(CMS_SDK_VERSION, manifest.compatibility.jsonCms)) {
      throw new Error(
        `Plugin ${manifest.id} requires json-cms ${manifest.compatibility.jsonCms}, current is ${CMS_SDK_VERSION}.`
      );
    }

    await this.assertPeerDependencies(manifest);
  }

  private async assertPeerDependencies(manifest: RuntimePluginManifest): Promise<void> {
    const peerDependencies = manifest.peerDependencies ?? {};
    const names = Object.keys(peerDependencies);
    if (names.length === 0) {
      return;
    }

    let hostPackages: Record<string, string> = {};
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(process.cwd(), "package.json"), "utf-8")
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };

      hostPackages = {
        ...(raw.dependencies ?? {}),
        ...(raw.devDependencies ?? {}),
        ...(raw.peerDependencies ?? {}),
      };
    } catch {
      throw new Error(
        `Plugin ${manifest.id} requires peer dependencies, but package.json could not be read.`
      );
    }

    const normalizeVersion = (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const withoutWorkspace = trimmed.startsWith("workspace:")
        ? trimmed.replace("workspace:", "")
        : trimmed;
      if (withoutWorkspace.startsWith("file:") || withoutWorkspace.startsWith("link:")) {
        return null;
      }
      if (withoutWorkspace === "*" || withoutWorkspace === "latest") {
        return null;
      }
      return withoutWorkspace.replace(/^[^0-9]*/, "");
    };

    for (const name of names) {
      const requiredRange = peerDependencies[name];
      if (!requiredRange || requiredRange === "*" || requiredRange === "latest") {
        continue;
      }

      let installedVersion = await this.readInstalledVersion(name);
      if (!installedVersion) {
        installedVersion = hostPackages[name];
      }

      if (!installedVersion) {
        throw new Error(
          `Plugin ${manifest.id} requires peer dependency ${name}@${requiredRange}, but it is not installed.`
        );
      }

      const normalized = normalizeVersion(installedVersion);
      if (!normalized) {
        logger.warn({
          message: `Plugin ${manifest.id} peer dependency ${name} could not be version-checked.`,
          required: requiredRange,
          installed: installedVersion,
        });
        continue;
      }

      if (!semverSatisfies(normalized, requiredRange)) {
        throw new Error(
          `Plugin ${manifest.id} requires ${name}@${requiredRange}, but ${installedVersion} is installed.`
        );
      }
    }
  }

  private async readInstalledVersion(packageName: string): Promise<string | null> {
    const parts = packageName.startsWith("@") ? packageName.split("/") : [packageName];
    const packagePath = path.join(process.cwd(), "node_modules", ...parts, "package.json");
    try {
      const raw = JSON.parse(await fs.readFile(packagePath, "utf-8")) as { version?: string };
      return raw.version ?? null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeDefinition(state: InstalledPluginState): Promise<PluginDefinition | null> {
    if (this.runtimeDefinitions.has(state.id)) {
      return this.runtimeDefinitions.get(state.id) ?? null;
    }

    const runtimeEntry = await findRuntimeEntry(state.sourcePath, state.manifest.entry);
    if (!runtimeEntry) {
      return null;
    }

    const imported = await loadPluginModule(runtimeEntry);
    const definition = imported.default ?? imported.plugin ?? null;
    if (!definition) {
      throw new Error(`Plugin ${state.id} does not export a default plugin definition.`);
    }

    this.runtimeDefinitions.set(state.id, definition);
    return definition;
  }

  private createContext(state: InstalledPluginState): RuntimePluginRecord {
    const events = new PluginEventBus(state.id);
    const configStore = new PluginConfigStore(state.id, getCanonicalDataPath("plugins"));
    const registry = createSandboxedRegistry(state.id, { components: this.components, hooks: this.hooks, schemas: this.schemas, renderers: this.renderers });
    const cleanup = createPluginCleanup(state.id, { components: this.components, hooks: this.hooks, schemas: this.schemas, renderers: this.renderers });

    const context: PluginActivateContext = Object.freeze({
      pluginId: state.id,
      pluginDir: state.sourcePath,
      cmsVersion: CMS_SDK_VERSION,
      logger: createPluginLogger(state.id),
      config: configStore,
      registry,
      events,
    });

    return {
      definition: this.runtimeDefinitions.get(state.id)!,
      context,
      cleanup,
      events,
      configStore,
    };
  }

  private async runInstallLifecycle(
    pluginId: string,
    sourcePath: string,
    definition: PluginDefinition,
    previousState?: InstalledPluginState
  ): Promise<void> {
    const { context, configStore } = createInstallContext(pluginId, sourcePath);
    await configStore.preload();

    if (previousState?.manifest.version && previousState.manifest.version !== definition.manifest.version) {
      if (definition.lifecycle.onUpgrade) {
        await withTimeout(
          definition.lifecycle.onUpgrade(context, previousState.manifest.version),
          `Plugin ${pluginId} upgrade`
        );
      }
      return;
    }

    if (!previousState && definition.lifecycle.onInstall) {
      await withTimeout(definition.lifecycle.onInstall(context), `Plugin ${pluginId} install`);
    }
  }
  private registerDeclarativeCapabilities(state: InstalledPluginState): void {
    this.components.unregisterPlugin(state.id);
    this.schemas.unregisterPlugin(state.id);
    this.renderers.unregisterPlugin(state.id);

    for (const component of state.manifest.capabilities.components ?? []) {
      this.components.registerPluginComponent(state.id, component.key, undefined, {
        metadata: metadataFromComponentDef(component, state.id),
        schema: component.propsSchema,
        lazy: true,
      });
    }

    for (const type of state.manifest.capabilities.contentTypes ?? []) {
      this.schemas.register(type, { source: "plugin", pluginId: state.id });
    }

    for (const renderer of state.manifest.capabilities.renderers ?? []) {
      this.renderers.registerPluginRenderer(state.id, renderer.schemaType, {
        componentKey: renderer.componentKey,
        priority: renderer.priority,
        source: "plugin",
      });
    }
  }

  async registerPlugin(definition: PluginDefinition, sourcePath = process.cwd()): Promise<InstalledPluginState> {
    await this.ensureLoaded();
    const manifest = normalizeManifest(definition.manifest, sourcePath);
    const existing = this.states.get(manifest.id);
    await this.assertCompatibility(manifest);

    await this.runInstallLifecycle(manifest.id, sourcePath, definition, existing);

    const timestamp = new Date().toISOString();
    const state: InstalledPluginState = {
      id: manifest.id,
      sourcePath,
      manifest,
      installedAt: existing?.installedAt ?? timestamp,
      updatedAt: timestamp,
      active: existing?.active ?? false,
      activatedAt: existing?.activatedAt,
      runtimeLoaded: false,
      lastError: undefined,
    };

    this.states.set(manifest.id, state);
    this.runtimeDefinitions.set(manifest.id, definition);
    await this.persist();
    this.events.emit("plugin:installed", { pluginId: manifest.id, version: manifest.version });
    return state;
  }

  async installPlugin(options: { pluginId?: string; pluginPath: string; autoActivate?: boolean }): Promise<InstalledPluginState> {
    await this.ensureLoaded();
    const rawManifest = await readPluginManifestFromPath(options.pluginPath);
    const manifest = normalizeManifest(rawManifest, options.pluginPath, options.pluginId);
    await this.assertCompatibility(manifest);

    const previousState = this.states.get(manifest.id);
    let definition: PluginDefinition | null = null;

    const runtimeEntry = await findRuntimeEntry(options.pluginPath, manifest.entry);
    if (runtimeEntry) {
      const imported = await loadPluginModule(runtimeEntry);
      definition = imported.default ?? imported.plugin ?? null;
      if (definition) {
        this.runtimeDefinitions.set(manifest.id, definition);
        await this.runInstallLifecycle(manifest.id, options.pluginPath, definition, previousState);
      }
    }

    const timestamp = new Date().toISOString();
    const state: InstalledPluginState = {
      id: manifest.id,
      sourcePath: options.pluginPath,
      manifest,
      installedAt: previousState?.installedAt ?? timestamp,
      updatedAt: timestamp,
      active: false,
      runtimeLoaded: Boolean(definition),
      lastError: undefined,
    };

    this.states.set(manifest.id, state);
    await this.persist();
    this.events.emit("plugin:installed", { pluginId: manifest.id, version: manifest.version });

    if (options.autoActivate) {
      return this.activatePlugin(manifest.id);
    }

    return state;
  }

  async activatePlugin(pluginId: string): Promise<InstalledPluginState> {
    await this.ensureLoaded();
    const state = this.states.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} is not installed.`);
    }

    if (state.active) {
      return state;
    }

    await this.assertCompatibility(state.manifest);
    this.registerDeclarativeCapabilities(state);

    try {
      const definition = await this.loadRuntimeDefinition(state);
      if (definition) {
        this.runtimeDefinitions.set(pluginId, definition);
        const runtime = this.createContext(state);
        await runtime.configStore.preload();

        if (definition.lifecycle.onActivate) {
          await withTimeout(
            definition.lifecycle.onActivate(runtime.context),
            `Plugin ${pluginId} activation`
          );
        }

        if (definition.lifecycle.onHealthCheck) {
          this.healthMonitor.register(pluginId, () => definition.lifecycle.onHealthCheck!(runtime.context));
        }

        this.activeRuntime.set(pluginId, runtime);
        state.runtimeLoaded = true;
      } else {
        state.runtimeLoaded = false;
      }

      state.active = true;
      state.activatedAt = new Date().toISOString();
      state.updatedAt = state.activatedAt;
      state.lastError = undefined;
      this.states.set(pluginId, state);
      await this.persist();

      const componentCount = this.components.list().filter((entry) => entry.pluginId === pluginId).length;
      const hookCount = state.manifest.capabilities.hooks?.length ?? 0;
      this.events.emit("plugin:activated", { pluginId, componentCount, hookCount });

      return state;
    } catch (error) {
      this.components.unregisterPlugin(pluginId);
      this.hooks.unregisterPlugin(pluginId);
      this.schemas.unregisterPlugin(pluginId);
      this.renderers.unregisterPlugin(pluginId);
      this.healthMonitor.unregister(pluginId);
      this.events.emit("plugin:error", {
        pluginId,
        lifecycle: "activate",
        error: error instanceof Error ? error.message : String(error),
      });
      state.active = false;
      state.runtimeLoaded = false;
      state.updatedAt = new Date().toISOString();
      state.lastError = error instanceof Error ? error.message : String(error);
      this.states.set(pluginId, state);
      await this.persist();
      throw error;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<InstalledPluginState> {
    await this.ensureLoaded();
    const state = this.states.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} is not installed.`);
    }

    const runtime = this.activeRuntime.get(pluginId);
    if (runtime) {
      await withTimeout(
        runtime.definition.lifecycle.onDeactivate?.(runtime.context) ?? Promise.resolve(),
        `Plugin ${pluginId} deactivation`
      );
      runtime.cleanup();
      runtime.events.clear();
      this.activeRuntime.delete(pluginId);
    }

    this.components.unregisterPlugin(pluginId);
    this.hooks.unregisterPlugin(pluginId);
    this.schemas.unregisterPlugin(pluginId);
    this.renderers.unregisterPlugin(pluginId);
    this.healthMonitor.unregister(pluginId);

    state.active = false;
    state.runtimeLoaded = false;
    state.updatedAt = new Date().toISOString();
    this.states.set(pluginId, state);
    await this.persist();
    this.events.emit("plugin:deactivated", { pluginId });
    return state;
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    await this.ensureLoaded();
    const state = this.states.get(pluginId);
    if (!state) {
      return;
    }

    if (state.active) {
      await this.deactivatePlugin(pluginId);
    }

    const definition = await this.loadRuntimeDefinition(state);
    if (definition?.lifecycle.onUninstall) {
      const { context, configStore } = createInstallContext(pluginId, state.sourcePath);
      await configStore.preload();
      await withTimeout(definition.lifecycle.onUninstall(context), `Plugin ${pluginId} uninstall`);
    }

    this.states.delete(pluginId);
    this.runtimeDefinitions.delete(pluginId);
    this.activeRuntime.delete(pluginId);
    this.components.unregisterPlugin(pluginId);
    this.hooks.unregisterPlugin(pluginId);
    this.schemas.unregisterPlugin(pluginId);
    this.renderers.unregisterPlugin(pluginId);
    this.healthMonitor.unregister(pluginId);
    await this.persist();
  }

  async listPlugins(): Promise<InstalledPluginState[]> {
    await this.ensureLoaded();
    return [...this.states.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  async listPluginDiscovery(): Promise<PluginDiscoveryInfo[]> {
    const plugins = await this.listPlugins();
    return plugins.map((state) => ({
      id: state.id,
      name: state.manifest.name,
      version: state.manifest.version,
      description: state.manifest.description,
      author: state.manifest.author,
      compatibility: state.manifest.compatibility,
      keywords: state.manifest.keywords,
      dependencies: state.manifest.dependencies,
      peerDependencies: state.manifest.peerDependencies,
    }));
  }

  async getPluginDiscovery(pluginId: string): Promise<PluginDiscoveryInfo | null> {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) {
      return null;
    }

    return {
      id: plugin.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      compatibility: plugin.manifest.compatibility,
      keywords: plugin.manifest.keywords,
      dependencies: plugin.manifest.dependencies,
      peerDependencies: plugin.manifest.peerDependencies,
    };
  }
  async getPlugin(pluginId: string): Promise<InstalledPluginState | null> {
    await this.ensureLoaded();
    return this.states.get(pluginId) ?? null;
  }

  async getPluginDependencies(pluginId: string): Promise<string[]> {
    await this.ensureLoaded();
    const state = this.states.get(pluginId);
    if (!state) {
      return [];
    }

    return [...Object.keys(state.manifest.dependencies), ...Object.keys(state.manifest.peerDependencies)].sort(
      (left, right) => left.localeCompare(right)
    );
  }

  async getPluginHealth(pluginId: string): Promise<PluginHealthStatus> {
    await this.ensureLoaded();
    const state = this.states.get(pluginId);
    if (!state) {
      return {
        status: "unhealthy",
        message: "Plugin not installed",
        checkedAt: new Date().toISOString(),
      };
    }

    if (!state.active) {
      return {
        status: "degraded",
        message: "Plugin is installed but inactive",
        checkedAt: new Date().toISOString(),
      };
    }

    const lastStatus = this.healthMonitor.getLastStatus()[pluginId];
    if (lastStatus) {
      return lastStatus;
    }

    return {
      status: state.lastError ? "unhealthy" : "healthy",
      message: state.lastError ?? "Plugin is active",
      checkedAt: new Date().toISOString(),
    };
  }
}

export const pluginHost = new PluginHost();

export async function safeActivatePlugin(pluginId: string): Promise<InstalledPluginState | null> {
  try {
    return await pluginHost.activatePlugin(pluginId);
  } catch (error) {
    logger.error({
      message: `Failed to activate plugin ${pluginId}`,
      error,
    });
    return null;
  }
}






























