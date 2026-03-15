import { NextRequest } from "next/server";
import { optimizeSeoContent } from "@workspace/core/seo/service";
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
  const content = new URL(request.url).searchParams.get("content") ?? "";

  try {
    const optimization = await optimizeSeoContent(pageId, content);
    return ok(request, optimization);
  } catch (error) {
    return internalServerError(`Failed to optimize SEO for \"${pageId}\".`, error);
  }
}
