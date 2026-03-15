const PLUGIN_ALIASES: Record<string, string> = {
  seo: "@upflame/plugin-seo",
  pages: "@upflame/plugin-pages",
  media: "@upflame/plugin-media",
};

export interface PluginAliasResolution {
  readonly input: string;
  readonly packageName: string;
  readonly usedAlias: boolean;
}

export function resolvePluginAlias(input: string): PluginAliasResolution {
  const normalized = input.trim().toLowerCase();
  const aliased = PLUGIN_ALIASES[normalized];

  if (aliased) {
    return {
      input,
      packageName: aliased,
      usedAlias: true,
    };
  }

  if (normalized.startsWith("@") || normalized.includes("/")) {
    return {
      input,
      packageName: normalized,
      usedAlias: false,
    };
  }

  if (normalized.startsWith("plugin-")) {
    return {
      input,
      packageName: `@upflame/${normalized}`,
      usedAlias: false,
    };
  }

  return {
    input,
    packageName: `@upflame/plugin-${normalized}`,
    usedAlias: false,
  };
}

export function getPluginAliasMap(): Readonly<Record<string, string>> {
  return PLUGIN_ALIASES;
}
