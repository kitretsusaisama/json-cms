export type FrameworkName = "next" | "astro" | "gatsby";

export type FrameworkEvidenceKind = "dependency" | "config" | "folder" | "script" | "runtime-import";

export interface FrameworkEvidence {
  readonly kind: FrameworkEvidenceKind;
  readonly signal: string;
  readonly weight: number;
  readonly matched: boolean;
}

export interface FrameworkDetectionResult {
  readonly framework: FrameworkName;
  readonly score: number;
  readonly evidence: readonly FrameworkEvidence[];
  readonly conflicts: readonly string[];
}

export interface PackageJsonLike {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

export interface FrameworkDetectorContext {
  readonly packageJson?: PackageJsonLike;
  readonly configFiles?: readonly string[];
  readonly folders?: readonly string[];
  readonly runtimeImports?: readonly string[];
}

export interface FrameworkDetector {
  readonly framework: FrameworkName;
  detect(context: FrameworkDetectorContext): FrameworkDetectionResult;
}
