import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pluginHost } from "@workspace/core/plugins/host";
import {
  internalServerError,
  notFound,
  ok,
  parseRequestBody,
  requireCmsRole,
} from "@workspace/core/http/route-utils";

type RouteParams = {
  params: Promise<{ pluginId: string }>;
};

const updatePluginSchema = z.object({
  autoActivate: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { pluginId } = await params;
  const plugin = await pluginHost.getPlugin(pluginId);
  if (!plugin) {
    return notFound("Plugin", pluginId);
  }

  return ok(request, plugin);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const { pluginId } = await params;
  const plugin = await pluginHost.getPlugin(pluginId);
  if (!plugin) {
    return notFound("Plugin", pluginId);
  }

  const parsed = await parseRequestBody(request, updatePluginSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const nextState = parsed.data.autoActivate ? await pluginHost.activatePlugin(pluginId) : plugin;
    return ok(request, nextState);
  } catch (error) {
    return internalServerError(`Failed to update plugin \"${pluginId}\".`, error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = requireCmsRole(request, "admin");
  if (!auth.ok) {
    return auth.response;
  }

  const { pluginId } = await params;
  const plugin = await pluginHost.getPlugin(pluginId);
  if (!plugin) {
    return notFound("Plugin", pluginId);
  }

  try {
    await pluginHost.uninstallPlugin(pluginId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalServerError(`Failed to uninstall plugin \"${pluginId}\".`, error);
  }
}
