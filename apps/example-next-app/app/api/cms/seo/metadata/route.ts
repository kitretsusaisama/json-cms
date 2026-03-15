import { NextRequest } from "next/server";
import { z } from "zod";
import { generateSeoMetadataPreview } from "@workspace/core/seo/service";
import { internalServerError, ok, parseRequestBody, requireCmsRole } from "@workspace/core/http/route-utils";
import { SeoRecordSchema } from "@workspace/types/seo";

const metadataSchema = z.object({
  pageId: z.string().optional(),
  pageData: z.record(z.unknown()).optional(),
  context: z.object({
    lang: z.string().optional(),
    seoType: SeoRecordSchema.shape.type.optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, metadataSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const metadata = await generateSeoMetadataPreview(parsed.data);
    return ok(request, metadata);
  } catch (error) {
    return internalServerError("Failed to generate metadata.", error);
  }
}
