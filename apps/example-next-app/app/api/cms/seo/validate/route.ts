import { NextRequest } from "next/server";
import { validateSeoRecord } from "@workspace/core/seo/service";
import { internalServerError, ok, requireCmsRole } from "@workspace/core/http/route-utils";

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const validation = validateSeoRecord(payload);
    return ok(request, validation);
  } catch (error) {
    return internalServerError("Failed to validate SEO data.", error);
  }
}
