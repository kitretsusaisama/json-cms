"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatsbyFrameworkDetector = void 0;
const shared_1 = require("./shared");
exports.gatsbyFrameworkDetector = {
    framework: "gatsby",
    detect(context) {
        return (0, shared_1.buildDetectionResult)({
            framework: "gatsby",
            context,
            evidenceDefinitions: [
                { kind: "dependency", signal: "gatsby", weight: 0.42 },
                {
                    kind: "config",
                    anyOfSignals: ["gatsby-config.js", "gatsby-config.mjs", "gatsby-config.ts", "gatsby-config.cjs"],
                    weight: 0.2,
                },
                {
                    kind: "config",
                    anyOfSignals: ["gatsby-node.js", "gatsby-node.mjs", "gatsby-node.ts", "gatsby-node.cjs"],
                    weight: 0.08,
                },
                { kind: "folder", signal: "src/pages", weight: 0.08 },
                { kind: "script", signal: "gatsby develop", weight: 0.12 },
                { kind: "runtime-import", signal: "gatsby", weight: 0.1 },
            ],
            conflictDependencies: ["next", "astro"],
        });
    },
};
//# sourceMappingURL=gatsby.js.map