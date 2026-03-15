const STATE_START = "// cms-plugin-state:start";
const STATE_END = "// cms-plugin-state:end";

export interface PluginProjectState {
  readonly plugins: readonly string[];
}

function normalizePluginList(plugins: readonly string[]): string[] {
  return [...new Set(plugins)].sort((a, b) => a.localeCompare(b));
}

function renderStateBlock(state: PluginProjectState): string {
  const plugins = normalizePluginList(state.plugins);
  const values = plugins.map((plugin) => `    ${JSON.stringify(plugin)}`).join(",\n");

  return [
    `  ${STATE_START}`,
    "  pluginPackages: [",
    values,
    "  ],",
    `  ${STATE_END}`,
  ].join("\n");
}

function hasStateBlock(source: string): boolean {
  return source.includes(STATE_START) && source.includes(STATE_END);
}

function findExportDefaultObjectRange(source: string): { openBrace: number } | null {
  const exportMatch = /export\s+default\s*\{/.exec(source);
  if (!exportMatch) {
    return null;
  }

  const openBrace = source.indexOf("{", exportMatch.index);
  if (openBrace < 0) {
    return null;
  }

  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const prev = source[index - 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
      if (char === "/" && next === "/") {
        inLineComment = true;
        index += 1;
        continue;
      }

      if (char === "/" && next === "*") {
        inBlockComment = true;
        index += 1;
        continue;
      }
    }

    if (!inDoubleQuote && !inTemplate && char === "'" && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !inTemplate && char === '"' && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "`" && prev !== "\\") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inTemplate) {
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          openBrace,
        };
      }
    }
  }

  return null;
}

export function readPluginState(source: string): PluginProjectState {
  const blockMatch = source.match(new RegExp(`${STATE_START}[\\s\\S]*?pluginPackages\\s*:\\s*\\[([\\s\\S]*?)\\][\\s\\S]*?${STATE_END}`));
  if (!blockMatch) {
    return { plugins: [] };
  }

  const matches = [...blockMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return { plugins: normalizePluginList(matches) };
}

export function writePluginState(source: string, state: PluginProjectState): string {
  const rendered = renderStateBlock(state);

  if (hasStateBlock(source)) {
    return source.replace(new RegExp(`${STATE_START}[\\s\\S]*?${STATE_END}`), rendered.trimStart());
  }

  const exportObjectRange = findExportDefaultObjectRange(source);
  if (!exportObjectRange) {
    throw new Error("Could not locate `export default { ... }` in cms.config.ts");
  }

  const insertion = `${rendered}\n`;
  const before = source.slice(0, exportObjectRange.openBrace + 1);
  const after = source.slice(exportObjectRange.openBrace + 1);

  return `${before}\n${insertion}${after}`;
}

export function addPluginToState(source: string, pluginName: string): string {
  const current = readPluginState(source);
  return writePluginState(source, { plugins: [...current.plugins, pluginName] });
}

export function removePluginFromState(source: string, pluginName: string): string {
  const current = readPluginState(source);
  return writePluginState(source, { plugins: current.plugins.filter((plugin) => plugin !== pluginName) });
}
