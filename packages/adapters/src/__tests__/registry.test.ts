import { describe, expect, it } from "vitest";

import { AdapterRegistry, adapterRegistry, satisfiesVersion } from "../registry";

describe("AdapterRegistry", () => {
  it("resolves nextjs adapter by framework, version, and capabilities", () => {
    const resolved = adapterRegistry.resolve({
      framework: "nextjs",
      version: "15.1.0",
      requiredCapabilities: ["edge", "preview"],
    });

    expect(resolved?.id).toBe("nextjs");
    expect(resolved?.entrypoint).toBe("@upflame/adapters/nextjs");
  });

  it("returns undefined when capabilities are not supported", () => {
    const registry = new AdapterRegistry();

    const resolved = registry.resolve({
      framework: "gatsby",
      version: "5.4.0",
      requiredCapabilities: ["isr"],
    });

    expect(resolved).toBeUndefined();
  });

  it("provides a capability matrix keyed by adapter id", () => {
    const matrix = adapterRegistry.capabilityMatrix();

    expect(matrix.nextjs).toContain("middleware");
    expect(matrix.astro).toContain("ssg");
    expect(matrix.remix).toContain("ssr");
    expect(matrix.gatsby).toContain("preview");
  });

  it("preserves all entries in framework matrix when ids share a framework", () => {
    const registry = new AdapterRegistry([
      {
        id: "nextjs-v15",
        framework: "nextjs",
        packageName: "@upflame/adapters",
        displayName: "Next.js 15",
        versionRange: ">=15.0.0",
        capabilities: ["ssr", "edge"],
        entrypoint: "@upflame/adapters/nextjs",
      },
      {
        id: "nextjs-v16",
        framework: "nextjs",
        packageName: "@upflame/adapters",
        displayName: "Next.js 16",
        versionRange: ">=16.0.0",
        capabilities: ["ssr", "middleware"],
        entrypoint: "@upflame/adapters/nextjs",
      },
    ]);

    const frameworkMatrix = registry.capabilityMatrixByFramework();

    expect(frameworkMatrix.nextjs).toHaveLength(2);
    expect(frameworkMatrix.nextjs[0]).toContain("edge");
    expect(frameworkMatrix.nextjs[1]).toContain("middleware");
  });
});

describe("satisfiesVersion", () => {
  it("returns false for invalid version or range input", () => {
    expect(satisfiesVersion("foo", ">=1.2.3")).toBe(false);
    expect(satisfiesVersion("1.2.3", ">=foo")).toBe(false);
    expect(satisfiesVersion("foo", "bar")).toBe(false);
  });
});
