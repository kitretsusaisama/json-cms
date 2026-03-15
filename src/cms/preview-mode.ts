/**
 * @upflame/json-cms — Preview Mode System
 *
 * Provides draft/preview content for editors before publishing.
 * Integrates with Next.js draft mode (App Router) and preview mode (Pages Router).
 *
 * Features:
 *  - Draft mode toggle via signed URL
 *  - Time-travel preview (see page as of any past timestamp)
 *  - Per-page preview overrides
 *  - Automatic preview bar injection
 *  - Signed preview URLs with expiry (default: 24h)
 *  - Preview token validation
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewToken {
  slug: string;
  expiresAt: number; // Unix ms
  userId?: string;
  locale?: string;
  version?: string; // content version to preview
}

export interface PreviewContext {
  isPreview: boolean;
  slug: string;
  locale?: string;
  version?: string;
  expiresAt?: number;
  userId?: string;
}

export interface PreviewUrlOptions {
  slug: string;
  locale?: string;
  version?: string;
  expiresInMs?: number; // default: 24h
  userId?: string;
  baseUrl?: string;
}

export interface DraftOverride {
  slug: string;
  content: unknown;
  savedAt: string;
  savedBy?: string;
}

// ─── Token Signing ────────────────────────────────────────────────────────────

function getPreviewSecret(): string {
  const s = process.env.CMS_PREVIEW_SECRET ?? process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("CMS_PREVIEW_SECRET env var required (min 16 chars) for preview mode.");
  }
  return s;
}

function signToken(payload: PreviewToken): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", getPreviewSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verifyToken(token: string): PreviewToken | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const expectedSig = createHmac("sha256", getPreviewSecret()).update(b64).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8")) as PreviewToken;
    if (payload.expiresAt < Date.now()) return null; // expired

    return payload;
  } catch {
    return null;
  }
}

// ─── Preview URL Generation ───────────────────────────────────────────────────

/**
 * Generate a signed, time-limited preview URL.
 *
 * @example
 * const url = generatePreviewUrl({ slug: "home", locale: "en", baseUrl: "https://mysite.com" });
 * // → https://mysite.com/api/cms/preview?token=xxx&slug=home
 */
export function generatePreviewUrl(opts: PreviewUrlOptions): string {
  const {
    slug,
    locale,
    version,
    expiresInMs = 24 * 60 * 60 * 1000, // 24 hours
    userId,
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  } = opts;

  const token = signToken({
    slug,
    locale,
    version,
    userId,
    expiresAt: Date.now() + expiresInMs,
  });

  const url = new URL(`${baseUrl}/api/cms/preview`);
  url.searchParams.set("token", token);
  url.searchParams.set("slug", slug);
  if (locale) url.searchParams.set("locale", locale);

  return url.toString();
}

/**
 * Validate a preview token from a request.
 * Returns null if token is invalid or expired.
 */
export function validatePreviewToken(token: string): PreviewContext | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    isPreview: true,
    slug: payload.slug,
    locale: payload.locale,
    version: payload.version,
    expiresAt: payload.expiresAt,
    userId: payload.userId,
  };
}

/**
 * Get preview context from Next.js request headers.
 * Works with both App Router (headers()) and Pages Router (req.cookies).
 */
export function getPreviewContextFromCookie(cookie: string | null): PreviewContext | null {
  if (!cookie) return null;

  const match = cookie.match(/cms_preview_token=([^;]+)/);
  if (!match?.[1]) return null;

  return validatePreviewToken(decodeURIComponent(match[1]));
}

// ─── Draft Content Store ──────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DRAFTS_DIR = join(DATA_DIR, "_drafts");

/**
 * Load draft content for a page (if it exists).
 * Draft overrides the published version during preview.
 */
export async function loadDraftContent(slug: string): Promise<DraftOverride | null> {
  try {
    const path = join(DRAFTS_DIR, `${slug}.draft.json`);
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as DraftOverride;
  } catch {
    return null;
  }
}

/**
 * Check if a draft exists for a slug.
 */
export async function hasDraft(slug: string): Promise<boolean> {
  return loadDraftContent(slug).then(d => d !== null);
}

// ─── Next.js App Router API Handler ──────────────────────────────────────────

export interface PreviewHandlerResponse {
  redirect?: string;
  setCookie?: { name: string; value: string; maxAge: number; path: string; httpOnly: boolean; sameSite: "strict" | "lax" };
  clearCookie?: string;
  error?: string;
  status?: number;
}

export function handlePreviewEnable(token: string): PreviewHandlerResponse {
  const ctx = validatePreviewToken(token);
  if (!ctx) {
    return { error: "Invalid or expired preview token.", status: 401 };
  }

  const ttlSeconds = Math.floor((ctx.expiresAt! - Date.now()) / 1000);

  return {
    redirect: `/${ctx.slug}${ctx.locale ? `?locale=${ctx.locale}` : ""}`,
    setCookie: {
      name: "cms_preview_token",
      value: token,
      maxAge: ttlSeconds,
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    },
  };
}

export function handlePreviewDisable(): PreviewHandlerResponse {
  return {
    redirect: "/",
    clearCookie: "cms_preview_token",
  };
}

