export const presetCatalog = {
    blog: {
        id: "blog",
        label: "Blog",
        description: "Pages, SEO, and media plugins with starter content.",
        plugins: ["@upflame/plugin-pages", "@upflame/plugin-seo", "@upflame/plugin-media"],
    },
    marketing: {
        id: "marketing",
        label: "Marketing Site",
        description: "Pages and SEO defaults for fast landing page work.",
        plugins: ["@upflame/plugin-pages", "@upflame/plugin-seo"],
    },
    headless: {
        id: "headless",
        label: "Headless CMS",
        description: "Content runtime with the pages plugin only.",
        plugins: ["@upflame/plugin-pages"],
    },
};
export function getPresetDefinition(preset) {
    return presetCatalog[preset];
}
//# sourceMappingURL=presets.js.map