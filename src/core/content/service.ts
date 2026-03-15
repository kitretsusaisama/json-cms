import { promises as fs } from "fs";
import path from "path";
import { Block, ComponentInstance, PageV2 } from "@/types/composer";
import {
  CmsBlockDocument,
  CmsBlockSchema,
  CmsPageDocument,
  CmsPageSchema,
  ComponentInput,
  WorkflowStatus,
} from "./schemas";
import {
  findExistingDataPath,
  getCanonicalDataPath,
  getPreferredWritePath,
  getReadableDataRoots,
  getRelativeSlugFromPath,
} from "./paths";
import { logger } from "@/lib/logger";

export type RuntimeComponentRecord = ComponentInstance & Record<string, unknown>;
export type RuntimeBlockRecord = Block & {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  workflow?: Record<string, unknown>;
};

export interface PageListFilters {
  status?: WorkflowStatus;
  limit?: number;
  offset?: number;
  query?: string;
}

export interface BlockListFilters {
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  query?: string;
}

export interface PageSummary {
  slug: string;
  title: string;
  status: WorkflowStatus;
  description?: string;
  updatedAt?: string;
  blockCount: number;
}

export interface BlockSummary {
  id: string;
  name: string;
  category?: string;
  tags: string[];
  updatedAt?: string;
  componentCount: number;
}

