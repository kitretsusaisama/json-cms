import { PageV2, Block } from "@/types/composer";
import { RefUtils } from "@/types/refs";
import { readFile } from "fs/promises";
import { createHash } from "crypto";
import { join } from "path";
import { assertSafeId } from "@/lib/security";
import { resolverCache } from "./cache";
import { getDataProvider } from "./data-provider";
import {
  blockToRuntime,
  normalizeBlockDocument,
  normalizePageDocument,
  pageToRuntime,
} from "@/core/content/service";
import { findExistingDataPath, getReadableDataRoots } from "@/core/content/paths";

export interface ResolveContext {
  site?: string;
  env?: string;
  locale?: string;
  preview?: boolean;
}

export interface LoadedData {
  page: PageV2;
  blocks: Record<string, Block>;
  warnings: string[];
}

interface ApplyOverlaysOptions {
  targetPath: string;
  ctx: ResolveContext;
  warnings: string[];
}

const tokenMemo = new Map<string, Record<string, unknown>>();
const i18nMemo = new Map<string, Record<string, unknown>>();

async function readJsonFromRoots(relativePath: string): Promise<Record<string, unknown> | null> {
  const segments = relativePath.split("/");
  const foundPath = await findExistingDataPath(...segments);
  if (!foundPath) {
    return null;
  }

  const content = await readFile(foundPath, "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}

async function loadTokens(): Promise<Record<string, unknown>> {
  const cacheKey = "tokens";
  const cached = tokenMemo.get(cacheKey);
  if (cached) {
    return cached;
  }

  const tokens = (await readJsonFromRoots("settings/tokens.json")) ?? {};
  tokenMemo.set(cacheKey, tokens);
  return tokens;
}

async function loadI18n(locale: string): Promise<Record<string, unknown>> {
  const cached = i18nMemo.get(locale);
  if (cached) {
    return cached;
  }

  const messages = (await readJsonFromRoots(`settings/i18n/${locale}.json`)) ?? {};
  i18nMemo.set(locale, messages);
  return messages;
}

function dotGet(obj: Record<string, unknown>, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, obj);
}

export async function loadResolvedPage(
  slug: string,
  ctx: Record<string, unknown>,
  resolveCtx: ResolveContext = {}
): Promise<LoadedData> {
  assertSafeId(slug.replace(/\//g, "_"), "page slug");
  const warnings: string[] = [];

  const basePage = await loadPageJson(slug);
  const overlaidPage = await applyOverlays(basePage, {
    targetPath: `pages/${slug}`,
    ctx: resolveCtx,
    warnings,
  });
  const page = pageToRuntime(normalizePageDocument(overlaidPage, slug));

  const blockResults = await Promise.allSettled(
    page.blocks.map(async (blockId) => {
      assertSafeId(blockId.replace(/\//g, "_"), "block ID");
      const block = await loadBlockJson(blockId, resolveCtx);
      return { blockId, block } as const;
    })
  );

  const blocks: Record<string, Block> = {};
  for (const result of blockResults) {
    if (result.status === "fulfilled") {
      blocks[result.value.blockId] = result.value.block;
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      warnings.push(`Failed to load block: ${reason}`);
    }
  }

  const [resolvedPage, ...resolvedBlocks] = await Promise.all([
    resolveReferences(page, ctx, resolveCtx) as Promise<PageV2>,
    ...Object.values(blocks).map((block) => resolveReferences(block, ctx, resolveCtx) as Promise<Block>),
  ]);

  const resolvedBlockMap: Record<string, Block> = {};
  Object.keys(blocks).forEach((blockId, index) => {
    resolvedBlockMap[blockId] = resolvedBlocks[index];
  });

  return {
    page: resolvedPage,
    blocks: resolvedBlockMap,
    warnings,
  };
}

async function loadPageJson(slug: string): Promise<Record<string, unknown>> {
  const pagePath = await findExistingDataPath("pages", `${slug}.json`);
  if (!pagePath) {
    throw new Error(`Page not found: \"${slug}\". Check data/pages/${slug}.json or src/data/pages/${slug}.json.`);
  }

  return JSON.parse(await readFile(pagePath, "utf-8")) as Record<string, unknown>;
}

async function loadBlockJson(blockId: string, ctx: ResolveContext): Promise<Block> {
  const blockPath = await findExistingDataPath("blocks", `${blockId}.json`);
  if (!blockPath) {
    throw new Error(`Block not found: \"${blockId}\". Check data/blocks/${blockId}.json or src/data/blocks/${blockId}.json.`);
  }

  const baseBlock = JSON.parse(await readFile(blockPath, "utf-8")) as Record<string, unknown>;
  const overlaidBlock = await applyOverlays(baseBlock, {
    targetPath: `blocks/${blockId}`,
    ctx,
    warnings: [],
  });

  return blockToRuntime(normalizeBlockDocument(overlaidBlock, blockId));
}

async function applyOverlays(
  base: Record<string, unknown>,
  options: ApplyOverlaysOptions
): Promise<Record<string, unknown>> {
  const { targetPath, ctx, warnings } = options;
  const overlayOrder = [
    ctx.site ? `site-${ctx.site}` : null,
    ctx.env ? `env-${ctx.env}` : null,
    ctx.locale ? `locale-${ctx.locale}` : null,
    ctx.preview ? "preview" : null,
  ].filter((value): value is string => Boolean(value));

  let result = { ...base };

  for (const overlay of overlayOrder) {
    const overlayRelative = `overlays/${overlay}/${targetPath}.json`;
    const overlayJson = await readJsonFromRoots(overlayRelative);
    if (!overlayJson) {
      continue;
    }

    try {
      result = applyJsonMergePatch(result, overlayJson) as Record<string, unknown>;
    } catch (error) {
      warnings.push(
        `Failed to apply overlay \"${overlay}\" to \"${targetPath}\": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

function applyJsonMergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null) {
    return null;
  }
  if (typeof patch !== "object" || Array.isArray(patch)) {
    return patch;
  }

  const result: Record<string, unknown> =
    target && typeof target === "object" && !Array.isArray(target)
      ? { ...(target as Record<string, unknown>) }
      : {};

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = applyJsonMergePatch(result[key], value);
    }
  }

  return result;
}

async function resolveReferences(
  obj: unknown,
  ctx: Record<string, unknown>,
  resolveCtx: ResolveContext
): Promise<unknown> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    if (RefUtils.isTokenRef(obj)) {
      return resolveToken(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => resolveReferences(item, ctx, resolveCtx)));
  }

  if (typeof obj === "object") {
    if (RefUtils.isPointer(obj)) {
      return resolvePointer(obj.$ref, ctx, resolveCtx);
    }
    if (RefUtils.isI18nRef(obj)) {
      return resolveI18n(obj.$i18n, resolveCtx);
    }
    if (RefUtils.isDataRef(obj)) {
      return resolveDataRef(obj.dataRef, ctx);
    }

    const entries = Object.entries(obj as Record<string, unknown>);
    const resolvedValues = await Promise.all(
      entries.map(([, value]) => resolveReferences(value, ctx, resolveCtx))
    );

    return Object.fromEntries(entries.map(([key], index) => [key, resolvedValues[index]]));
  }

  return obj;
}

async function resolveToken(tokenRef: string): Promise<string> {
  try {
    const { path } = RefUtils.parseRef(tokenRef);
    const tokens = await loadTokens();
    const value = dotGet(tokens, path);
    return value !== undefined ? String(value) : tokenRef;
  } catch {
    return tokenRef;
  }
}

async function resolvePointer(
  ref: string,
  ctx: Record<string, unknown>,
  resolveCtx: ResolveContext
): Promise<unknown> {
  try {
    const { type, path: refPath } = RefUtils.parseRef(ref);
    assertSafeId(refPath.replace(/\//g, "_"), `${type} ref path`);

    switch (type) {
      case "block":
        return loadBlockJson(refPath, resolveCtx);
      case "snippet":
        return loadSnippet(refPath);
      case "settings":
        return loadSetting(refPath);
      case "seo":
        return getDataProvider().getSEO(refPath, ctx);
      case "data":
        return resolveExternalData(refPath, ctx);
      default:
        throw new Error(`Unknown reference type: \"${type}\"`);
    }
  } catch {
    return { _resolveError: `Failed to resolve: ${ref}` };
  }
}

async function resolveI18n(key: string, ctx: ResolveContext): Promise<string> {
  try {
    const locale = ctx.locale ?? "en";
    const messages = await loadI18n(locale);
    const value = dotGet(messages, key);
    return value !== undefined ? String(value) : key;
  } catch {
    return key;
  }
}

async function resolveDataRef(
  dataRef: { source: string; key: string; transform?: string },
  ctx: Record<string, unknown>
): Promise<unknown> {
  const provider = getDataProvider();
  try {
    switch (dataRef.source) {
      case "seo":
        return provider.getSEO(dataRef.key, ctx);
      case "product":
        return provider.getProduct(dataRef.key, ctx);
      case "user":
        return (ctx.user as Record<string, unknown>) ?? null;
      case "inventory":
        return provider.getInventory(dataRef.key);
      case "cms":
        return provider.getCMSContent(dataRef.key);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function resolveExternalData(pathValue: string, _ctx: Record<string, unknown>): Promise<unknown> {
  const [source, ...keys] = pathValue.split(".");
  switch (source) {
    case "cms":
      return getDataProvider().getCMSContent(keys.join("."));
    default:
      return null;
  }
}

async function loadSnippet(snippetPath: string): Promise<unknown> {
  const data = await readJsonFromRoots(`snippets/${snippetPath}.json`);
  if (!data) {
    throw new Error(`Snippet not found: ${snippetPath}`);
  }
  return data;
}

async function loadSetting(settingPath: string): Promise<unknown> {
  const [file, ...keys] = settingPath.split(".");
  assertSafeId(file, "settings file");
  const settings = await readJsonFromRoots(`settings/${file}.json`);
  return settings ? dotGet(settings, keys.join(".")) : null;
}

export function generateCacheKey(
  slug: string,
  ctx: Record<string, unknown>,
  resolveCtx: ResolveContext
): string {
  const payload = JSON.stringify({
    slug,
    site: resolveCtx.site,
    env: resolveCtx.env,
    locale: resolveCtx.locale,
    preview: resolveCtx.preview,
    userId: (ctx.user as Record<string, unknown> | undefined)?.id ?? null,
    abBucket: ctx.abBucket ?? null,
    roots: getReadableDataRoots(),
  });
  return `page:${createHash("sha1").update(payload).digest("hex").slice(0, 16)}`;
}

export function cachedLoadPage(
  slug: string,
  ctx: Record<string, unknown>,
  resolveCtx: ResolveContext,
  ttlMs?: number
): Promise<LoadedData> {
  const key = generateCacheKey(slug, ctx, resolveCtx);
  return resolverCache.resolve(key, () => loadResolvedPage(slug, ctx, resolveCtx), ttlMs);
}
