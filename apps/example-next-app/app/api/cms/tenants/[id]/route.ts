import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantRepository } from "@workspace/core/tenants/service";
import {
  internalServerError,
  notFound,
  ok,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
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
  status: z.enum(["active", "suspended", "inactive"]).optional(),
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
    const tenant = await tenantRepository.getTenant(id);
    if (!tenant) {
      return notFound("Tenant", id);
    }

    const usage = await tenantRepository.getTenantUsage(id);
    return ok(request, { ...tenant, usage });
  } catch (error) {
    return internalServerError(`Failed to load tenant "${id}".`, error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await tenantRepository.getTenant(id);
  if (!existing) {
    return notFound("Tenant", id);
  }

  const parsed = await parseRequestBody(request, updateTenantSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof updateTenantSchema>;
    const updated = await tenantRepository.updateTenant(id, payload);
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to update tenant "${id}".`, error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await tenantRepository.getTenant(id);
  if (!existing) {
    return notFound("Tenant", id);
  }

  try {
    const usage = await tenantRepository.getTenantUsage(id);
    const forceDelete = request.nextUrl.searchParams.get("force") === "true";
    if (!forceDelete && (usage.metrics.pages > 0 || usage.metrics.users > 0)) {
      return NextResponse.json(
        {
          data: null,
          errors: [{
            code: "CONFLICT",
            message: `Tenant "${id}" still has active usage. Use ?force=true to override.`,
          }],
          meta: { timestamp: new Date().toISOString(), version: "1.0.0" },
        },
        { status: 409 }
      );
    }

    await tenantRepository.deleteTenant(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalServerError(`Failed to delete tenant "${id}".`, error);
  }
}
