import { describe, expect, it } from "vitest";
import { astroFrameworkDetector } from "../framework-detectors/astro";
import { gatsbyFrameworkDetector } from "../framework-detectors/gatsby";
import { nextFrameworkDetector } from "../framework-detectors/next";
import { selectFramework } from "../framework-detectors/policy";

describe("framework detectors", () => {
  it("collects evidence and conflicts for Next.js", () => {
    const result = nextFrameworkDetector.detect({
      packageJson: {
        dependencies: { next: "15.0.0", astro: "4.0.0" },
        scripts: { dev: "next dev" },
      },
      configFiles: ["next.config.mjs"],
      folders: ["app"],
      runtimeImports: ["next/server"],
    });

    expect(result.framework).toBe("next");
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.evidence.some((item) => item.kind === "dependency" && item.matched)).toBe(true);
    expect(result.conflicts).toContain("astro");
  });

  it("detects Astro and Gatsby independently", () => {
    const astro = astroFrameworkDetector.detect({
      packageJson: { dependencies: { astro: "4.0.0" }, scripts: { dev: "astro dev" } },
      configFiles: ["astro.config.mjs"],
      runtimeImports: ["astro:content"],
      folders: ["src/pages"],
    });

    const gatsby = gatsbyFrameworkDetector.detect({
      packageJson: { dependencies: { gatsby: "5.0.0" }, scripts: { dev: "gatsby develop" } },
      configFiles: ["gatsby-config.js"],
      runtimeImports: ["gatsby"],
      folders: ["src/pages"],
    });

    expect(astro.score).toBeGreaterThan(0.7);
    expect(gatsby.score).toBeGreaterThan(0.7);
  });

  it("matches Astro projects using non-mjs config variants", () => {
    const astro = astroFrameworkDetector.detect({
      packageJson: { dependencies: { astro: "4.0.0" }, scripts: { dev: "astro dev" } },
      configFiles: ["astro.config.ts"],
      runtimeImports: ["astro:content"],
      folders: ["src/pages"],
    });

    expect(astro.score).toBeGreaterThan(0.75);
    expect(astro.evidence.some((item) => item.kind === "config" && item.matched)).toBe(true);
  });

  it("matches Gatsby projects using ts/mjs config variants", () => {
    const gatsby = gatsbyFrameworkDetector.detect({
      packageJson: { dependencies: { gatsby: "5.0.0" }, scripts: { dev: "gatsby develop" } },
      configFiles: ["gatsby-config.mjs", "gatsby-node.ts"],
      runtimeImports: ["gatsby"],
      folders: ["src/pages"],
    });

    expect(gatsby.score).toBeGreaterThan(0.85);
    expect(gatsby.evidence.filter((item) => item.kind === "config" && item.matched)).toHaveLength(2);
  });
});

describe("framework selection policy", () => {
  it("auto-selects when above threshold", () => {
    const decision = selectFramework([
      { framework: "next", score: 0.9, evidence: [], conflicts: [] },
      { framework: "astro", score: 0.5, evidence: [], conflicts: [] },
    ]);

    expect(decision.outcome).toBe("selected");
    if (decision.outcome === "selected") {
      expect(decision.framework).toBe("next");
      expect(decision.reason).toBe("auto");
    }
  });

  it("requests disambiguation for close scores in interactive mode", () => {
    const decision = selectFramework([
      { framework: "next", score: 0.84, evidence: [], conflicts: [] },
      { framework: "astro", score: 0.81, evidence: [], conflicts: [] },
    ]);

    expect(decision.outcome).toBe("disambiguate");
  });

  it("fails deterministically in CI without override", () => {
    const decision = selectFramework(
      [
        { framework: "next", score: 0.84, evidence: [], conflicts: [] },
        { framework: "astro", score: 0.81, evidence: [], conflicts: [] },
      ],
      { ci: true, interactive: false }
    );

    expect(decision.outcome).toBe("failed");
    if (decision.outcome === "failed") {
      expect(decision.reason).toBe("ci-requires-override");
      expect(decision.message).toContain("--framework");
    }
  });

  it("honors explicit --framework override", () => {
    const decision = selectFramework(
      [
        { framework: "next", score: 0.2, evidence: [], conflicts: [] },
        { framework: "astro", score: 0.9, evidence: [], conflicts: [] },
      ],
      { overrideFramework: "next", ci: true, interactive: false }
    );

    expect(decision.outcome).toBe("selected");
    if (decision.outcome === "selected") {
      expect(decision.framework).toBe("next");
      expect(decision.reason).toBe("override");
    }
  });
});
