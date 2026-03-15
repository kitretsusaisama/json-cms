import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CmsBlockSchema } from "@workspace/core/content/schemas";
import { cmsContentRepository } from "@workspace/core/content/service";
import {
  internalServerError,
  ok,
  paginationSchema,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";
import { errorResponse, APIErrorBuilder } from "@workspace/boilerplate/api/envelope";

const blockFiltersSchema = paginationSchema.extend({
  category: z.string().optional(),
  tags: z.string().optional(),
  query: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = blockFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(APIErrorBuilder.badRequest("Invalid block filters.").withDetails(parsed.error.flatten()).build()),
      { status: 400 }
    );
  }

  try {
    const result = await cmsContentRepository.listBlocks({
      ...parsed.data,
      tags: parsed.data.tags ? parsed.data.tags.split(",") : undefined,
    });
    return ok(request, result);
  } catch (error) {
    return internalServerError("Failed to list blocks.", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, CmsBlockSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof CmsBlockSchema>;
    const existing = await cmsContentRepository.readBlockDocument(payload.id);
    if (existing) {
      return NextResponse.json(
        errorResponse(APIErrorBuilder.conflict(`Block \"${payload.id}\" already exists.`).build()),
        { status: 409 }
      );
    }

    const created = await cmsContentRepository.upsertBlock(payload.id, payload, {
      userId: auth.identity.userId,
    });
    return ok(request, created, 201, { status: "created" });
  } catch (error) {
    return internalServerError("Failed to create block.", error);
  }
}
