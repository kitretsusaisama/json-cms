import { definePlugin } from "@upflame/plugin-sdk";

export default definePlugin({
  manifest: {
    name: "@upflame/plugin-pages",
    version: "1.0.0",
    description: "Provides page content primitives and starter routes.",
    author: "Upflame",
    cms: {
      components: [
        {
          key: "PageHero",
          path: "./components/PageHero",
          category: "layout",
        },
      ],
    },
  },
  lifecycle: {
    async onActivate(ctx) {
      ctx.logger.info("Pages plugin activated");
    },
  },
});
