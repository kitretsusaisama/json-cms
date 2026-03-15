"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffoldDataDirectory = scaffoldDataDirectory;
const path_1 = require("path");
const bootstrap_safety_policy_1 = require("./policy/bootstrap-safety-policy");
async function scaffoldDataDirectory(rootDir, dataDir, options = {}) {
    const dataDirPath = (0, path_1.join)(rootDir, dataDir);
    const dirs = ["pages", "blocks", "settings", "settings/i18n", "settings/overlays", "media", "_schemas"];
    const files = [
        {
            path: (0, path_1.join)(dataDirPath, "pages", "home.json"),
            content: {
                id: "home",
                title: "Home",
                blocks: [],
                prepend: [],
                append: [],
                constraints: [],
                seo: { title: "Home | My Site", description: "Welcome to my @upflame/json-cms powered site" },
            },
        },
        {
            path: (0, path_1.join)(dataDirPath, "settings", "tokens.json"),
            content: {
                "color.primary": "#0070f3",
                "color.secondary": "#7928ca",
                "font.heading": "Inter",
                "spacing.base": "16px",
            },
        },
        {
            path: (0, path_1.join)(dataDirPath, "settings", "i18n", "en.json"),
            content: { welcome: "Welcome", "cta.primary": "Get Started" },
        },
    ];
    const policy = options.policy ??
        (0, bootstrap_safety_policy_1.createBootstrapSafetyPolicy)({
            rootDir,
            ci: options.ci,
            applyExplicitlyRequested: options.applyExplicitlyRequested ?? false,
        });
    const result = await (0, bootstrap_safety_policy_1.applyMutationPlan)(policy, {
        mutations: [
            ...dirs.map((dir) => ({ kind: "mkdir", path: (0, path_1.join)(dataDirPath, dir) })),
            ...files.map((file) => ({
                kind: "writeFile",
                path: file.path,
                content: `${JSON.stringify(file.content, null, 2)}\n`,
                overwrite: false,
            })),
        ],
    });
    if (result.status === "blocked") {
        return [];
    }
    return result.auditLog
        .filter((entry) => entry.status === "applied" && entry.kind === "writeFile")
        .map((entry) => entry.path);
}
//# sourceMappingURL=scaffold.js.map