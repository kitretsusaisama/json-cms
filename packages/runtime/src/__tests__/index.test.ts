import { describe, expect, it } from "vitest";
import { bootstrapRuntime } from "../index";

describe("runtime", () => {
  it("returns deterministic bootstrap stages", () => {
    const runtime = bootstrapRuntime({ projectRoot: "/app", plugins: ["pages"] });

    expect(runtime.plugins).toEqual(["pages"]);
    expect(runtime.stages).toEqual(["config-loaded", "plugins-registered", "schema-compiled", "started"]);
  });
});
