export declare const frameworkRegistry: import("@upflame/installer-core").FrameworkRegistry;
export interface FrameworkDetectionResult {
    detected?: string;
    confidence?: number;
    supported: boolean;
}
export declare function detectFrameworkFromProject(cwd: string): Promise<FrameworkDetectionResult>;
//# sourceMappingURL=framework-detection.d.ts.map