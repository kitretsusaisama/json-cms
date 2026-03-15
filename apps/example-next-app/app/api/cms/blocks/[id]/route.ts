import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CmsBlockSchema } from "@workspace/core/content/schemas";
import { cmsContentRepository } from "@workspace/core/content/service";
import {
  internalServerError,
  notFound,
  ok,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";

const updateBlockSchema = CmsBlockSchema.partial();
const usageSchema = z.object({
  pageId: z.string().min(1),
  position: z.number().int().nonnegative().optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const block = await cmsContentRepository.readBlockDocument(id);
    if (!block) {
      return notFound("Block", id);
    }

    const usage = await cmsContentRepository.findBlockUsage(id);
    return ok(request, { ...block, usage });
  } catch (error) {
    return internalServerError(`Failed to load block \"${id}\".`, error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await cmsContentRepository.readBlockDocument(id);
  if (!existing) {
    return notFound("Block", id);
  }

  const parsed = await parseRequestBody(request, updateBlockSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as Partial<z.infer<typeof CmsBlockSchema>>;
    const updated = await cmsContentRepository.upsertBlock(id, {
      ...existing,
      ...payload,
      id,
    }, {
      userId: auth.identity.userId,
    });
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to update block \"${id}\".`, error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await cmsContentRepository.readBlockDocument(id);
  if (!existing) {
    return notFound("Block", id);
  }

  try {
    const usage = await cmsContentRepository.findBlockUsage(id);
    if (usage.length > 0) {
      return NextResponse.json(
        {
          data: null,
          errors: [
            {
              code: "CONFLICT",
              message: `Block \"${id}\" is still referenced by pages: ${usage.join(", ")}`,
              timestamp: new Date().toISOString(),
            },
          ],
          meta: {
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          },
        },
        { status: 409 }
      );
    }

    await cmsContentRepository.deleteBlock(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalServerError(`Failed to delete block \"${id}\".`, error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "editor");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await cmsContentRepository.readBlockDocument(id);
  if (!existing) {
    return notFound("Block", id);
  }

  const parsed = await parseRequestBody(request, usageSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const usage = Array.isArray(existing.metadata?.usage)
      ? [...(existing.metadata?.usage as Array<Record<string, unknown>>)]
      : [];
    usage.push({
      pageId: parsed.data.pageId,
      position: parsed.data.position ?? usage.length,
      recordedAt: new Date().toISOString(),
    });

    const updated = await cmsContentRepository.upsertBlock(id, {
      ...existing,
      metadata: {
        ...existing.metadata,
        usage,
      },
    }, {
      userId: auth.identity.userId,
    });
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to record block usage for \"${id}\".`, error);
  }
}