interface WriteActor {
  userId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeContentSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function nowIso(): string {
  return new Date().toISOString();
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function deriveComponentId(raw: Record<string, unknown>, fallbackPrefix: string): string {
  if (typeof raw.id === "string" && raw.id.trim()) {
    return raw.id;
  }

  const key =
    (typeof raw.key === "string" && raw.key) ||
    (typeof raw.componentType === "string" && raw.componentType) ||
    (typeof raw.type === "string" && raw.type) ||
    "component";

  return `${fallbackPrefix}-${normalizeContentSlug(key)}`;
}

export function normalizeComponentInput(
  input: ComponentInput | Record<string, unknown>,
  fallbackPrefix: string
): RuntimeComponentRecord {
  const raw = isRecord(input) ? input : {};
  const parsedInput: Record<string, unknown> & { props: Record<string, unknown> } = {
    ...raw,
    props: isRecord(raw.props) ? raw.props : isRecord(raw.content) ? raw.content : {},
  };

  const key =
    (typeof parsedInput.key === "string" && parsedInput.key) ||
    (typeof parsedInput.componentType === "string" && parsedInput.componentType) ||
    (typeof parsedInput.type === "string" && parsedInput.type) ||
    "TextBlock";
  const id = deriveComponentId(parsedInput, fallbackPrefix);

  const rawSlots = Array.isArray(parsedInput.slots) ? parsedInput.slots : [];
  const slotIds: string[] = [];
  const slotEntries = rawSlots.map((slot: unknown, index: number) => {
    const slotRecord = isRecord(slot) ? slot : {};
    const slotName =
      typeof slotRecord.name === "string" && slotRecord.name.trim()
        ? slotRecord.name
        : `slot-${index + 1}`;
    const slotItems = Array.isArray(slotRecord.items)
      ? slotRecord.items.map((item, itemIndex) =>
          normalizeComponentInput(
            isRecord(item) ? item : {},
            `${id}-${slotName}-${itemIndex + 1}`
          )
        )
      : [];

    slotIds.push(slotName);

    return {
      name: slotName,
      accepts: Array.isArray(slotRecord.accepts)
        ? slotRecord.accepts.filter(
            (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0
          )
        : [],
      items: slotItems,
    };
  });

  const runtime = ComponentInstance.parse({
    id,
    key,
    props: parsedInput.props,
    variant: typeof parsedInput.variant === "string" ? parsedInput.variant : undefined,
    variants: Array.isArray(parsedInput.variants) ? parsedInput.variants : undefined,
    slotIds: slotIds.length > 0 ? slotIds : undefined,
    conditions: Array.isArray(parsedInput.conditions) ? parsedInput.conditions : undefined,
    weight: typeof parsedInput.weight === "number" ? parsedInput.weight : 1,
    analytics: isRecord(parsedInput.analytics) ? parsedInput.analytics : undefined,
  }) as RuntimeComponentRecord;

  for (const slot of slotEntries) {
    runtime[`${slot.name}Items`] = slot.items;
  }

  if (slotEntries.length > 0) {
    runtime.slots = slotEntries;
  }

  if (Array.isArray(parsedInput.children) && parsedInput.children.length > 0) {
    runtime.children = parsedInput.children.map((child: unknown, index: number) =>
      normalizeComponentInput(isRecord(child) ? child : {}, `${id}-child-${index + 1}`)
    );
  }

  return runtime;
}

export function normalizeBlockDocument(input: unknown, idHint?: string): CmsBlockDocument {
  const rawRecord = isRecord(input) ? input : {};
  const raw = CmsBlockSchema.parse({
    ...rawRecord,
    id: (typeof rawRecord.id === "string" && rawRecord.id) || idHint || "block",
  });

  const tree =
    Array.isArray(raw.tree) && raw.tree.length > 0
      ? raw.tree
      : isRecord(raw.content) && Array.isArray(raw.content.tree)
        ? raw.content.tree
        : isRecord(raw.content)
          ? [raw.content]
          : [];

  return {
    ...raw,
    id: raw.id,
    name: raw.name ?? raw.id,
    tags: raw.tags ?? [],
    tree,
    workflow: {
      status: raw.workflow?.status ?? "draft",
      version: raw.workflow?.version ?? 1,
      createdAt: raw.workflow?.createdAt,
      createdBy: raw.workflow?.createdBy,
      updatedAt: raw.workflow?.updatedAt,
      updatedBy: raw.workflow?.updatedBy,
      publishedAt: raw.workflow?.publishedAt,
    },
  };
}

export function normalizePageDocument(input: unknown, slugHint?: string): CmsPageDocument {
  const raw = CmsPageSchema.parse(isRecord(input) ? input : {});
  const slug = normalizeContentSlug(raw.slug || slugHint || raw.id || raw.title || "page");

  return {
    ...raw,
    id: raw.id ?? slug,
    slug,
    prepend: raw.prepend ?? [],
    append: raw.append ?? [],
    blocks: raw.blocks ?? [],
    metadata: raw.metadata ?? {},
    permissions: raw.permissions ?? [],
    workflow: {
      status: raw.workflow?.status ?? "draft",
      version: raw.workflow?.version ?? 1,
      createdAt: raw.workflow?.createdAt,
      createdBy: raw.workflow?.createdBy,
      updatedAt: raw.workflow?.updatedAt,
      updatedBy: raw.workflow?.updatedBy,
      publishedAt: raw.workflow?.publishedAt,
    },
  };
}

export function pageToRuntime(page: CmsPageDocument): PageV2 {
  const runtimeBlocks = page.blocks
    .map((block) => (typeof block === "string" ? block : normalizeBlockDocument(block).id))
    .filter((value): value is string => Boolean(value));

  const prepend = (page.prepend ?? []).map((component, index) =>
    normalizeComponentInput(
      isRecord(component) ? component : {},
      `${page.slug ?? page.id ?? "page"}-prepend-${index + 1}`
    )
  );
  const append = (page.append ?? []).map((component, index) =>
    normalizeComponentInput(
      isRecord(component) ? component : {},
      `${page.slug ?? page.id ?? "page"}-append-${index + 1}`
    )
  );

  const parsed = PageV2.parse({
    id: page.id ?? page.slug ?? "page",
    title: page.title,
    blocks: runtimeBlocks,
    prepend,
    append,
    constraints: page.constraints ?? [],
    context: page.context ?? {},
  });

  return {
    ...parsed,
    prepend,
    append,
  } as PageV2;
}

export function blockToRuntime(block: CmsBlockDocument): RuntimeBlockRecord {
  const tree = block.tree.map((component, index) =>
    normalizeComponentInput(isRecord(component) ? component : {}, `${block.id}-${index + 1}`)
  );

  const parsed = Block.parse({
    id: block.id,
    tree,
    constraints: block.constraints ?? [],
  });

  return {
    ...parsed,
    tree,
    name: block.name,
    description: block.description,
    category: block.category,
    tags: block.tags,
    metadata: block.metadata,
    workflow: block.workflow,
  };
}

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function listJsonFilesRecursively(rootDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
          return listJsonFilesRecursively(fullPath);
        }
        return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
      })
    );

    return files.flat();
  } catch {
    return [];
  }
}

