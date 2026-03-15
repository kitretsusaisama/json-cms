import { cache } from "react";
import { z } from "zod";
import { safeRootJoin, safeJsonRead, safeJsonWrite } from "@/lib/fs-safe";

// Settings schemas
export const AppSettingsSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  domain: z.string().url(),
  environment: z.enum(["development", "preview", "production"]),
  features: z.object({
    seo: z.boolean(),
    jsonPages: z.boolean(),
    pwa: z.boolean(),
    ai: z.boolean(),
    analytics: z.boolean(),
  }),
  security: z.object({
    csp: z.boolean(),
    hsts: z.boolean(),
    rateLimit: z.boolean(),
    auditLog: z.boolean(),
  }),
  performance: z.object({
    cache: z.boolean(),
    compression: z.boolean(),
    minification: z.boolean(),
  }),
  i18n: z.object({
    defaultLocale: z.string(),
    supportedLocales: z.array(z.string()),
    fallbackLocale: z.string(),
  }),
  theme: z.object({
    default: z.string(),
    supported: z.array(z.string()),
  }),
  contact: z.object({
    email: z.string().email(),
    phone: z.string(),
    address: z.string(),
  }),
  social: z.object({
    twitter: z.string(),
    linkedin: z.string(),
    github: z.string(),
  }),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

// Generic settings interface
export interface SettingsStore {
  get<T>(area: string, key?: string): Promise<T | null>;
  set<T>(area: string, key: string, data: T): Promise<void>;
  list(area: string): Promise<string[]>;
}

// File system implementation
export const fsSettingsStore: SettingsStore = {
  async get<T>(area: string, key?: string): Promise<T | null> {
    const filePath = key
      ? safeRootJoin("settings", area, `${key}.json`)
      : safeRootJoin("settings", `${area}.json`);

    return await safeJsonRead(filePath, z.any());
  },

  async set<T>(area: string, key: string, data: T): Promise<void> {
    const filePath = safeRootJoin("settings", area, `${key}.json`);
    await safeJsonWrite(filePath, data, z.any());
  },

  async list(area: string): Promise<string[]> {
    const dir = safeRootJoin("settings", area);
    try {
      const fs = await import("fs/promises");
      const files = await fs.readdir(dir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch {
      return [];
    }
  },
};

// Cached getter for RSC usage
export const getSetting = cache(async <T>(area: string, key?: string): Promise<T | null> => {
  return await fsSettingsStore.get<T>(area, key);
});

// Helper for app settings specifically
export const getAppSettings = cache(async (): Promise<AppSettings | null> => {
  return await getSetting<AppSettings>("app");
});

// Helper for updating settings
export async function updateSetting<T>(
  area: string,
  key: string,
  data: T
): Promise<void> {
  await fsSettingsStore.set(area, key, data);
} 