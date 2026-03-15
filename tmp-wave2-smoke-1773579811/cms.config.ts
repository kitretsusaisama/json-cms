import plugin1 from "@upflame/plugin-pages";
import plugin2 from "@upflame/plugin-seo";

export default {
  framework: "nextjs",
  preset: "marketing",
  plugins: [plugin1, plugin2],
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