async function listUniqueSlugs(subdir: "pages" | "blocks"): Promise<string[]> {
  const all: string[] = [];

  for (const root of getReadableDataRoots()) {
    const files = await listJsonFilesRecursively(path.join(root, subdir));
    for (const filePath of files) {
      all.push(getRelativeSlugFromPath(path.join(root, subdir), filePath));
    }
  }

  return sortUnique(all);
}

async function resolveReadPath(subdir: "pages" | "blocks", slug: string): Promise<string | null> {
  return findExistingDataPath(subdir, `${slug}.json`);
}

async function resolveDeletePath(subdir: "pages" | "blocks", slug: string): Promise<string> {
  const existing = await resolveReadPath(subdir, slug);
  return existing ?? getPreferredWritePath(subdir, `${slug}.json`);
}

export class CmsContentRepository {
  async readPageDocument(slug: string): Promise<CmsPageDocument | null> {
    const readPath = await resolveReadPath("pages", slug);
    if (!readPath) {
      return null;
    }

    const document = await readJsonFile<unknown>(readPath);
    return normalizePageDocument(document, slug);
  }

  async readBlockDocument(id: string): Promise<CmsBlockDocument | null> {
    const readPath = await resolveReadPath("blocks", id);
    if (!readPath) {
      return null;
    }

    const document = await readJsonFile<unknown>(readPath);
    return normalizeBlockDocument(document, id);
  }

