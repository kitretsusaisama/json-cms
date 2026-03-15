import { readFile } from "fs/promises";
import { join } from "path";
import { assertSafeId } from "@/lib/security";
import { findExistingDataPath, getCanonicalDataRoot } from "@/core/content/paths";

export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

export interface ProductData {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  images: string[];
  [key: string]: unknown;
}

export interface InventoryData {
  inStock: boolean;
  quantity: number;
  reserved: number;
}

export interface DataProvider {
  getSEO(key: string, ctx?: Record<string, unknown>): Promise<SEOData | null>;
  getProduct(key: string, ctx?: Record<string, unknown>): Promise<ProductData | null>;
  getInventory(key: string): Promise<InventoryData | null>;
  getCMSContent(key: string): Promise<Record<string, unknown> | null>;
}

export class FileSystemDataProvider implements DataProvider {
  private readonly dataDir: string;

  constructor(dataDir = getCanonicalDataRoot()) {
    this.dataDir = dataDir;
  }

  async getSEO(key: string): Promise<SEOData | null> {
    try {
      assertSafeId(key.replace(/\//g, "_"), "SEO key");
      const filePath =
        (await findExistingDataPath("seoData", `${key}.json`)) ??
        join(this.dataDir, "seoData", `${key}.json`);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as SEOData;
    } catch {
      return null;
    }
  }

  async getProduct(key: string): Promise<ProductData | null> {
    try {
      assertSafeId(key, "product key");
      const filePath =
        (await findExistingDataPath("products", `${key}.json`)) ??
        join(this.dataDir, "products", `${key}.json`);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as ProductData;
    } catch {
      return null;
    }
  }

  async getInventory(key: string): Promise<InventoryData | null> {
    try {
      assertSafeId(key, "inventory key");
      const filePath =
        (await findExistingDataPath("inventory", `${key}.json`)) ??
        join(this.dataDir, "inventory", `${key}.json`);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as InventoryData;
    } catch {
      return null;
    }
  }

  async getCMSContent(key: string): Promise<Record<string, unknown> | null> {
    try {
      const safeParts = key.split("/").map((segment) => {
        assertSafeId(segment, "CMS key segment");
        return segment;
      });
      const filePath =
        (await findExistingDataPath("content", ...safeParts.slice(0, -1), `${safeParts.at(-1)}.json`)) ??
        `${join(this.dataDir, "content", ...safeParts)}.json`;
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

let provider: DataProvider | null = null;

export function getDataProvider(): DataProvider {
  if (!provider) {
    provider = new FileSystemDataProvider();
  }
  return provider;
}

export function setDataProvider(nextProvider: DataProvider): void {
  provider = nextProvider;
}
