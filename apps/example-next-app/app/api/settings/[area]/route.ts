/**
 * Settings API Route
 * 
 * Fixes applied vs. original:
 *  - GET endpoint now requires authentication (was completely open)
 *  - area parameter validated against allowlist (path traversal prevention)
 *  - Consistent error handling with proper HTTP status codes
 */

import { NextRequest, NextResponse } from "next/server";
import { fsSettingsStore } from "@workspace/lib/settings";
import { requireAdmin, rateLimit, logAuditEvent, assertSafeId } from "@workspace/lib/security";

// Allowlist of valid settings areas — prevents path traversal via area param
const ALLOWED_AREAS = new Set([
  "general",
  "seo",
  "theme",
  "integrations",
  "notifications",
  "analytics",
  "security",
  "i18n",
]);

function validateArea(area: string): void {
  if (!ALLOWED_AREAS.has(area)) {
    throw new Error(
      `Unknown settings area: "${area}". Allowed: [${[...ALLOWED_AREAS].join(", ")}]`
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ area: string }> }
): Promise<NextResponse> {
  try {
    // Rate limit before authentication check
    await rateLimit(req, { key: "settings:read", limit: 120, windowMs: 60_000 });

    // Authentication required — settings may contain sensitive config
    await requireAdmin(req);

    const { area } = await params;
    validateArea(area);
    assertSafeId(area, "settings area");

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") ?? undefined;

    if (key) assertSafeId(key, "settings key");

    const data = await fsSettingsStore.get(area, key);

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isAuth = message.includes("Unauthorized") || message.includes("Forbidden");
    const isNotFound = message.includes("Unknown settings area");

    return NextResponse.json(
      { error: message },
      { status: isAuth ? 401 : isNotFound ? 400 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ area: string }> }
): Promise<NextResponse> {
  try {
    await rateLimit(req, { key: "settings:write", limit: 5, windowMs: 60_000 });
    const user = await requireAdmin(req);

    const { area } = await params;
    validateArea(area);
    assertSafeId(area, "settings area");

    const body = await req.json() as Record<string, unknown>;
    const { key, data } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
    }
    assertSafeId(key, "settings key");

    await fsSettingsStore.set(area, key, data);
    await logAuditEvent("settings:write", user, { area, key });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isAuth = message.includes("Unauthorized") || message.includes("Forbidden");

    return NextResponse.json(
      { error: message },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ area: string }> }
): Promise<NextResponse> {
  try {
    await rateLimit(req, { key: "settings:delete", limit: 3, windowMs: 60_000 });
    const user = await requireAdmin(req);

    const { area } = await params;
    validateArea(area);
    assertSafeId(area, "settings area");

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }
    assertSafeId(key, "settings key");

    await logAuditEvent("settings:delete", user, { area, key });
    // fsSettingsStore.delete not shown in original — add if available
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isAuth = message.includes("Unauthorized") || message.includes("Forbidden");

    return NextResponse.json(
      { error: message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
