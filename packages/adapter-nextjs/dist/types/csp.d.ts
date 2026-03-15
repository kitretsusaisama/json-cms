import React from "react";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export declare const CSP_NONCE_HEADER = "x-csp-nonce";
export interface CspMiddlewareOptions {
    reportOnly?: boolean;
    enableUnsafeEvalInDev?: boolean;
}
export declare function generateNonce(): string;
export declare function buildCspPolicy(nonce: string, allowUnsafeEval?: boolean, reportOnly?: boolean): string;
export declare function getCspNonce(): Promise<string | null>;
export declare function CspNonceProvider({ nonce, children, }: {
    nonce?: string | null;
    children: React.ReactNode;
}): React.ReactElement;
export declare function useCspNonce(): string | null;
export declare function createCspMiddleware(options?: CspMiddlewareOptions): (_req: NextRequest) => NextResponse;
//# sourceMappingURL=csp.d.ts.map