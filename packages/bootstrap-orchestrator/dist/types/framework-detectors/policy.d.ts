import type { FrameworkDetectionResult, FrameworkName } from "./types";
export interface FrameworkSelectionPolicy {
    readonly confidenceThreshold: number;
    readonly closeScoreDelta: number;
}
export interface SelectFrameworkOptions {
    readonly interactive?: boolean;
    readonly ci?: boolean;
    readonly overrideFramework?: FrameworkName;
    readonly policy?: Partial<FrameworkSelectionPolicy>;
}
export type FrameworkSelectionDecision = {
    readonly outcome: "selected";
    readonly framework: FrameworkName;
    readonly reason: "override" | "auto";
    readonly ranking: readonly FrameworkDetectionResult[];
} | {
    readonly outcome: "disambiguate";
    readonly candidates: readonly FrameworkDetectionResult[];
    readonly ranking: readonly FrameworkDetectionResult[];
    readonly reason: "close-scores";
} | {
    readonly outcome: "failed";
    readonly ranking: readonly FrameworkDetectionResult[];
    readonly reason: "unknown-override" | "low-confidence" | "ci-requires-override";
    readonly message: string;
};
export declare function selectFramework(detections: readonly FrameworkDetectionResult[], options?: SelectFrameworkOptions): FrameworkSelectionDecision;
//# sourceMappingURL=policy.d.ts.map