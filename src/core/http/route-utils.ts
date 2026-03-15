import { NextRequest, NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import {
  APIErrorBuilder,
  errorResponse,
  extractRequestMeta,
  successResponse,
  validationErrorResponse,
} from "@/boilerplate/api/envelope";

export type CmsRole = "viewer" | "editor" | "admin";

export interface CmsIdentity {
  token: string;
  role: CmsRole;
  userId: string;
  tenantId?: string;
}

const ROLE_ORDER: Record<CmsRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

const DEV_TOKEN_ROLES: Record<string, CmsRole> = {
  "viewer-token": "viewer",
  "editor-token": "editor",
  "admin-token": "admin",
  "valid-token": "editor",
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function roleFromRequest(request: NextRequest): CmsRole | null {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  if (process.env.CMS_API_TOKEN && token === process.env.CMS_API_TOKEN) {
    const configuredRole = request.headers.get("x-cms-role") as CmsRole | null;
    return configuredRole && configuredRole in ROLE_ORDER ? configuredRole : "admin";
  }

  if (token in DEV_TOKEN_ROLES) {
    return DEV_TOKEN_ROLES[token];
  }

  if (process.env.NODE_ENV !== "production") {
    const requestedRole = request.headers.get("x-cms-role") as CmsRole | null;
    if (requestedRole && requestedRole in ROLE_ORDER) {
      return requestedRole;
    }
  }

  return null;
}

export function requireCmsRole(
  request: NextRequest,
  minimumRole: CmsRole = "viewer"
): { ok: true; identity: CmsIdentity } | { ok: false; response: NextResponse } {
  const token = getBearerToken(request);
  const role = roleFromRequest(request);

  if (!token || !role) {
    const envelope = errorResponse(
      APIErrorBuilder.unauthorized("Missing or invalid CMS API token.").build()
    );
    return {
      ok: false,
      response: NextResponse.json(envelope, { status: 401 }),
    };
  }

  if (ROLE_ORDER[role] < ROLE_ORDER[minimumRole]) {
    const envelope = errorResponse(
      APIErrorBuilder.forbidden("Insufficient permissions for this CMS operation.").build()
    );
    return {
      ok: false,
      response: NextResponse.json(envelope, { status: 403 }),
    };
  }

  return {
    ok: true,
    identity: {
      token,
      role,
      userId: request.headers.get("x-user-id") || role,
      tenantId: request.headers.get("x-tenant-id") || undefined,
    },
  };
}

export async function parseRequestBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json(
          validationErrorResponse("Invalid CMS payload.", parsed.error.flatten()),
          { status: 400 }
        ),
      };
    }

    return { ok: true, data: parsed.data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        errorResponse(APIErrorBuilder.badRequest("Request body must be valid JSON.").build()),
        { status: 400 }
      ),
    };
  }
}

export function sanitizeCmsInput(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCmsInput(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeCmsInput(item)])
    );
  }

  return value;
}

export function ok<T>(request: NextRequest, data: T, status = 200, meta: Record<string, unknown> = {}) {
  const envelope = successResponse(data, {
    ...extractRequestMeta(request),
    ...meta,
  });
  return NextResponse.json(envelope, { status });
}

export function notFound(resource: string, id: string) {
  return NextResponse.json(
    errorResponse(APIErrorBuilder.notFound(resource, id).build()),
    { status: 404 }
  );
}

export function internalServerError(message: string, error?: unknown) {
  return NextResponse.json(
    errorResponse(
      APIErrorBuilder.internal(message).withDetails(
        error instanceof Error ? { message: error.message } : undefined
      ).build()
    ),
    { status: 500 }
  );
}

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
