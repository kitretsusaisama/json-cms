import type { FrameworkDetectionResult, FrameworkDetectorContext, FrameworkEvidenceKind } from "./types";
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
export declare function buildDetectionResult(options: BuildResultOptions): FrameworkDetectionResult;
//# sourceMappingURL=shared.d.ts.map