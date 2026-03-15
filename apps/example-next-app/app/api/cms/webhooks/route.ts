/**
 * @upflame/json-cms — Webhooks Management API
 * GET    /api/cms/webhooks         — list all endpoints
 * POST   /api/cms/webhooks         — register a new endpoint
 * DELETE /api/cms/webhooks?id=xxx  — remove an endpoint
 * POST   /api/cms/webhooks/test    — send a test event
 */

import { NextRequest, NextResponse } from "next/server";
import { getEndpoints, addEndpoint, removeEndpoint, fireWebhookAsync } from "@workspace/cms/webhook-system";
import { requireAdmin } from "@workspace/lib/security";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const endpoints = await getEndpoints();
    return NextResponse.json({ endpoints: endpoints.map(e => ({ ...e, secret: e.secret ? "***" : undefined })) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json() as { url: string; events: string[]; secret?: string; enabled?: boolean };

    if (!body.url || !body.events?.length) {
      return NextResponse.json({ error: "url and events are required" }, { status: 400 });
    }

    // Validate URL
    try { new URL(body.url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const endpoint = await addEndpoint({
      url: body.url,
      events: body.events as never,
      secret: body.secret,
      enabled: body.enabled ?? true,
    });

    return NextResponse.json({ endpoint: { ...endpoint, secret: endpoint.secret ? "***" : undefined } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await removeEndpoint(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
