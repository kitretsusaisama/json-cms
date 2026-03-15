import { buildDetectionResult } from "./shared";
import type { FrameworkDetector } from "./types";

export const astroFrameworkDetector: FrameworkDetector = {
  framework: "astro",
  detect(context) {
    return buildDetectionResult({
      framework: "astro",
      context,
      evidenceDefinitions: [
        { kind: "dependency", signal: "astro", weight: 0.42 },
        {
          kind: "config",
          anyOfSignals: ["astro.config.mjs", "astro.config.js", "astro.config.ts", "astro.config.cjs", "astro.config.mts"],
          weight: 0.2,
        },
        { kind: "folder", signal: "src/pages", weight: 0.1 },
        { kind: "folder", signal: "src/content", weight: 0.08 },
        { kind: "script", signal: "astro dev", weight: 0.1 },
        { kind: "runtime-import", signal: "astro:content", weight: 0.1 },
      ],
      conflictDependencies: ["next", "gatsby"],
    });
  },
};
