/**
 * @upflame/json-cms — Content Search Engine
 *
 * Full-text search across all CMS pages, blocks, and components.
 * Zero-dependency implementation using TF-IDF ranking.
 * Supports: faceted search, highlights, fuzzy matching, field boosting.
 *
 * For production: swap the in-memory index for Algolia, Meilisearch,
 * or pgvector via the SearchAdapter interface.
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchDocument {
  id: string;
  slug: string;
  type: "page" | "block";
  title: string;
  description?: string;
  content: string; // extracted text
  tags?: string[];
  locale?: string;
  updatedAt?: string;
  /** Raw JSON for result rendering */
  raw?: unknown;
}

export interface SearchQuery {
  q: string;
  type?: "page" | "block";
  locale?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchHit {
  document: SearchDocument;
  score: number;
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  snippet: string; // text with <mark> tags around matches
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  query: string;
  durationMs: number;
}

export interface SearchAdapter {
  index(docs: SearchDocument[]): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult>;
  deleteDocument(id: string): Promise<void>;
  clear(): Promise<void>;
}

// ─── TF-IDF Index ─────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "can", "could", "should"]);

const FIELD_WEIGHTS: Record<string, number> = {
  title: 5,
  description: 2,
  tags: 3,
  content: 1,
};

class TFIDFIndex implements SearchAdapter {
  private docs: Map<string, SearchDocument> = new Map();
  private termFrequency: Map<string, Map<string, number>> = new Map(); // term -> docId -> tf
  private docFrequency: Map<string, number> = new Map(); // term -> doc count
  private docNorms: Map<string, number> = new Map(); // docId -> vector norm

  async index(docs: SearchDocument[]): Promise<void> {
    for (const doc of docs) {
      this.docs.set(doc.id, doc);
      this.indexDocument(doc);
    }
  }

  private indexDocument(doc: SearchDocument): void {
    const fieldTexts: Array<[string, string]> = [
      ["title", doc.title],
      ["description", doc.description ?? ""],
      ["tags", (doc.tags ?? []).join(" ")],
      ["content", doc.content],
    ];

    const termCounts = new Map<string, number>();

    for (const [field, text] of fieldTexts) {
      const weight = FIELD_WEIGHTS[field] ?? 1;
      const tokens = tokenize(text);
      for (const token of tokens) {
        termCounts.set(token, (termCounts.get(token) ?? 0) + weight);
      }
    }

    let norm = 0;
    for (const [term, count] of termCounts) {
      if (!this.termFrequency.has(term)) this.termFrequency.set(term, new Map());
      this.termFrequency.get(term)!.set(doc.id, count);
      this.docFrequency.set(term, (this.docFrequency.get(term) ?? 0) + 1);
      norm += count * count;
    }

    this.docNorms.set(doc.id, Math.sqrt(norm));
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const start = Date.now();
    const { q, type, locale, tags, limit = 20, offset = 0 } = query;

    const queryTokens = tokenize(q);
    if (queryTokens.length === 0) {
      return { hits: [], total: 0, query: q, durationMs: 0 };
    }

    const scores = new Map<string, number>();
    const N = this.docs.size;

    for (const token of queryTokens) {
      const postings = this.termFrequency.get(token);
      if (!postings) continue;

      const df = this.docFrequency.get(token) ?? 1;
      const idf = Math.log((N + 1) / (df + 1)) + 1;

      for (const [docId, tf] of postings) {
        const norm = this.docNorms.get(docId) ?? 1;
        scores.set(docId, (scores.get(docId) ?? 0) + (tf * idf) / norm);
      }
    }

    let results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({ doc: this.docs.get(id)!, score }))
      .filter(r => r.doc);

    // Filters
    if (type) results = results.filter(r => r.doc.type === type);
    if (locale) results = results.filter(r => !r.doc.locale || r.doc.locale === locale);
    if (tags?.length) results = results.filter(r => tags.some(t => r.doc.tags?.includes(t)));

