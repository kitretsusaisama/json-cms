/**
 * Plugin SDK — Config Store
 *
 * Scoped key-value store for plugin configuration.
 * Data is persisted to the data/plugins/<pluginId>/config.json file.
 * All writes are atomic (temp file + rename).
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { SdkConfigStore } from "./types";

export class PluginConfigStore implements SdkConfigStore {
  private readonly storePath: string;
  private cache: Map<string, unknown> | null = null;
  private dirty = false;

  constructor(pluginId: string, baseDir?: string) {
    const base = baseDir ?? join(process.cwd(), "data", "plugins");
    this.storePath = join(base, pluginId, "config.json");
  }

  /** Load config from disk (lazy, cached per instance) */
  private async load(): Promise<Map<string, unknown>> {
    if (this.cache) return this.cache;

    try {
      const content = await readFile(this.storePath, "utf-8");
      const data = JSON.parse(content) as Record<string, unknown>;
      this.cache = new Map(Object.entries(data));
    } catch {
      this.cache = new Map();
    }

    return this.cache;
  }

  /** Flush dirty config to disk atomically */
  private async flush(): Promise<void> {
    if (!this.dirty || !this.cache) return;

    const data = Object.fromEntries(this.cache.entries());
    const content = JSON.stringify(data, null, 2);
    const tmp = `${this.storePath}.tmp.${Date.now()}`;

    try {
      await mkdir(join(this.storePath, ".."), { recursive: true });
      await writeFile(tmp, content, "utf-8");
      const { rename } = await import("fs/promises");
      await rename(tmp, this.storePath);
      this.dirty = false;
    } catch (err) {
      try {
        const { unlink } = await import("fs/promises");
        await unlink(tmp);
      } catch {
        // cleanup best-effort
      }
      throw err;
    }
  }

  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, defaultValue: T): T;
  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    if (!this.cache) return defaultValue;
    const val = this.cache.get(key);
    return (val !== undefined ? val : defaultValue) as T | undefined;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const store = await this.load();
    store.set(key, value);
    this.dirty = true;
    await this.flush();
  }

  has(key: string): boolean {
    if (!this.cache) return false;
    return this.cache.has(key);
  }

  async delete(key: string): Promise<void> {
    const store = await this.load();
    store.delete(key);
    this.dirty = true;
    await this.flush();
  }

  getAll(): Record<string, unknown> {
    if (!this.cache) return {};
    return Object.fromEntries(this.cache.entries());
  }

  /** Pre-load the config from disk (call once during plugin activation) */
  async preload(): Promise<void> {
    await this.load();
  }
}
