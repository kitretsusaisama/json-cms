import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import { SeoRecordSchema, type SeoType, type SeoRecord } from "@/types/seo";
import { atomicWrite, safeJsonRead } from "@/lib/fs-safe";
import { findExistingDataPath, getCanonicalDataPath, getLegacyDataRoot } from "@/core/content/paths";

const LEGACY_SEO_ROOT = path.resolve(getLegacyDataRoot(), "seo");

async function readSeoJson(type: SeoType, id: string): Promise<SeoRecord | null> {
  const primary =
    (await findExistingDataPath("seoData", type, `${id}.json`)) ??
    getCanonicalDataPath("seoData", type, `${id}.json`);
  const fromPrimary = await safeJsonRead(primary, SeoRecordSchema);
  if (fromPrimary) {
    return fromPrimary;
  }

  const legacyPath = path.join(LEGACY_SEO_ROOT, type, `${id}.json`);
  return safeJsonRead(legacyPath, SeoRecordSchema);
}

export const fsSeoStore = {
  async get(type: SeoType, id: string) {
    return readSeoJson(type, id);
  },

  async set(type: SeoType, id: string, data: SeoRecord) {
    const parsed = SeoRecordSchema.parse(data);
    const filePath = getCanonicalDataPath("seoData", type, `${id}.json`);
    await atomicWrite(filePath, JSON.stringify(parsed, null, 2));
  },

  async list(type: SeoType) {
    try {
      const primaryDir = getCanonicalDataPath("seoData", type);
      const files = await fs.readdir(primaryDir);
      return files.filter((file) => file.endsWith(".json")).map((file) => file.replace(".json", ""));
    } catch {
      try {
        const files = await fs.readdir(path.join(LEGACY_SEO_ROOT, type));
        return files.filter((file) => file.endsWith(".json")).map((file) => file.replace(".json", ""));
      } catch {
        return [];
      }
    }
  },
};

export const getSeo = cache((type: SeoType, id: string) => fsSeoStore.get(type, id));

export async function getSeoWithDefaults(type: SeoType, id: string): Promise<SeoRecord | null> {
  const specific = await getSeo(type, id);
  if (specific) {
    return specific;
  }

  const defaults = await getSeo("page", "_defaults");
  if (defaults) {
    return {
      ...defaults,
      id,
      type,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}
