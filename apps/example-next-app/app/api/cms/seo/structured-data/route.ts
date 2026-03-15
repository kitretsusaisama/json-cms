import { NextRequest } from "next/server";
import { z } from "zod";
import { buildStructuredDataPayload } from "@workspace/core/seo/service";
import { internalServerError, ok, parseRequestBody, requireCmsRole } from "@workspace/core/http/route-utils";

const structuredDataSchema = z.object({
  pageId: z.string().optional(),
  pageData: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, structuredDataSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const structuredData = buildStructuredDataPayload(parsed.data);
    return ok(request, structuredData);
  } catch (error) {
    return internalServerError("Failed to generate structured data.", error);
  }
}
