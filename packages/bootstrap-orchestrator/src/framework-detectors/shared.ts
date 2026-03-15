import type { FrameworkDetectionResult, FrameworkDetectorContext, FrameworkEvidence, FrameworkEvidenceKind } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasDependency(context: FrameworkDetectorContext, dep: string): boolean {
  const key = normalize(dep);
  const dependencies = context.packageJson?.dependencies ?? {};
  const devDependencies = context.packageJson?.devDependencies ?? {};
  return key in dependencies || key in devDependencies;
}

function hasConfig(context: FrameworkDetectorContext, config: string): boolean {
  const configs = new Set((context.configFiles ?? []).map(normalize));
  return configs.has(normalize(config));
}

function hasFolder(context: FrameworkDetectorContext, folder: string): boolean {
  const folders = new Set((context.folders ?? []).map(normalize));
  return folders.has(normalize(folder));
}

function hasScript(context: FrameworkDetectorContext, script: string): boolean {
  const scripts = context.packageJson?.scripts ?? {};
  const target = normalize(script);
  return Object.values(scripts).some((command) => normalize(command).includes(target));
}

function hasRuntimeImport(context: FrameworkDetectorContext, runtimeImport: string): boolean {
  const imports = new Set((context.runtimeImports ?? []).map(normalize));
  return imports.has(normalize(runtimeImport));
}

export interface EvidenceDefinition {
  readonly kind: FrameworkEvidenceKind;
  readonly weight: number;
  readonly signal?: string;
  readonly anyOfSignals?: readonly string[];
}

export interface BuildResultOptions {
  readonly framework: FrameworkDetectionResult["framework"];
  readonly context: FrameworkDetectorContext;
  readonly evidenceDefinitions: readonly EvidenceDefinition[];
  readonly conflictDependencies: readonly string[];
}

function matchesSignal(kind: FrameworkEvidenceKind, signal: string, context: FrameworkDetectorContext): boolean {
  return (
    (kind === "dependency" && hasDependency(context, signal)) ||
    (kind === "config" && hasConfig(context, signal)) ||
    (kind === "folder" && hasFolder(context, signal)) ||
    (kind === "script" && hasScript(context, signal)) ||
    (kind === "runtime-import" && hasRuntimeImport(context, signal))
  );
}

export function buildDetectionResult(options: BuildResultOptions): FrameworkDetectionResult {
  const evidence: FrameworkEvidence[] = options.evidenceDefinitions.map((item) => {
    const candidates = item.anyOfSignals ?? (item.signal ? [item.signal] : []);
    const matched = candidates.some((signal) => matchesSignal(item.kind, signal, options.context));

    return {
      kind: item.kind,
      signal: candidates.join(" | "),
      weight: item.weight,
      matched,
    };
  });

  const matchedWeight = evidence.filter((item) => item.matched).reduce((total, item) => total + item.weight, 0);
  const totalWeight = evidence.reduce((total, item) => total + item.weight, 0) || 1;
  const score = Number((matchedWeight / totalWeight).toFixed(4));

  const conflicts = options.conflictDependencies.filter((dependency) => hasDependency(options.context, dependency));

  return {
    framework: options.framework,
    score,
    evidence,
    conflicts,
  };
}
