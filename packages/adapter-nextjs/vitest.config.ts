import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@upflame/adapter-contract/testing",
        replacement: resolve(here, "../adapter-contract/src/testing.ts"),
      },
      {
        find: "@upflame/adapter-contract",
        replacement: resolve(here, "../adapter-contract/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    exclude: ["dist", "node_modules"],
  },
});
