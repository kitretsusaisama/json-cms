import { NextRequest } from "next/server";
import { getSeoHealth } from "@workspace/core/seo/service";
import { internalServerError, ok, requireCmsRole } from "@workspace/core/http/route-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { pageId } = await params;

  try {
    const health = await getSeoHealth(pageId);
    return ok(request, health);
  } catch (error) {
    return internalServerError(`Failed to load SEO health for \"${pageId}\".`, error);
  }
}
