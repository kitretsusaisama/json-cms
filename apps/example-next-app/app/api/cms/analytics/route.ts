/**
 * @upflame/json-cms — Analytics Collection API
 * POST /api/cms/analytics  — receive batched component analytics events
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const ANALYTICS_DIR = join(DATA_DIR, "_analytics");

interface AnalyticsEvent {
  type: "event" | "impression" | "click";
  name?: string;
  componentId?: string;
  componentKey?: string;
  label?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  locale: string;
  url: string;
}

interface AggregatedMetrics {
  impressions: Record<string, number>;
  clicks: Record<string, number>;
  events: Record<string, number>;
  updatedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const events = await req.json() as AnalyticsEvent[];
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Validate and sanitize
    const valid = events.filter(e =>
      ["event", "impression", "click"].includes(e.type) &&
      typeof e.timestamp === "number" &&
      typeof e.url === "string"
    );

    if (valid.length === 0) return NextResponse.json({ ok: true });

    // Aggregate into daily bucket
    await aggregateEvents(valid);

    return NextResponse.json({ ok: true, processed: valid.length });
  } catch (err) {
    // Analytics failures are non-fatal
    console.error("[CMS Analytics]", err);
    return NextResponse.json({ ok: false }, { status: 200 }); // Still 200 — don't fail UI
  }
}

async function aggregateEvents(events: AnalyticsEvent[]): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const metricsPath = join(ANALYTICS_DIR, `${today}.json`);

  await mkdir(ANALYTICS_DIR, { recursive: true });

  let metrics: AggregatedMetrics;
  try {
    metrics = JSON.parse(await readFile(metricsPath, "utf-8")) as AggregatedMetrics;
  } catch {
    metrics = { impressions: {}, clicks: {}, events: {}, updatedAt: new Date().toISOString() };
  }

  for (const event of events) {
    if (event.type === "impression" && event.componentKey) {
      metrics.impressions[event.componentKey] = (metrics.impressions[event.componentKey] ?? 0) + 1;
    } else if (event.type === "click" && event.componentKey) {
      metrics.clicks[event.componentKey] = (metrics.clicks[event.componentKey] ?? 0) + 1;
    } else if (event.type === "event" && event.name) {
      metrics.events[event.name] = (metrics.events[event.name] ?? 0) + 1;
    }
  }

  metrics.updatedAt = new Date().toISOString();
  await writeFile(metricsPath, JSON.stringify(metrics, null, 2));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    // Read all daily files in range
    const summary: AggregatedMetrics = { impressions: {}, clicks: {}, events: {}, updatedAt: new Date().toISOString() };

    try {
      const { readdir } = await import("fs/promises");
      const files = (await readdir(ANALYTICS_DIR)).filter(f => {
        const date = f.replace(".json", "");
        return date >= from && date <= to;
      });

      for (const file of files) {
        const data = JSON.parse(await readFile(join(ANALYTICS_DIR, file), "utf-8")) as AggregatedMetrics;
        for (const [k, v] of Object.entries(data.impressions)) {
          summary.impressions[k] = (summary.impressions[k] ?? 0) + v;
        }
        for (const [k, v] of Object.entries(data.clicks)) {
          summary.clicks[k] = (summary.clicks[k] ?? 0) + v;
        }
        for (const [k, v] of Object.entries(data.events)) {
          summary.events[k] = (summary.events[k] ?? 0) + v;
        }
      }
    } catch { /* no analytics yet */ }

    return NextResponse.json({ from, to, ...summary });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}

