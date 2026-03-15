import { describe, expect, it } from "vitest";
import { ContentSchemaRegistry } from "@/core/registry/schema-registry";
import { RenderRegistry } from "@/core/registry/render-registry";

describe("ContentSchemaRegistry", () => {
  it("registers and compiles content types", () => {
    const registry = new ContentSchemaRegistry();
    registry.register({
      name: "Article",
      label: "Article",
      description: "Blog post",
      fields: [
        {
          name: "title",
          label: "Title",
          type: "text",
          required: true,
        },
      ],
    });

    const compiled = registry.compile("Article");
    expect(compiled).not.toBeNull();
    expect(compiled?.jsonSchema.properties).toHaveProperty("title");
    expect(compiled?.jsonSchema.required).toContain("title");
  });

  it("unregisters plugin content types", () => {
    const registry = new ContentSchemaRegistry();
    registry.register({
      name: "PressRelease",
      label: "Press Release",
      fields: [
        { name: "headline", label: "Headline", type: "text" },
      ],
    }, { source: "plugin", pluginId: "plugin-press" });

    expect(registry.list()).toHaveLength(1);
    registry.unregisterPlugin("plugin-press");
    expect(registry.list()).toHaveLength(0);
  });
});

describe("RenderRegistry", () => {
  it("resolves the highest priority renderer", () => {
    const registry = new RenderRegistry();
    registry.register("Hero", { componentKey: "HeroA", priority: 100 });
    registry.register("Hero", { componentKey: "HeroB", priority: 200 });

    const resolved = registry.resolve("Hero");
    expect(resolved?.componentKey).toBe("HeroB");
  });

  it("cleans up plugin renderers", () => {
    const registry = new RenderRegistry();
    registry.registerPluginRenderer("plugin-ui", "Hero", { componentKey: "HeroUI" });

    expect(registry.list()).toHaveLength(1);
    registry.unregisterPlugin("plugin-ui");
    expect(registry.list()).toHaveLength(0);
  });
});