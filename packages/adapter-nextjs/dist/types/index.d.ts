/**
 * @deprecated Use `@upflame/adapters/nextjs` instead.
 * This package remains as a compatibility layer and re-exports the same surface.
 */
export { CMSProvider, useCMS, useCMSOptional, } from "./CMSProvider";
export type { CMSContextValue, CMSProviderProps, ComponentStats, } from "./CMSProvider";
export { DebugPanel } from "./CMSDebugPanel";
export type { DebugPanelData, DebugPanelProps } from "./CMSDebugPanel";
export { PreviewBar, ServerPreviewBar } from "./PreviewBar";
export type { PreviewBarProps, ServerPreviewBarProps } from "./PreviewBar";
export { CMSProviderWithNonce } from "./CMSProviderWithNonce";
export { CspNonceProvider, useCspNonce, getCspNonce, buildCspPolicy, createCspMiddleware, CSP_NONCE_HEADER } from "./csp";
export { nextjsAdapterV1 } from "./nextjs-adapter-v1";
export type { NextjsAdapterContext } from "./nextjs-adapter-v1";
//# sourceMappingURL=index.d.ts.map