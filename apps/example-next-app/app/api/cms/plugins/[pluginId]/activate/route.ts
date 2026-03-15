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
    const activated = await pluginHost.activatePlugin(pluginId);
    return ok(request, activated);
  } catch (error) {
    return internalServerError(`Failed to activate plugin \"${pluginId}\".`, error);
  }
}
