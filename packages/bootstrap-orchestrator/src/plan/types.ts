export type BootstrapStepKind =
  | "detect-framework"
  | "select-intent"
  | "adapter-install"
  | "package-install"
  | "file-generate"
  | "file-mutate"
  | "validate";

export interface BootstrapStep<TPayload = unknown> {
  readonly id: string;
  readonly kind: BootstrapStepKind;
  readonly description: string;
  readonly payload: TPayload;
}

export interface FrameworkDetectionDecision {
  readonly framework: string;
  readonly confidence: number;
  readonly evidence?: readonly string[];
}

export interface IntentSelectionDecision {
  readonly intent: string;
  readonly preset: string;
  readonly rationale?: readonly string[];
}

export interface PackageInstallItem {
  readonly name: string;
  readonly version: string;
  readonly reason: "adapter" | "preset" | "peer";
}

export interface AdapterInstallPlan {
  readonly adapterPackage: PackageInstallItem;
  readonly additionalPackages: readonly PackageInstallItem[];
}

export interface FileMutation {
  readonly path: string;
  readonly operation: "create" | "update" | "delete";
  readonly checksum?: string;
  readonly source?: string;
}

export interface ValidationCheckpoint {
  readonly id: string;
  readonly description: string;
  readonly command?: string;
  readonly expectedOutcome: string;
}

export interface BootstrapPlan {
  readonly schemaVersion: "1";
  readonly compiledAt: string;
  readonly projectRoot: string;
  readonly frameworkDecision: FrameworkDetectionDecision;
  readonly intentDecision: IntentSelectionDecision;
  readonly installPlan: AdapterInstallPlan;
  readonly fileMutations: readonly FileMutation[];
  readonly validationCheckpoints: readonly ValidationCheckpoint[];
  readonly steps: readonly BootstrapStep[];
}

export interface BootstrapCompilationInput {
  readonly projectRoot: string;
  readonly frameworkDecision: FrameworkDetectionDecision;
  readonly intentDecision: IntentSelectionDecision;
  readonly installPlan: AdapterInstallPlan;
  readonly fileMutations: readonly FileMutation[];
  readonly validationCheckpoints: readonly ValidationCheckpoint[];
}
