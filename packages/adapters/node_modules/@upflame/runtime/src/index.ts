export type RuntimeStage = "config-loaded" | "plugins-registered" | "schema-compiled" | "started";

export interface RuntimeBootstrapOptions {
  readonly projectRoot: string;
  readonly plugins?: readonly string[];
}

export interface RuntimeBootstrapResult {
  readonly projectRoot: string;
  readonly plugins: readonly string[];
  readonly stages: readonly RuntimeStage[];
}

export function bootstrapRuntime(options: RuntimeBootstrapOptions): RuntimeBootstrapResult {
  const plugins = options.plugins ?? [];

  return {
    projectRoot: options.projectRoot,
    plugins,
    stages: ["config-loaded", "plugins-registered", "schema-compiled", "started"],
  };
}
