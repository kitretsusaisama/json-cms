import { describe, expect, it } from "vitest";
import { validateManifest } from "../index";

describe("plugin-sdk manifest validation", () => {
  it("accepts a valid plugin manifest", () => {
    const result = validateManifest({
      name: "@acme/seo",
      version: "1.2.3",
      description: "SEO plugin",
      author: "Acme",
      cms: {
        components: [
          {
            key: "SeoWidget",
            path: "./components/SeoWidget",
          },
        ],
        contentTypes: [
          {
            name: "SeoSettings",
            label: "SEO Settings",
            description: "Settings for SEO defaults",
            fields: [
              {
                name: "titleTemplate",
                label: "Title Template",
                type: "text",
                required: true,
              },
            ],
          },
        ],
        renderers: [
          {
            schemaType: "SeoSettings",
            componentKey: "SeoWidget",
            priority: 200,
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid component keys", () => {
    const result = validateManifest({
      name: "@acme/seo",
      version: "1.2.3",
      description: "SEO plugin",
      author: "Acme",
      cms: {
        components: [
          {
            key: "seo-widget",
            path: "./components/SeoWidget",
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("cms.components.0.key");
  });
});