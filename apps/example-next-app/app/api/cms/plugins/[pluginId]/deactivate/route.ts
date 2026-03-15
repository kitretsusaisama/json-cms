import { NextRequest } from "next/server";
import { pluginHost } from "@workspace/core/plugins/host";
import { internalServerError, notFound, ok, requireCmsRole } from "@workspace/core/http/route-utils";

type RouteParams = {
  params: Promise<{ pluginId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const deactivated = await pluginHost.deactivatePlugin(pluginId);
    return ok(request, deactivated);
  } catch (error) {
    return internalServerError(`Failed to deactivate plugin \"${pluginId}\".`, error);
  }
}
