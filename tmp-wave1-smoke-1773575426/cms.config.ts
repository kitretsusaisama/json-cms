import plugin1 from "@upflame/plugin-pages";
import plugin2 from "@upflame/plugin-seo";
import plugin3 from "@upflame/plugin-media";

export default {
  framework: "nextjs",
  preset: "blog",
  plugins: [plugin1, plugin2, plugin3],
  content: {
    types: [
      {
        name: "page",
        label: "Page",
        fields: [
          { name: "title", type: "text" },
          { name: "slug", type: "text" },
          { name: "content", type: "json" }
        ]
      }
    ]
  }
};
