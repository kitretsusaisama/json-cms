import { NextRequest } from "next/server";
import { pluginHost } from "@workspace/core/plugins/host";
import { internalServerError, notFound, ok, requireCmsRole } from "@workspace/core/http/route-utils";

type RouteParams = {
  params: Promise<{ pluginId: string }>;
};

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

  try {
    const dependencies = await pluginHost.getPluginDependencies(pluginId);
    return ok(request, { pluginId, dependencies });
  } catch (error) {
    return internalServerError(`Failed to load dependencies for plugin \"${pluginId}\".`, error);
  }
}
