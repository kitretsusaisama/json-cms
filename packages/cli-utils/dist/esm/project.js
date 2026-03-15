import { getPresetDefinition } from "./presets";
function frameworkScripts(framework) {
    if (framework === "astro") {
        return {
            dev: "astro dev",
            build: "astro build",
            start: "astro preview",
            typecheck: "astro check",
        };
    }
    if (framework === "remix") {
        return {
            dev: "remix dev",
            build: "remix build",
            start: "remix-serve build",
            typecheck: "tsc --noEmit",
        };
    }
    return {
        dev: "next dev",
        build: "next build",
        start: "next start",
        typecheck: "tsc --noEmit",
    };
}
function frameworkDependencies(framework) {
    if (framework === "astro") {
        return {
            "@upflame/json-cms": "latest",
            "@upflame/adapters": "latest",
            astro: "5.0.0",
        };
    }
    if (framework === "remix") {
        return {
            "@upflame/json-cms": "latest",
            "@upflame/adapters": "latest",
            "@remix-run/node": "2.10.0",
            "@remix-run/react": "2.10.0",
            "@remix-run/serve": "2.10.0",
            react: "18.3.1",
            "react-dom": "18.3.1",
        };
    }
    return {
        "@upflame/json-cms": "latest",
        "@upflame/adapter-nextjs": "latest",
        next: "15.5.0",
        react: "18.3.1",
        "react-dom": "18.3.1",
    };
}
function frameworkDevDependencies(framework) {
    if (framework === "astro") {
        return {
            typescript: "^5.6.2",
        };
    }
    if (framework === "remix") {
        return {
            "@remix-run/dev": "2.10.0",
            "@types/node": "^22.5.1",
            "@types/react": "^18.2.55",
            "@types/react-dom": "^18.2.19",
            typescript: "^5.6.2",
        };
    }
    return {
        "@types/node": "^22.5.1",
        "@types/react": "^18.2.55",
        "@types/react-dom": "^18.2.19",
        typescript: "^5.6.2",
    };
}
export function sanitizeProjectName(input) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "") || "json-cms-app";
}
export function toPackageName(input) {
    return sanitizeProjectName(input);
}
export function buildProjectManifest(options) {
    const preset = getPresetDefinition(options.preset);
    return {
        name: options.packageName,
        version: "0.1.0",
        private: true,
        scripts: frameworkScripts(options.framework),
        dependencies: {
            ...frameworkDependencies(options.framework),
            ...Object.fromEntries(preset.plugins.map((plugin) => [plugin, "latest"])),
        },
        devDependencies: frameworkDevDependencies(options.framework),
    };
}
export function renderCmsConfig(presetId, pluginPackages, framework = "nextjs") {
    const preset = getPresetDefinition(presetId);
    const plugins = pluginPackages?.length ? pluginPackages : preset.plugins;
    const imports = plugins.map((plugin, index) => {
        const importName = `plugin${index + 1}`;
        return `import ${importName} from "${plugin}";`;
    });
    const importNames = plugins.map((_, index) => `plugin${index + 1}`);
    return `${imports.join("\n")}

export default {
  framework: "${framework}",
  preset: "${preset.id}",
  plugins: [${importNames.join(", ")}],
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
`;
}
//# sourceMappingURL=project.js.map