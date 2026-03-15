/**
 * @upflame/json-cms — Content Search API
 * GET /api/cms/search?q=hero&type=page&locale=en&limit=10
 */

import { NextRequest, NextResponse } from "next/server";
import { search } from "@workspace/cms/content-search";

export const runtime = "nodejs";
// Revalidate the search index every 60 seconds
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") as "page" | "block" | undefined;
  const locale = searchParams.get("locale") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const tags = searchParams.get("tags")?.split(",").filter(Boolean);

  if (!q || q.length < 2) {
    return NextResponse.json({ hits: [], total: 0, query: q }, { status: 200 });
  }

  try {
    const result = await search({ q, type, locale, limit, offset, tags });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
