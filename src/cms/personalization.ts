/**
 * @upflame/json-cms — Personalization Engine
 *
 * Server-side personalization: different components per user segment
 * without any client JS or cookie consent issues.
 *
 * Segment derivation from:
 *  - Device type (mobile/tablet/desktop)
 *  - Locale / language
 *  - Referrer (organic, paid, social, direct)
 *  - Time-of-day / day-of-week
 *  - New vs returning visitor
 *  - UTM parameters
 *  - Custom headers
 *
 * Privacy by design:
 *  - All signals read from HTTP headers (no JS required)
 *  - No PII collected or stored
 *  - Segment IDs are opaque labels, not user identifiers
 */

import type { NextRequest } from "next/server";
import type { ComponentInstance } from "@/types/composer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot";
export type TrafficSource = "organic" | "paid" | "social" | "email" | "direct" | "referral";
export type TimeSegment = "morning" | "afternoon" | "evening" | "night";
export type DaySegment = "weekday" | "weekend";

export interface UserSegment {
  deviceType: DeviceType;
  trafficSource: TrafficSource;
  timeSegment: TimeSegment;
  daySegment: DaySegment;
  locale: string;
  isBot: boolean;
  isNewVisitor: boolean;
  utmCampaign?: string;
  utmMedium?: string;
  utmSource?: string;
  country?: string;
  region?: string;
  /** Deterministic hash for A/B bucketing (0-99) */
  abBucket: number;
}

export interface PersonalizationRule {
  /** Segment field to match */
  field: keyof UserSegment;
  /** Values that match this rule */
  values: string[];
  /** Whether to negate the match */
  negate?: boolean;
}

export interface PersonalizationVariant {
  /** Unique variant ID */
  id: string;
  /** Human-readable label */
  label: string;
  /** Rules that must ALL match for this variant to be selected */
  rules: PersonalizationRule[];
  /** Component overrides for this variant */
  componentOverrides?: Record<string, Partial<ComponentInstance>>;
  /** Weight for random selection when multiple variants match (default: 1) */
  weight?: number;
}

export interface PersonalizationConfig {
  /** Default variant ID (used when no rules match) */
  defaultVariant: string;
  variants: PersonalizationVariant[];
}

// ─── Segment Derivation ───────────────────────────────────────────────────────

const BOT_PATTERNS = /bot|crawler|spider|scraper|googlebot|bingbot|slurp|duckduck/i;

function detectDevice(ua: string | null): DeviceType {
  if (!ua) return "desktop";
  if (BOT_PATTERNS.test(ua)) return "bot";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function detectTrafficSource(req: NextRequest): TrafficSource {
  const utmMedium = req.nextUrl.searchParams.get("utm_medium")?.toLowerCase();
  const utmSource = req.nextUrl.searchParams.get("utm_source")?.toLowerCase() ?? "";
  const referrer = req.headers.get("referer") ?? "";

  if (utmMedium === "cpc" || utmMedium === "paid" || utmMedium === "ppc") return "paid";
  if (utmMedium === "email" || utmMedium === "newsletter") return "email";
  if (utmMedium === "social" || /twitter|facebook|instagram|linkedin|tiktok/i.test(utmSource)) return "social";

  if (referrer) {
    if (/google|bing|yahoo|duckduckgo|baidu/i.test(referrer)) return "organic";
    if (/twitter|facebook|instagram|linkedin|tiktok/i.test(referrer)) return "social";
    return "referral";
  }

  return "direct";
}

function getTimeSegment(hour: number): TimeSegment {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/** Stable, deterministic 0–99 bucket from a client identifier */
function computeAbBucket(identifier: string): number {
  let hash = 5381;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) + hash) ^ identifier.charCodeAt(i);
    hash = hash >>> 0; // force unsigned 32-bit
  }
  return hash % 100;
}

/**
 * Derive a user segment from a Next.js request.
 * All computation is server-side. No cookies set.
 */
export function deriveSegment(req: NextRequest): UserSegment {
  const ua = req.headers.get("user-agent");
  const deviceType = detectDevice(ua);

  // A/B bucket: use IP + UA for stability across requests
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const abIdentifier = `${ip}:${ua ?? ""}`;

  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  const locale =
    req.nextUrl.searchParams.get("locale") ??
    req.cookies.get("NEXT_LOCALE")?.value ??
    req.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ??
    "en";

  return {
    deviceType,
    trafficSource: detectTrafficSource(req),
    timeSegment: getTimeSegment(hour),
    daySegment: dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday",
    locale,
    isBot: deviceType === "bot",
    isNewVisitor: !req.cookies.get("cms_returning")?.value,
    utmCampaign: req.nextUrl.searchParams.get("utm_campaign") ?? undefined,
    utmMedium: req.nextUrl.searchParams.get("utm_medium") ?? undefined,
    utmSource: req.nextUrl.searchParams.get("utm_source") ?? undefined,
    country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? undefined,
    region: req.headers.get("x-vercel-ip-country-region") ?? undefined,
    abBucket: computeAbBucket(abIdentifier),
  };
}

// ─── Variant Selection ────────────────────────────────────────────────────────

function segmentMatchesRule(segment: UserSegment, rule: PersonalizationRule): boolean {
  const value = segment[rule.field];
  if (value === undefined) return false;
  const matches = rule.values.includes(String(value));
  return rule.negate ? !matches : matches;
}

function variantMatchesSegment(variant: PersonalizationVariant, segment: UserSegment): boolean {
  return variant.rules.every(rule => segmentMatchesRule(segment, rule));
}

/**
 * Select the best variant for a user segment.
 * When multiple variants match, selects by weight using the segment's A/B bucket.
 */
export function selectVariant(
  config: PersonalizationConfig,
  segment: UserSegment
): PersonalizationVariant | null {
  const matching = config.variants.filter(v => variantMatchesSegment(v, segment));

  if (matching.length === 0) {
    return config.variants.find(v => v.id === config.defaultVariant) ?? null;
  }

  if (matching.length === 1) return matching[0];

  // Weighted selection using A/B bucket for determinism
  const totalWeight = matching.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  const threshold = (segment.abBucket / 100) * totalWeight;
  let cumulative = 0;
  for (const variant of matching) {
    cumulative += variant.weight ?? 1;
    if (threshold < cumulative) return variant;
  }
  return matching[matching.length - 1];
}

/**
 * Apply personalization variant overrides to a component instance.
 */
export function applyVariantOverrides(
  component: ComponentInstance,
  variant: PersonalizationVariant | null
): ComponentInstance {
  if (!variant?.componentOverrides?.[component.key]) return component;
  const overrides = variant.componentOverrides[component.key];
  return {
    ...component,
    props: { ...component.props, ...overrides.props },
    variant: overrides.variant ?? component.variant,
  };
}

// ─── Personalization Context ──────────────────────────────────────────────────

export interface PersonalizationContextData {
  segment: UserSegment;
  variantId?: string;
  variantLabel?: string;
  abBucket: number;
}

export function createPersonalizationContext(req: NextRequest): PersonalizationContextData {
  const segment = deriveSegment(req);
  return { segment, abBucket: segment.abBucket };
}
