import { describe, expect, it } from "vitest";
import { createCmsCore } from "../index";

describe("cms-core", () => {
  it("returns default features", () => {
    const core = createCmsCore({ projectName: "acme" });

    expect(core.hasFeature("schema")).toBe(true);
    expect(core.enabledFeatures).toContain("content");
  });
});
