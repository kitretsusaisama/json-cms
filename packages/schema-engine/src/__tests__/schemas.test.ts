import { describe, expect, it } from "vitest";
import {
  CmsPageSchema,
  defineContentType,
  RuntimePageSchema,
} from "../index";

describe("schema-engine", () => {
  it("builds content type definitions", () => {
    const result = defineContentType({
      name: "page",
      label: "Page",
      fields: [
        {
          name: "title",
          label: "Title",
          type: "text",
        },
      ],
    });

    expect(result.name).toBe("page");
  });

  it("validates page documents", () => {
    const page = CmsPageSchema.parse({
      title: "Home",
      blocks: [],
    });

    expect(page.title).toBe("Home");
    expect(RuntimePageSchema.parse({
      id: "home",
      title: "Home",
      blocks: [],
      context: {},
    }).id).toBe("home");
  });
});
