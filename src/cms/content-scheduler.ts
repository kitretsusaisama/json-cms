/**
 * @upflame/json-cms — Content Scheduler
 *
 * Schedule content to go live or expire at specific timestamps.
 * Works with static generation (revalidation) and dynamic rendering.
 *
 * Scheduling modes:
 *  1. publishAt  — content becomes visible at this UTC timestamp
 *  2. expireAt   — content hidden after this UTC timestamp
 *  3. timezone   — all timestamps interpreted in this timezone
 *
 * Integration:
 *  - next.config.js: revalidate = time until next change event
 *  - ISR: pages auto-revalidate when schedule changes
 *  - API: GET /api/cms/schedule returns next change time for a slug
 */

import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContentSchedule {
  slug: string;
  publishAt?: string; // ISO 8601 UTC
  expireAt?: string;  // ISO 8601 UTC
  timezone?: string;  // IANA timezone name
  status: "draft" | "scheduled" | "published" | "expired";
  version?: string;
  createdBy?: string;
  updatedAt: string;
}

export interface ScheduleCheckResult {
  isVisible: boolean;
  status: ContentSchedule["status"];
  nextChangeAt?: string; // When visibility will change next
  revalidateSeconds?: number; // How soon Next.js should revalidate
}

// ─── Status Computation ───────────────────────────────────────────────────────

export function computeScheduleStatus(schedule: ContentSchedule, now = new Date()): ScheduleCheckResult {
  const nowMs = now.getTime();
  const publishMs = schedule.publishAt ? new Date(schedule.publishAt).getTime() : null;
  const expireMs = schedule.expireAt ? new Date(schedule.expireAt).getTime() : null;

  // Not yet published
  if (publishMs !== null && nowMs < publishMs) {
    const secondsUntilPublish = Math.ceil((publishMs - nowMs) / 1000);
    return {
      isVisible: false,
      status: "scheduled",
      nextChangeAt: schedule.publishAt,
      revalidateSeconds: Math.min(secondsUntilPublish, 3600), // max 1h
    };
  }

  // Expired
  if (expireMs !== null && nowMs >= expireMs) {
    return { isVisible: false, status: "expired" };
  }

  // Published but will expire
  if (expireMs !== null && nowMs < expireMs) {
    const secondsUntilExpiry = Math.ceil((expireMs - nowMs) / 1000);
    return {
      isVisible: true,
      status: "published",
      nextChangeAt: schedule.expireAt,
      revalidateSeconds: Math.min(secondsUntilExpiry, 3600),
    };
  }

  // Published indefinitely
  return { isVisible: true, status: "published" };
}

// ─── Schedule Store (File-based) ──────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const SCHEDULES_DIR = join(DATA_DIR, "_schedules");

export async function getSchedule(slug: string): Promise<ContentSchedule | null> {
  try {
    const path = join(SCHEDULES_DIR, `${slug}.schedule.json`);
    return JSON.parse(await readFile(path, "utf-8")) as ContentSchedule;
  } catch {
    return null;
  }
}

export async function setSchedule(schedule: ContentSchedule): Promise<void> {
  const { mkdir } = await import("fs/promises");
  await mkdir(SCHEDULES_DIR, { recursive: true });
  const path = join(SCHEDULES_DIR, `${schedule.slug}.schedule.json`);
  await writeFile(path, JSON.stringify({ ...schedule, updatedAt: new Date().toISOString() }, null, 2));
}

export async function deleteSchedule(slug: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  try {
    await unlink(join(SCHEDULES_DIR, `${slug}.schedule.json`));
  } catch { /* not found — ignore */ }
}

/**
 * Get all scheduled pages, sorted by next change time.
 */
export async function getAllSchedules(): Promise<ContentSchedule[]> {
  try {
    const files = (await readdir(SCHEDULES_DIR)).filter(f => f.endsWith(".schedule.json"));
    const schedules = await Promise.all(
      files.map(f => readFile(join(SCHEDULES_DIR, f), "utf-8").then(c => JSON.parse(c) as ContentSchedule))
    );
    return schedules.sort((a, b) => {
      const aTime = a.publishAt ?? a.expireAt ?? "";
      const bTime = b.publishAt ?? b.expireAt ?? "";
      return aTime.localeCompare(bTime);
    });
  } catch {
    return [];
  }
}

/**
 * Compute the minimum ISR revalidation time across all scheduled pages.
 * Use this in next.config.js to set global revalidation.
 */
export async function getGlobalRevalidateSeconds(): Promise<number> {
  const schedules = await getAllSchedules();
  const now = new Date();
  let min = Infinity;

  for (const schedule of schedules) {
    const result = computeScheduleStatus(schedule, now);
    if (result.revalidateSeconds !== undefined) {
      min = Math.min(min, result.revalidateSeconds);
    }
  }

  return min === Infinity ? 3600 : min; // default 1h if no schedules
}

/**
 * Filter a list of page slugs to those currently visible.
 */
export async function filterVisibleSlugs(slugs: string[]): Promise<string[]> {
  const now = new Date();
  const results = await Promise.all(
    slugs.map(async (slug) => {
      const schedule = await getSchedule(slug);
      if (!schedule) return true; // No schedule = always visible
      const result = computeScheduleStatus(schedule, now);
      return result.isVisible;
    })
  );
  return slugs.filter((_, i) => results[i]);
}

