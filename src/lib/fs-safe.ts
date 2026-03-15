import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { logger } from "./logger";
import { getCanonicalDataRoot } from "@/core/content/paths";

const DATA_ROOT = getCanonicalDataRoot();

export function safeRootJoin(...paths: string[]): string {
  const joined = path.join(DATA_ROOT, ...paths);
  const normalized = path.normalize(joined);

  if (!normalized.startsWith(DATA_ROOT)) {
    throw new Error("Path traversal attempt detected");
  }

  return normalized;
}

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, content, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors.
    }
    throw error;
  }
}

export async function safeJsonRead<S extends z.ZodTypeAny>(
  filePath: string,
  schema: S
): Promise<z.infer<S> | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({
        message: `Schema validation failed for ${filePath}`,
        context: { filePath, issues: error.errors },
      });
    }
    return null;
  }
}

export async function safeJsonWrite<T>(
  filePath: string,
  data: T,
  schema: z.ZodSchema<T>
): Promise<void> {
  const validated = schema.parse(data);
  const content = JSON.stringify(validated, null, 2);
  await atomicWrite(filePath, content);
}

export async function safeFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function safeListFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter((file) => file.endsWith(".json"));
  } catch {
    return [];
  }
}

export const getSafeJson = cache(safeJsonRead);
