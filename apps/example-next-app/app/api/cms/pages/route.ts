import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CmsPageSchema, WorkflowStatusSchema } from "@workspace/core/content/schemas";
import { cmsContentRepository, normalizeContentSlug } from "@workspace/core/content/service";
import {
  internalServerError,
  ok,
  paginationSchema,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";
import { errorResponse, APIErrorBuilder } from "@workspace/boilerplate/api/envelope";

const pageFiltersSchema = paginationSchema.extend({
  status: WorkflowStatusSchema.optional(),
  query: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = pageFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(APIErrorBuilder.badRequest("Invalid page filters.").withDetails(parsed.error.flatten()).build()),
      { status: 400 }
    );
  }

  try {
    const result = await cmsContentRepository.listPages(parsed.data);
    return ok(request, result);
  } catch (error) {
    return internalServerError("Failed to list pages.", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, CmsPageSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof CmsPageSchema>;
    const slug = normalizeContentSlug(payload.slug || payload.id || payload.title);
    const existing = await cmsContentRepository.readPageDocument(slug);
    if (existing) {
      return NextResponse.json(
        errorResponse(APIErrorBuilder.conflict(`Page "${existing.slug}" already exists.`).build()),
        { status: 409 }
      );
    }

    const created = await cmsContentRepository.upsertPage(slug, payload, {
      userId: auth.identity.userId,
    });
    return ok(request, created, 201, { status: "created" });
  } catch (error) {
    return internalServerError("Failed to create page.", error);
  }
}

