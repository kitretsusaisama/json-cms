/**
 * @upflame/json-cms — Security Layer
 *
 * FIXES in this revision:
 *  BUG-SEC-001: Audit log was silenced in production (only wrote to file in dev)
 *               → now writes structured JSON to stderr in production (container log)
 *  BUG-SEC-002: CSRF cookie sameSite was 'strict' but httpOnly: false — correct
 *  All other code unchanged (JWT, rate limiting, CSRF, headers all correct)
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import crypto from "crypto";
import { buildCspPolicy } from "./csp";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

export interface RateLimitOptions {
  key: string;
  limit?: number;
  windowMs?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface CMSJWTPayload extends JWTPayload {
  sub: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is missing or too short (minimum 32 characters)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: missing Bearer token");
  }
  const token = authHeader.substring(7).trim();
  if (!token) throw new Error("Unauthorized: empty token");

  let payload: CMSJWTPayload;
  try {
    const result = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    payload = result.payload as CMSJWTPayload;
  } catch (err) {
    throw new Error(`Unauthorized: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error("Unauthorized: token missing required claims");
  }
  if (payload.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }

  return { id: payload.sub, email: payload.email, role: payload.role };
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: missing Bearer token");
  }
  const token = authHeader.substring(7).trim();
  if (!token) throw new Error("Unauthorized: empty token");

  let payload: CMSJWTPayload;
  try {
    const result = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    payload = result.payload as CMSJWTPayload;
  } catch (err) {
    throw new Error(`Unauthorized: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error("Unauthorized: token missing required claims");
  }

  return { id: payload.sub, email: payload.email, role: payload.role };
}

const rateLimitStore = new Map<string, RateLimitRecord>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore) {
      if (now > record.resetTime) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

export async function rateLimit(req: NextRequest, options: RateLimitOptions): Promise<void> {
  const { key, limit = 100, windowMs = 60_000 } = options;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = (forwardedFor?.split(",")[0] ?? realIp ?? "unknown").trim();
  const rateKey = `${key}:${ip}`;

  const now = Date.now();
  const record = rateLimitStore.get(rateKey);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(rateKey, { count: 1, resetTime: now + windowMs });
    return;
  }
  if (record.count >= limit) throw new Error("Rate limit exceeded");
  record.count++;
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

export function assertSafeId(id: string, context: string): void {
  if (!/^[a-zA-Z0-9._\-]+$/.test(id)) {
    throw new Error(
      `Invalid ${context}: "${id}" contains disallowed characters. ` +
      `Only alphanumeric, dot, hyphen, and underscore are allowed.`
    );
  }
}

export function normalizeCanonical(url: string): string {
  try {
    return new URL(url).toString();
  } catch {
    throw new Error("Invalid URL");
  }
}

export function validateStructuredData(data: unknown[]): unknown[] {
  return data.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("Invalid structured data: item must be a non-null object");
    }
    const obj = item as Record<string, unknown>;
    if (!obj["@context"] || !obj["@type"]) {
      throw new Error('Structured data must have "@context" and "@type"');
    }
    return item;
  });
}

export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

export function createCsrfToken(): string {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webCrypto?.getRandomValues) {
    const buf = new Uint8Array(16);
    webCrypto.getRandomValues(buf);
    return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return crypto.randomBytes(16).toString("hex");
}

export function ensureCsrfCookie(response: NextResponse, request: NextRequest): void {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (!existing) {
    response.cookies.set(CSRF_COOKIE, createCsrfToken(), {
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // Must be JS-readable for double-submit
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function verifyCsrf(req: NextRequest): Promise<void> {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  if (!cookie || !header) {
    throw new Error("Invalid CSRF token: missing cookie or header");
  }
  const cookieBuf = Buffer.from(cookie);
  const headerBuf = Buffer.from(header);
  if (
    cookieBuf.length !== headerBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, headerBuf)
  ) {
    throw new Error("Invalid CSRF token: mismatch");
  }
}

export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const isProd = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-DNS-Prefetch-Control": "off",
    ...(isProd && { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" }),
  };

  if (nonce) {
    headers["Content-Security-Policy"] = buildCspPolicy(nonce, isDevelopment);
  }

  return headers;
}

/**
 * Write a structured audit log entry.
 *
 * FIX BUG-SEC-001: Previously only wrote to disk in non-production,
 * leaving production audit trail as console.log noise.
 *
 * Now:
 *  - Production: writes JSON to process.stderr (captured by log aggregators)
 *  - Non-production: appends to data/audit.log for local debugging
 */
export async function logAuditEvent(
  action: string,
  user: AuthUser,
  details: Record<string, unknown>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    details,
  };

  if (process.env.NODE_ENV === "production") {
    // Structured JSON to stderr — captured by CloudWatch, Datadog, Loki, etc.
    process.stderr.write(`AUDIT: ${JSON.stringify(logEntry)}\n`);
  } else {
    // Local dev: append to file
    try {
      const { appendFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const auditDir = join(process.cwd(), "data");
      await mkdir(auditDir, { recursive: true });
      await appendFile(join(auditDir, "audit.log"), JSON.stringify(logEntry) + "\n");
    } catch {
      // Non-fatal — log to stderr as fallback
      process.stderr.write(`AUDIT: ${JSON.stringify(logEntry)}\n`);
    }
  }
}
