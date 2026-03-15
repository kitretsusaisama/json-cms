import { describe, expect, it } from "vitest";
import { definePlugin } from "../index";

describe("plugin-sdk definePlugin", () => {
  it("applies default lifecycle hooks", async () => {
    const plugin = definePlugin({
      manifest: {
        name: "@acme/example-plugin",
        version: "1.0.0",
        description: "Example plugin",
        author: "Acme",
        cms: {},
      },
      lifecycle: {
        async onActivate() {
          // No-op for test coverage.
        },
      },
    });

    expect(plugin.manifest.name).toBe("@acme/example-plugin");
    expect(plugin.lifecycle.onDeactivate).toBeTypeOf("function");
    expect(plugin.lifecycle.onInstall).toBeTypeOf("function");

    const health = await plugin.lifecycle.onHealthCheck?.({} as never);
    expect(health?.status).toBe("healthy");
  });
});
