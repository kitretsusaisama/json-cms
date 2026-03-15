import { definePlugin } from "@upflame/plugin-sdk";
export default definePlugin({
    manifest: {
        name: "@upflame/plugin-media",
        version: "1.0.0",
        description: "Registers media-oriented capabilities for starter projects.",
        author: "Upflame",
        cms: {
            permissions: [
                {
                    name: "media:manage",
                    description: "Manage uploaded media assets",
                    resource: "media",
                    actions: ["create", "read", "update", "delete"],
                },
            ],
        },
    },
    lifecycle: {
        async onActivate(ctx) {
            ctx.logger.info("Media plugin activated");
        },
    },
});
//# sourceMappingURL=index.js.map