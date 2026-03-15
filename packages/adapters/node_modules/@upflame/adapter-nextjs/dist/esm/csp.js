import React, { createContext, useContext } from "react";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
export const CSP_NONCE_HEADER = "x-csp-nonce";
export function generateNonce() {
    if (typeof globalThis === "undefined" || !globalThis.crypto?.getRandomValues) {
        throw new Error("Secure crypto source not available for CSP nonce generation.");
    }
    const array = new Uint8Array(16);
    globalThis.crypto.getRandomValues(array);
    if (typeof Buffer !== "undefined") {
        return Buffer.from(array).toString("base64");
    }
    const binary = Array.from(array, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary);
}
export function buildCspPolicy(nonce, allowUnsafeEval = false, reportOnly = false) {
    const policies = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' ${allowUnsafeEval ? "'unsafe-eval'" : ""} https:`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
        "font-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ];
    const header = policies.join("; ");
    return reportOnly ? `${header}; report-to csp-endpoint` : header;
}
export async function getCspNonce() {
    try {
        const h = await headers();
        return h.get(CSP_NONCE_HEADER);
    }
    catch {
        return null;
    }
}
const CspNonceContext = createContext(null);
export function CspNonceProvider({ nonce, children, }) {
    return React.createElement(CspNonceContext.Provider, { value: nonce ?? null }, children);
}
export function useCspNonce() {
    return useContext(CspNonceContext);
}
export function createCspMiddleware(options = {}) {
    return function cspMiddleware(_req) {
        const nonce = generateNonce();
        const response = NextResponse.next();
        const isDev = process.env.NODE_ENV === "development";
        response.headers.set(CSP_NONCE_HEADER, nonce);
        response.headers.set(options.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", buildCspPolicy(nonce, isDev && (options.enableUnsafeEvalInDev ?? false), options.reportOnly ?? false));
        return response;
    };
}
//# sourceMappingURL=csp.js.map