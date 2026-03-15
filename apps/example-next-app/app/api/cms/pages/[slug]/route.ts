import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CmsPageSchema } from "@workspace/core/content/schemas";
import { cmsContentRepository } from "@workspace/core/content/service";
import {
  internalServerError,
  notFound,
  ok,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";

const updatePageSchema = CmsPageSchema.partial();

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { slug } = await params;

  try {
    const page = await cmsContentRepository.readPageDocument(slug);
    if (!page) {
      return notFound("Page", slug);
    }
    return ok(request, page);
  } catch (error) {
    return internalServerError(`Failed to load page \"${slug}\".`, error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { slug } = await params;
  const existing = await cmsContentRepository.readPageDocument(slug);
  if (!existing) {
    return notFound("Page", slug);
  }

  const parsed = await parseRequestBody(request, updatePageSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as Partial<z.infer<typeof CmsPageSchema>>;
    const updated = await cmsContentRepository.upsertPage(slug, {
      ...existing,
      ...payload,
      slug,
    }, {
      userId: auth.identity.userId,
    });
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to update page \"${slug}\".`, error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { slug } = await params;
  const existing = await cmsContentRepository.readPageDocument(slug);
  if (!existing) {
    return notFound("Page", slug);
  }

  try {
    await cmsContentRepository.deletePage(slug);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalServerError(`Failed to delete page \"${slug}\".`, error);
  }
}