  async listPages(filters: PageListFilters = {}): Promise<{ items: PageSummary[]; total: number; limit: number; offset: number }> {
    const slugs = await listUniqueSlugs("pages");
    const documents = await Promise.all(slugs.map(async (slug) => this.readPageDocument(slug)));

    const query = filters.query?.toLowerCase();
    let items = documents
      .filter((item): item is CmsPageDocument => Boolean(item))
      .filter((page) => (filters.status ? page.workflow.status === filters.status : true))
      .filter((page) => {
        if (!query) {
          return true;
        }

        return (
          page.title.toLowerCase().includes(query) ||
          (page.slug?.toLowerCase().includes(query) ?? false) ||
          (page.description?.toLowerCase().includes(query) ?? false)
        );
      })
      .map<PageSummary>((page) => ({
        slug: page.slug ?? page.id ?? "page",
        title: page.title,
        status: page.workflow.status,
        description: page.description,
        updatedAt: page.workflow.updatedAt,
        blockCount: page.blocks.length,
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug));

    const total = items.length;
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    items = items.slice(offset, offset + limit);

    return { items, total, limit, offset };
  }

  async listBlocks(filters: BlockListFilters = {}): Promise<{ items: BlockSummary[]; total: number; limit: number; offset: number }> {
    const ids = await listUniqueSlugs("blocks");
    const documents = await Promise.all(ids.map(async (id) => this.readBlockDocument(id)));

    const query = filters.query?.toLowerCase();
    let items = documents
      .filter((item): item is CmsBlockDocument => Boolean(item))
      .filter((block) => (filters.category ? block.category === filters.category : true))
      .filter((block) =>
        filters.tags && filters.tags.length > 0 ? filters.tags.some((tag) => block.tags.includes(tag)) : true
      )
      .filter((block) => {
        if (!query) {
          return true;
        }

        return (
          block.id.toLowerCase().includes(query) ||
          (block.name?.toLowerCase().includes(query) ?? false) ||
          (block.description?.toLowerCase().includes(query) ?? false)
        );
      })
      .map<BlockSummary>((block) => ({
        id: block.id,
        name: block.name ?? block.id,
        category: block.category,
        tags: block.tags,
        updatedAt: block.workflow.updatedAt,
        componentCount: block.tree.length,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    const total = items.length;
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    items = items.slice(offset, offset + limit);

    return { items, total, limit, offset };
  }

  async upsertBlock(id: string, input: unknown, actor: WriteActor = {}): Promise<CmsBlockDocument> {
    const existing = await this.readBlockDocument(id);
    const normalized = normalizeBlockDocument(
      {
        ...(existing ?? {}),
        ...(isRecord(input) ? input : {}),
        id,
      },
      id
    );

    const timestamp = nowIso();
    const workflow = {
      ...existing?.workflow,
      ...normalized.workflow,
      version: (existing?.workflow?.version ?? 0) + 1,
      createdAt: existing?.workflow?.createdAt ?? timestamp,
      createdBy: existing?.workflow?.createdBy ?? actor.userId,
      updatedAt: timestamp,
      updatedBy: actor.userId,
    };

    const payload: CmsBlockDocument = {
      ...normalized,
      workflow,
    };

    await writeJsonFile(getCanonicalDataPath("blocks", `${id}.json`), payload);

    return payload;
  }

  async upsertPage(slug: string, input: unknown, actor: WriteActor = {}): Promise<CmsPageDocument> {
    const existing = await this.readPageDocument(slug);
    const normalized = normalizePageDocument(
      {
        ...(existing ?? {}),
        ...(isRecord(input) ? input : {}),
        slug,
      },
      slug
    );

    const materializedBlocks: string[] = [];
    for (const block of normalized.blocks) {
      if (typeof block === "string") {
        materializedBlocks.push(block);
        continue;
      }

      const embedded = normalizeBlockDocument(block);
      const persisted = await this.upsertBlock(embedded.id, embedded, actor);
      materializedBlocks.push(persisted.id);
    }

    const timestamp = nowIso();
    const nextStatus = normalized.workflow.status;
    const workflow = {
      ...existing?.workflow,
      ...normalized.workflow,
      status: nextStatus,
      version: (existing?.workflow?.version ?? 0) + 1,
      createdAt: existing?.workflow?.createdAt ?? timestamp,
      createdBy: existing?.workflow?.createdBy ?? actor.userId,
      updatedAt: timestamp,
      updatedBy: actor.userId,
      publishedAt: nextStatus === "published" ? existing?.workflow?.publishedAt ?? timestamp : normalized.workflow.publishedAt,
    };

    const payload: CmsPageDocument = {
      ...normalized,
      blocks: materializedBlocks,
      workflow,
    };

    await writeJsonFile(getCanonicalDataPath("pages", `${slug}.json`), payload);

    return payload;
  }

  async deletePage(slug: string): Promise<void> {
    const deletePath = await resolveDeletePath("pages", slug);
    await fs.rm(deletePath, { force: true });
  }

  async deleteBlock(id: string): Promise<void> {
    const deletePath = await resolveDeletePath("blocks", id);
    await fs.rm(deletePath, { force: true });
  }

  async findBlockUsage(id: string): Promise<string[]> {
    const pages = await this.listPages({ limit: Number.MAX_SAFE_INTEGER, offset: 0 });
    const usages: string[] = [];

    for (const summary of pages.items) {
      const page = await this.readPageDocument(summary.slug);
      if (page?.blocks.includes(id)) {
        usages.push(summary.slug);
      }
    }

    return usages;
  }
}

export const cmsContentRepository = new CmsContentRepository();

export async function loadRuntimePage(slug: string): Promise<PageV2 | null> {
  const page = await cmsContentRepository.readPageDocument(slug);
  return page ? pageToRuntime(page) : null;
}

export async function loadRuntimeBlock(id: string): Promise<RuntimeBlockRecord | null> {
  const block = await cmsContentRepository.readBlockDocument(id);
  return block ? blockToRuntime(block) : null;
}

export async function ensureDataDirectories(): Promise<void> {
  await Promise.all([
    ensureDirectory(getCanonicalDataPath("pages")),
    ensureDirectory(getCanonicalDataPath("blocks")),
    ensureDirectory(getCanonicalDataPath("plugins")),
  ]);
}

export function logLegacyDataRoots(): void {
  const roots = getReadableDataRoots();
  logger.info({
    message: "CMS data roots resolved",
    roots,
  });
}


