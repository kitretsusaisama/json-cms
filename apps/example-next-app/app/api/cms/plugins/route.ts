import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pluginHost } from "@workspace/core/plugins/host";
import {
  internalServerError,
  ok,
  paginationSchema,
  parseRequestBody,
  requireCmsRole,
  sanitizeCmsInput,
} from "@workspace/core/http/route-utils";
import { errorResponse, APIErrorBuilder } from "@workspace/boilerplate/api/envelope";

const installPluginSchema = z.object({
  pluginId: z.string().min(1).optional(),
  pluginPath: z.string().min(1),
  autoActivate: z.boolean().default(false),
});

const pluginFiltersSchema = paginationSchema.extend({
  status: z.enum(["active", "inactive", "all"]).default("all"),
  query: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = pluginFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(APIErrorBuilder.badRequest("Invalid plugin filters.").withDetails(parsed.error.flatten()).build()),
      { status: 400 }
    );
  }

  try {
    let plugins = await pluginHost.listPlugins();
    if (parsed.data.status !== "all") {
      plugins = plugins.filter((plugin) =>
        parsed.data.status === "active" ? plugin.active : !plugin.active
      );
    }
    if (parsed.data.query) {
      const needle = parsed.data.query.toLowerCase();
      plugins = plugins.filter((plugin) =>
        [plugin.id, plugin.manifest.name, plugin.manifest.description]
          .some((value) => value.toLowerCase().includes(needle))
      );
    }

    const total = plugins.length;
    const items = plugins.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit);
    return ok(request, {
      items,
      total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (error) {
    return internalServerError("Failed to list plugins.", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestBody(request, installPluginSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const payload = sanitizeCmsInput(parsed.data) as z.infer<typeof installPluginSchema>;
    const installed = await pluginHost.installPlugin(payload);
    return ok(request, installed, 201, { status: "created" });
  } catch (error) {
    return internalServerError("Failed to install plugin.", error);
  }
}
