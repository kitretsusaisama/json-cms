import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantRepository } from "@workspace/core/tenants/service";
import {
  internalServerError,
  ok,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).optional(),
  subdomain: z.string().regex(/^[a-z0-9-]+$/).optional(),
  settings: z.object({
    theme: z.object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      logo: z.string().optional(),
      favicon: z.string().optional(),
    }).optional(),
    branding: z.object({
      companyName: z.string().optional(),
      tagline: z.string().optional(),
      footerText: z.string().optional(),
    }).optional(),
    localization: z.object({
      defaultLocale: z.string().optional(),
      supportedLocales: z.array(z.string()).optional(),
      timezone: z.string().optional(),
    }).optional(),
    content: z.object({
      defaultPageTemplate: z.string().optional(),
      allowedComponents: z.array(z.string()).optional(),
      maxPages: z.number().optional(),
      maxBlocks: z.number().optional(),
    }).optional(),
    security: z.object({
      allowedDomains: z.array(z.string()).optional(),
      requireSSL: z.boolean().optional(),
      enableAuditLog: z.boolean().optional(),
    }).optional(),
  }).optional(),
  features: z.record(z.boolean()).optional(),
  limits: z.object({
    maxUsers: z.number().optional(),
    maxPages: z.number().optional(),
    maxBlocks: z.number().optional(),
    maxComponents: z.number().optional(),
    maxStorage: z.number().optional(),
    maxApiRequests: z.number().optional(),
    maxBandwidth: z.number().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const tenantFiltersSchema = z.object({
  status: z.enum(["active", "suspended", "inactive"]).optional(),
  domain: z.string().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = tenantFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        errors: [{ code: "VALIDATION_ERROR", message: "Invalid tenant filters." }],
        meta: { timestamp: new Date().toISOString(), version: "1.0.0" },
      },
      { status: 400 }
    );
  }

  try {
    const tenants = await tenantRepository.listTenants(parsed.data);
    const items = tenants.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit);
    return ok(request, {
      items,
      total: tenants.length,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      hasMore: parsed.data.offset + parsed.data.limit < tenants.length,
    });
  } catch (error) {
    return internalServerError("Failed to list tenants.", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, createTenantSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof createTenantSchema>;
    const existing = payload.domain
      ? await tenantRepository.listTenants({ domain: payload.domain })
      : payload.subdomain
        ? await tenantRepository.listTenants({ domain: payload.subdomain })
        : [];

    if (existing.length > 0) {
      return NextResponse.json(
        {
          data: null,
          errors: [{ code: "CONFLICT", message: "Domain or subdomain already in use." }],
          meta: { timestamp: new Date().toISOString(), version: "1.0.0" },
        },
        { status: 409 }
      );
    }

    const created = await tenantRepository.createTenant(payload);
    return ok(request, created, 201, { status: "created" });
  } catch (error) {
    return internalServerError("Failed to create tenant.", error);
  }
}
