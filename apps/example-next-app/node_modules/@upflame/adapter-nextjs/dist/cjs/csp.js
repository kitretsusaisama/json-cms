"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSP_NONCE_HEADER = void 0;
exports.generateNonce = generateNonce;
exports.buildCspPolicy = buildCspPolicy;
exports.getCspNonce = getCspNonce;
exports.CspNonceProvider = CspNonceProvider;
exports.useCspNonce = useCspNonce;
exports.createCspMiddleware = createCspMiddleware;
const react_1 = __importStar(require("react"));
const headers_1 = require("next/headers");
const server_1 = require("next/server");
exports.CSP_NONCE_HEADER = "x-csp-nonce";
function generateNonce() {
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
function buildCspPolicy(nonce, allowUnsafeEval = false, reportOnly = false) {
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
async function getCspNonce() {
    try {
        const h = await (0, headers_1.headers)();
        return h.get(exports.CSP_NONCE_HEADER);
    }
    catch {
        return null;
    }
}
const CspNonceContext = (0, react_1.createContext)(null);
function CspNonceProvider({ nonce, children, }) {
    return react_1.default.createElement(CspNonceContext.Provider, { value: nonce ?? null }, children);
}
function useCspNonce() {
    return (0, react_1.useContext)(CspNonceContext);
}
function createCspMiddleware(options = {}) {
    return function cspMiddleware(_req) {
        const nonce = generateNonce();
        const response = server_1.NextResponse.next();
        const isDev = process.env.NODE_ENV === "development";
        response.headers.set(exports.CSP_NONCE_HEADER, nonce);
        response.headers.set(options.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", buildCspPolicy(nonce, isDev && (options.enableUnsafeEvalInDev ?? false), options.reportOnly ?? false));
        return response;
    };
}
//# sourceMappingURL=csp.js.map