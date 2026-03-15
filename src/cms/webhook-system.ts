/**
 * @upflame/json-cms — Webhook System
 *
 * Notify external systems when CMS content changes.
 * Supports: publish, update, delete, schedule changes.
 *
 * Features:
 *  - HMAC-SHA256 signed payloads
 *  - Retry logic with exponential backoff (up to 5 attempts)
 *  - Timeout protection (5s per attempt)
 *  - Dead letter queue (failed webhooks logged)
 *  - Event filtering per webhook endpoint
 */

import { createHmac } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | "page.published"
  | "page.updated"
  | "page.deleted"
  | "page.scheduled"
  | "block.updated"
  | "settings.updated"
  | "plugin.installed"
  | "plugin.activated"
  | "plugin.deactivated";

type WebhookSubscription = WebhookEventType | "*";

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string; // HMAC signing key
  events: WebhookSubscription[]; // "*" = all events
  enabled: boolean;
  headers?: Record<string, string>; // Custom headers
  timeoutMs?: number; // Default: 5000
  maxRetries?: number; // Default: 3
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  cms: {
    version: string;
    environment: string;
  };
}

export interface WebhookDelivery {
  webhookId: string;
  event: WebhookEventType;
  url: string;
  attempt: number;
  success: boolean;
  statusCode?: number;
  durationMs: number;
  error?: string;
  timestamp: string;
}

// ─── Endpoint Store ───────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const WEBHOOKS_DIR = join(DATA_DIR, "_webhooks");
const ENDPOINTS_FILE = join(WEBHOOKS_DIR, "endpoints.json");
const LOG_FILE = join(WEBHOOKS_DIR, "delivery-log.jsonl");

export async function getEndpoints(): Promise<WebhookEndpoint[]> {
  try {
    return JSON.parse(await readFile(ENDPOINTS_FILE, "utf-8")) as WebhookEndpoint[];
  } catch {
    return [];
  }
}

export async function saveEndpoints(endpoints: WebhookEndpoint[]): Promise<void> {
  await mkdir(WEBHOOKS_DIR, { recursive: true });
  await writeFile(ENDPOINTS_FILE, JSON.stringify(endpoints, null, 2));
}

export async function addEndpoint(endpoint: Omit<WebhookEndpoint, "id">): Promise<WebhookEndpoint> {
  const id = `wh_${Date.now().toString(36)}`;
  const newEndpoint: WebhookEndpoint = { id, ...endpoint };
  const endpoints = await getEndpoints();
  endpoints.push(newEndpoint);
  await saveEndpoints(endpoints);
  return newEndpoint;
}

export async function removeEndpoint(id: string): Promise<void> {
  const endpoints = (await getEndpoints()).filter(e => e.id !== id);
  await saveEndpoints(endpoints);
}

// ─── Payload Signing ──────────────────────────────────────────────────────────

function signPayload(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

async function deliverWithRetry(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload,
  attempt = 1
): Promise<WebhookDelivery> {
  const body = JSON.stringify(payload);
  const start = Date.now();
  const timeout = endpoint.timeoutMs ?? 5000;
  const maxRetries = endpoint.maxRetries ?? 3;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "@upflame/json-cms/2.0",
    "X-CMS-Event": payload.event,
    "X-CMS-Delivery": payload.id,
    "X-CMS-Timestamp": payload.timestamp,
    ...endpoint.headers,
  };

  if (endpoint.secret) {
    headers["X-CMS-Signature"] = signPayload(body, endpoint.secret);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const durationMs = Date.now() - start;
    const success = response.ok;

    const delivery: WebhookDelivery = {
      webhookId: endpoint.id,
      event: payload.event,
      url: endpoint.url,
      attempt,
      success,
      statusCode: response.status,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    await logDelivery(delivery);

    if (!success && attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      return deliverWithRetry(endpoint, payload, attempt + 1);
    }

    return delivery;
  } catch (err) {
    const durationMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);

    const delivery: WebhookDelivery = {
      webhookId: endpoint.id,
      event: payload.event,
      url: endpoint.url,
      attempt,
      success: false,
      durationMs,
      error,
      timestamp: new Date().toISOString(),
    };

    await logDelivery(delivery);

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      return deliverWithRetry(endpoint, payload, attempt + 1);
    }

    return delivery;
  }
}

async function logDelivery(delivery: WebhookDelivery): Promise<void> {
  try {
    await mkdir(WEBHOOKS_DIR, { recursive: true });
    const { appendFile } = await import("fs/promises");
    await appendFile(LOG_FILE, JSON.stringify(delivery) + "\n");
  } catch { /* non-fatal */ }
}

function endpointMatchesEvent(endpoint: WebhookEndpoint, event: WebhookEventType): boolean {
  return endpoint.enabled && (endpoint.events.includes("*") || endpoint.events.includes(event));
}

// ─── Main Dispatch ────────────────────────────────────────────────────────────

let idCounter = 0;

/**
 * Fire a webhook event to all registered matching endpoints.
 * Non-blocking — returns immediately, delivery happens in background.
 */
export function fireWebhook(
  event: WebhookEventType,
  data: Record<string, unknown>
): void {
  const payload: WebhookPayload = {
    id: `evt_${Date.now()}_${++idCounter}`,
    event,
    timestamp: new Date().toISOString(),
    data,
    cms: {
      version: "2.0.0",
      environment: process.env.NODE_ENV ?? "development",
    },
  };

  // Fire-and-forget — don't block the CMS operation
  setImmediate(async () => {
    const endpoints = await getEndpoints();
    const matching = endpoints.filter(ep => endpointMatchesEvent(ep, event));

    await Promise.allSettled(matching.map(ep => deliverWithRetry(ep, payload)));
  });
}

/**
 * Fire a webhook and await all deliveries.
 * Use in backgrounds tasks where you need to know delivery status.
 */
export async function fireWebhookAsync(
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<WebhookDelivery[]> {
  const payload: WebhookPayload = {
    id: `evt_${Date.now()}_${++idCounter}`,
    event,
    timestamp: new Date().toISOString(),
    data,
    cms: { version: "2.0.0", environment: process.env.NODE_ENV ?? "development" },
  };

  const endpoints = await getEndpoints();
  const matching = endpoints.filter(ep => endpointMatchesEvent(ep, event));

  const results = await Promise.allSettled(matching.map(ep => deliverWithRetry(ep, payload)));
  return results
    .filter((r): r is PromiseFulfilledResult<WebhookDelivery> => r.status === "fulfilled")
    .map(r => r.value);
}

