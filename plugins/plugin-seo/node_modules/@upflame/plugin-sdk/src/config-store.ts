import { readFile, writeFile, mkdir, rename, unlink } from "fs/promises";
import path from "path";
import type { SdkConfigStore } from "./types";

export class PluginConfigStore implements SdkConfigStore {
  private readonly storePath: string;
  private cache: Map<string, unknown> | null = null;
  private dirty = false;

  constructor(pluginId: string, baseDir?: string) {
    const base = baseDir ?? path.join(process.cwd(), "data", "plugins");
    this.storePath = path.join(base, pluginId, "config.json");
  }

  private async load(): Promise<Map<string, unknown>> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await readFile(this.storePath, "utf-8");
      const data = JSON.parse(content) as Record<string, unknown>;
      this.cache = new Map(Object.entries(data));
    } catch {
      this.cache = new Map();
    }

    return this.cache;
  }

  private async flush(): Promise<void> {
    if (!this.dirty || !this.cache) {
      return;
    }

    const data = Object.fromEntries(this.cache.entries());
    const content = JSON.stringify(data, null, 2);
    const tmp = `${this.storePath}.tmp.${Date.now()}`;

    try {
      await mkdir(path.dirname(this.storePath), { recursive: true });
      await writeFile(tmp, content, "utf-8");
      await rename(tmp, this.storePath);
      this.dirty = false;
    } catch (error) {
      try {
        await unlink(tmp);
      } catch {
        // Cleanup is best effort.
      }
      throw error;
    }
  }

  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, defaultValue: T): T;
  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const val = this.cache?.get(key);
    return (val !== undefined ? val : defaultValue) as T | undefined;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const store = await this.load();
    store.set(key, value);
    this.dirty = true;
    await this.flush();
  }

  has(key: string): boolean {
    return this.cache?.has(key) ?? false;
  }

  async delete(key: string): Promise<void> {
    const store = await this.load();
    store.delete(key);
    this.dirty = true;
    await this.flush();
  }

  getAll(): Record<string, unknown> {
    return this.cache ? Object.fromEntries(this.cache.entries()) : {};
  }

  async preload(): Promise<void> {
    await this.load();
  }
}
