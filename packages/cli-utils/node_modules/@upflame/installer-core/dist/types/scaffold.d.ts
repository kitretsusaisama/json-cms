import { type BootstrapSafetyPolicy } from "./policy/bootstrap-safety-policy";
export interface ScaffoldOptions {
    policy?: BootstrapSafetyPolicy;
    applyExplicitlyRequested?: boolean;
    ci?: boolean;
}
export declare function scaffoldDataDirectory(rootDir: string, dataDir: string, options?: ScaffoldOptions): Promise<string[]>;
//# sourceMappingURL=scaffold.d.ts.map