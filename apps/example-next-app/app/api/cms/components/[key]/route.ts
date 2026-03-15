import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { componentCatalog } from "@workspace/core/components/catalog";
import {
  internalServerError,
  notFound,
  ok,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";

const updateComponentSchema = z.object({
  metadata: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    category: z.string().min(1).max(100).optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    slots: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      accepts: z.array(z.string()).optional(),
    })).optional(),
    variants: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      props: z.record(z.unknown()).optional(),
    })).optional(),
  }).optional(),
  schema: z.record(z.unknown()).optional(),
  lazy: z.boolean().optional(),
});

const validatePropsSchema = z.object({
  props: z.record(z.unknown()),
});

type RouteParams = {
  params: Promise<{ key: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { key } = await params;
  const entry = componentCatalog.get(key);
  if (!entry) {
    return notFound("Component", key);
  }

  return ok(request, {
    key: entry.key,
    metadata: entry.metadata,
    schema: entry.schema,
    lazy: entry.lazy,
    source: entry.source,
    runtime: entry.runtime,
    hasImplementation: Boolean(entry.component),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { key } = await params;
  if (!componentCatalog.has(key)) {
    return notFound("Component", key);
  }

  const parsed = await parseRequestBody(request, updateComponentSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof updateComponentSchema>;
    const existing = componentCatalog.get(key);
    if (!existing) {
      return notFound("Component", key);
    }

    const updated = componentCatalog.updateEntry(key, {
      ...payload,
      metadata: payload.metadata
        ? {
            ...existing.metadata,
            ...payload.metadata,
            name: payload.metadata.name ?? existing.metadata.name,
            category: payload.metadata.category ?? existing.metadata.category,
            version: payload.metadata.version ?? existing.metadata.version,
          }
        : undefined,
    });
    if (!updated) {
      return notFound("Component", key);
    }

    return ok(request, {
      key: updated.key,
      metadata: updated.metadata,
      schema: updated.schema,
      lazy: updated.lazy,
      source: updated.source,
      runtime: updated.runtime,
      hasImplementation: Boolean(updated.component),
    });
  } catch (error) {
    return internalServerError(`Failed to update component \"${key}\".`, error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { key } = await params;
  if (!componentCatalog.has(key)) {
    return notFound("Component", key);
  }

  componentCatalog.unregister(key);
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { key } = await params;
  if (!componentCatalog.has(key)) {
    return notFound("Component", key);
  }

  const parsed = await parseRequestBody(request, validatePropsSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    return ok(request, componentCatalog.validateProps(key, parsed.data.props));
  } catch (error) {
    return internalServerError(`Failed to validate component \"${key}\".`, error);
  }
}
