import { addPluginToState, readPluginState, removePluginFromState } from "./plugin-config-state";
import { preparePluginRegistration, runPluginDoctor, type DependencyDiagnostic } from "./plugin-installer-service";
import { resolvePluginAlias } from "./plugin-alias";

export interface CliCommandContext {
  readonly cwd: string;
}

export type PluginSubcommand = "add" | "remove" | "list" | "doctor";

export interface PluginCommandResult {
  readonly command: "plugin";
  readonly subcommand: PluginSubcommand;
  readonly plugin?: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface CliCommandResult {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export function parseCliCommand(argv: readonly string[], context: CliCommandContext): CliCommandResult | PluginCommandResult {
  const [command = "help", ...args] = argv;

  if (command !== "plugin") {
    return { command, args, cwd: context.cwd };
  }

  const [subcommand = "list", plugin, ...rest] = args;
  if (!isPluginSubcommand(subcommand)) {
    return { command: "plugin", subcommand: "list", args, cwd: context.cwd };
  }

  return {
    command: "plugin",
    subcommand,
    plugin,
    args: [plugin, ...rest].filter(Boolean) as string[],
    cwd: context.cwd,
  };
}

function isPluginSubcommand(value: string): value is PluginSubcommand {
  return value === "add" || value === "remove" || value === "list" || value === "doctor";
}

export interface PluginExecutionInput {
  readonly subcommand: PluginSubcommand;
  readonly pluginInput?: string;
  readonly configSource: string;
  readonly manifest?: unknown;
  readonly manifestsByPackage?: Readonly<Record<string, unknown>>;
  readonly installedVersions?: Readonly<Record<string, string>>;
}

export interface PluginExecutionOutput {
  readonly nextConfigSource: string;
  readonly pluginPackages: readonly string[];
  readonly message: string;
  readonly diagnostics?: readonly DependencyDiagnostic[];
}

export function executePluginCommand(input: PluginExecutionInput): PluginExecutionOutput {
  switch (input.subcommand) {
    case "add": {
      if (!input.pluginInput || !input.manifest) {
        throw new Error("plugin add requires both a plugin name and manifest data");
      }
      const prepared = preparePluginRegistration(input.pluginInput, input.manifest);
      const updatedConfig = addPluginToState(input.configSource, prepared.packageName);
      return {
        nextConfigSource: updatedConfig,
        pluginPackages: readPluginState(updatedConfig).plugins,
        message: prepared.aliasUsed
          ? `Added ${prepared.packageName} (resolved from alias ${input.pluginInput}).`
          : `Added ${prepared.packageName}.`,
      };
    }
    case "remove": {
      if (!input.pluginInput) {
        throw new Error("plugin remove requires a plugin name");
      }
      const resolved = resolvePluginAlias(input.pluginInput);
      const updatedConfig = removePluginFromState(input.configSource, resolved.packageName);
      return {
        nextConfigSource: updatedConfig,
        pluginPackages: readPluginState(updatedConfig).plugins,
        message: `Removed ${resolved.packageName}.`,
      };
    }
    case "list": {
      const state = readPluginState(input.configSource);
      return {
        nextConfigSource: input.configSource,
        pluginPackages: state.plugins,
        message: state.plugins.length > 0 ? `Installed plugins: ${state.plugins.join(", ")}` : "No plugins registered.",
      };
    }
    case "doctor": {
      const state = readPluginState(input.configSource);
      const diagnostics: DependencyDiagnostic[] = [];

      for (const pluginPackage of state.plugins) {
        const manifestRaw = input.manifestsByPackage?.[pluginPackage];
        if (!manifestRaw) {
          diagnostics.push({
            dependency: pluginPackage,
            expectedRange: "installed plugin manifest",
            message: `Could not load manifest for ${pluginPackage}.`,
            remediation: `Reinstall plugin with: npm install ${pluginPackage}@latest`,
          });
          continue;
        }

        const prepared = preparePluginRegistration(pluginPackage, manifestRaw);
        const report = runPluginDoctor(prepared.manifest, input.installedVersions ?? {});
        diagnostics.push(...report.diagnostics);
      }

      const message = diagnostics.length > 0
        ? `Doctor found ${diagnostics.length} issue(s): ${diagnostics.map((item) => item.remediation).join(" | ")}`
        : `Doctor checked ${state.plugins.length} plugin(s): no issues found.`;

      return {
        nextConfigSource: input.configSource,
        pluginPackages: state.plugins,
        message,
        diagnostics,
      };
    }
  }
}

export * from "./plugin-alias";
export * from "./plugin-config-state";
export * from "./plugin-installer-service";
