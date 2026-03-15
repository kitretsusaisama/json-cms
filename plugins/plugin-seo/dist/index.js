import { definePlugin } from "@upflame/plugin-sdk";
export default definePlugin({
    manifest: {
        name: "@upflame/plugin-seo",
        version: "1.0.0",
        description: "Adds SEO defaults and metadata hooks.",
        author: "Upflame",
        cms: {
            hooks: [
                {
                    name: "page:before-render",
                    handler: "./hooks/seo",
                },
            ],
        },
    },
    lifecycle: {
        async onActivate(ctx) {
            ctx.logger.info("SEO plugin activated");
        },
    },
});
//# sourceMappingURL=index.js.map