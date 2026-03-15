import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { componentCatalog } from "@workspace/core/components/catalog";
import {
  internalServerError,
  ok,
  paginationSchema,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";
import { errorResponse, APIErrorBuilder } from "@workspace/boilerplate/api/envelope";

const componentSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z0-9-_]+$/),
  metadata: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    category: z.string().min(1).max(100),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
    slots: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      accepts: z.array(z.string()).optional(),
    })).default([]),
    variants: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      props: z.record(z.unknown()).optional(),
    })).default([]),
  }),
  schema: z.record(z.unknown()).optional(),
  lazy: z.boolean().default(true),
});

const componentFiltersSchema = paginationSchema.extend({
  category: z.string().optional(),
  query: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = componentFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(APIErrorBuilder.badRequest("Invalid component filters.").withDetails(parsed.error.flatten()).build()),
      { status: 400 }
    );
  }

  try {
    let entries = componentCatalog.list();
    if (parsed.data.category) {
      entries = entries.filter((entry) => entry.metadata.category === parsed.data.category);
    }
    if (parsed.data.query) {
      const needle = parsed.data.query.toLowerCase();
      entries = entries.filter((entry) =>
        [entry.key, entry.metadata.name, entry.metadata.description ?? ""]
          .some((value) => value.toLowerCase().includes(needle))
      );
    }

    const total = entries.length;
    const items = entries.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit).map((entry) => ({
      key: entry.key,
      metadata: entry.metadata,
      schema: entry.schema,
      lazy: entry.lazy,
      source: entry.source,
      runtime: entry.runtime,
      hasImplementation: Boolean(entry.component),
    }));

    return ok(request, {
      items,
      total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (error) {
    return internalServerError("Failed to list components.", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, componentSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof componentSchema>;
    if (componentCatalog.has(payload.key)) {
      return NextResponse.json(
        errorResponse(APIErrorBuilder.conflict(`Component \"${payload.key}\" already exists.`).build()),
        { status: 409 }
      );
    }

    const created = componentCatalog.registerManifestEntry(payload.key, {
      metadata: payload.metadata,
      schema: payload.schema,
      lazy: payload.lazy,
    });

    return ok(request, {
      key: created.key,
      metadata: created.metadata,
      schema: created.schema,
      lazy: created.lazy,
      source: created.source,
      runtime: created.runtime,
      hasImplementation: Boolean(created.component),
    }, 201, { status: "created" });
  } catch (error) {
    return internalServerError("Failed to register component metadata.", error);
  }
}
