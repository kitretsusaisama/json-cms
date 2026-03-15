/**
 * @upflame/json-cms — Preview API Routes
 * POST/GET /api/cms/preview  — enable/disable preview mode
 * GET /api/cms/preview/disable — exit preview
 */

// ── /api/cms/preview/route.ts ──────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { handlePreviewEnable, handlePreviewDisable } from "@workspace/cms/preview-mode";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action");

  if (action === "disable" || !token) {
    const result = handlePreviewDisable();
    const res = NextResponse.redirect(new URL(result.redirect!, req.url));
    res.cookies.delete(result.clearCookie!);
    return res;
  }

  const result = handlePreviewEnable(token);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 401 });
  }

  const baseUrl = new URL(req.url).origin;
  const redirectUrl = new URL(result.redirect!, baseUrl);
  const res = NextResponse.redirect(redirectUrl);

  if (result.setCookie) {
    const { name, value, ...options } = result.setCookie;
    res.cookies.set(name, value, options);
  }

  return res;
}
