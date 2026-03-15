import { buildDetectionResult } from "./shared";
export const nextFrameworkDetector = {
    framework: "next",
    detect(context) {
        return buildDetectionResult({
            framework: "next",
            context,
            evidenceDefinitions: [
                { kind: "dependency", signal: "next", weight: 0.4 },
                {
                    kind: "config",
                    anyOfSignals: ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"],
                    weight: 0.24,
                },
                { kind: "folder", signal: "app", weight: 0.12 },
                { kind: "folder", signal: "pages", weight: 0.06 },
                { kind: "script", signal: "next dev", weight: 0.08 },
                { kind: "runtime-import", signal: "next/server", weight: 0.1 },
            ],
            conflictDependencies: ["astro", "gatsby"],
        });
    },
};
//# sourceMappingURL=next.js.map