import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@upflame/schema-engine": path.resolve(__dirname, "../schema-engine/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["dist", "node_modules"],
  },
});
