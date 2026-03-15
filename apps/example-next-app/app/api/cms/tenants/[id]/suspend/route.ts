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

const suspendTenantSchema = z.object({
  reason: z.string().min(1).max(500),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const existing = await tenantRepository.getTenant(id);
  if (!existing) {
    return notFound("Tenant", id);
  }
  if (existing.status === "suspended") {
    return NextResponse.json(
      {
        data: null,
        errors: [{ code: "CONFLICT", message: "Tenant is already suspended." }],
        meta: { timestamp: new Date().toISOString(), version: "1.0.0" },
      },
      { status: 409 }
    );
  }

  const parsed = await parseRequestBody(request, suspendTenantSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof suspendTenantSchema>;
    const updated = await tenantRepository.suspendTenant(id, payload.reason);
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to suspend tenant "${id}".`, error);
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
  if (existing.status !== "suspended") {
    return NextResponse.json(
      {
        data: null,
        errors: [{ code: "CONFLICT", message: "Tenant is not suspended." }],
        meta: { timestamp: new Date().toISOString(), version: "1.0.0" },
      },
      { status: 409 }
    );
  }

  try {
    const updated = await tenantRepository.activateTenant(id);
    return ok(request, updated);
  } catch (error) {
    return internalServerError(`Failed to activate tenant "${id}".`, error);
  }
}
