import pluginPages from "@upflame/plugin-pages";
import pluginSeo from "@upflame/plugin-seo";
import pluginMedia from "@upflame/plugin-media";

export default {
  framework: "nextjs",
  preset: "blog",
  plugins: [pluginPages, pluginSeo, pluginMedia],
};