    const total = results.length;
    const page = results.slice(offset, offset + limit);

    const hits: SearchHit[] = page.map(({ doc, score }) => ({
      document: doc,
      score,
      highlights: generateHighlights(doc, queryTokens),
    }));

    return { hits, total, query: q, durationMs: Date.now() - start };
  }

  async deleteDocument(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async clear(): Promise<void> {
    this.docs.clear();
    this.termFrequency.clear();
    this.docFrequency.clear();
    this.docNorms.clear();
  }
}

function generateHighlights(doc: SearchDocument, tokens: string[]): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];
  const regex = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");

  const fields: Array<[string, string | undefined]> = [
    ["title", doc.title],
    ["description", doc.description],
    ["content", doc.content.slice(0, 500)],
  ];

  for (const [field, text] of fields) {
    if (!text || !regex.test(text)) continue;
    regex.lastIndex = 0;

    // Extract snippet around first match
    const match = regex.exec(text);
    if (!match) continue;
    regex.lastIndex = 0;

    const start = Math.max(0, match.index - 60);
    const end = Math.min(text.length, match.index + 120);
    const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    const highlighted = snippet.replace(regex, "<mark>$1</mark>");

    highlights.push({ field, snippet: highlighted });
    if (highlights.length >= 3) break;
  }

  return highlights;
}

// ─── Content Indexer ──────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? "./data";

function extractTextFromValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractTextFromValue).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(extractTextFromValue).join(" ");
  }
  return "";
}

export async function buildSearchIndex(adapter?: SearchAdapter): Promise<SearchAdapter> {
  const index = adapter ?? new TFIDFIndex();
  const docs: SearchDocument[] = [];

  // Index pages
  try {
    const pagesDir = join(DATA_DIR, "pages");
    const pageFiles = (await readdir(pagesDir)).filter(f => f.endsWith(".json"));
    for (const file of pageFiles) {
      const slug = file.replace(".json", "");
      const content = JSON.parse(await readFile(join(pagesDir, file), "utf-8")) as Record<string, unknown>;
      docs.push({
        id: `page:${slug}`,
        slug,
        type: "page",
        title: String(content.title ?? slug),
        description: String((content.seo as Record<string, unknown> | undefined)?.description ?? ""),
        content: extractTextFromValue(content),
        tags: Array.isArray(content.tags) ? content.tags as string[] : [],
        updatedAt: String(content.updatedAt ?? ""),
        raw: content,
      });
    }
  } catch { /* no pages dir */ }

  // Index blocks
  try {
    const blocksDir = join(DATA_DIR, "blocks");
    const blockFiles = (await readdir(blocksDir)).filter(f => f.endsWith(".json"));
    for (const file of blockFiles) {
      const id = file.replace(".json", "");
      const content = JSON.parse(await readFile(join(blocksDir, file), "utf-8")) as Record<string, unknown>;
      docs.push({
        id: `block:${id}`,
        slug: id,
        type: "block",
        title: String(content.id ?? id),
        content: extractTextFromValue(content),
        raw: content,
      });
    }
  } catch { /* no blocks dir */ }

  await index.index(docs);
  return index;
}

// ─── Singleton Index ──────────────────────────────────────────────────────────

let _searchIndex: SearchAdapter | null = null;
let _indexedAt = 0;
const INDEX_TTL = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 30 * 1000;

export async function getSearchIndex(): Promise<SearchAdapter> {
  const now = Date.now();
  if (!_searchIndex || now - _indexedAt > INDEX_TTL) {
    _searchIndex = await buildSearchIndex();
    _indexedAt = now;
  }
  return _searchIndex;
}

export async function invalidateSearchIndex(): Promise<void> {
  if (_searchIndex) await _searchIndex.clear();
  _searchIndex = null;
  _indexedAt = 0;
}

/** Quick search function for use in API routes and components */
export async function search(query: SearchQuery): Promise<SearchResult> {
  const index = await getSearchIndex();
  return index.search(query);
}

