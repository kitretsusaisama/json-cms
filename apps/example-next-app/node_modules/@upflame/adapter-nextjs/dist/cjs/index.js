"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextjsAdapterV1 = exports.CSP_NONCE_HEADER = exports.createCspMiddleware = exports.buildCspPolicy = exports.getCspNonce = exports.useCspNonce = exports.CspNonceProvider = exports.CMSProviderWithNonce = exports.ServerPreviewBar = exports.PreviewBar = exports.DebugPanel = exports.useCMSOptional = exports.useCMS = exports.CMSProvider = void 0;
/**
 * @deprecated Use `@upflame/adapters/nextjs` instead.
 * This package remains as a compatibility layer and re-exports the same surface.
 */
var CMSProvider_1 = require("./CMSProvider");
Object.defineProperty(exports, "CMSProvider", { enumerable: true, get: function () { return CMSProvider_1.CMSProvider; } });
Object.defineProperty(exports, "useCMS", { enumerable: true, get: function () { return CMSProvider_1.useCMS; } });
Object.defineProperty(exports, "useCMSOptional", { enumerable: true, get: function () { return CMSProvider_1.useCMSOptional; } });
var CMSDebugPanel_1 = require("./CMSDebugPanel");
Object.defineProperty(exports, "DebugPanel", { enumerable: true, get: function () { return CMSDebugPanel_1.DebugPanel; } });
var PreviewBar_1 = require("./PreviewBar");
Object.defineProperty(exports, "PreviewBar", { enumerable: true, get: function () { return PreviewBar_1.PreviewBar; } });
Object.defineProperty(exports, "ServerPreviewBar", { enumerable: true, get: function () { return PreviewBar_1.ServerPreviewBar; } });
var CMSProviderWithNonce_1 = require("./CMSProviderWithNonce");
Object.defineProperty(exports, "CMSProviderWithNonce", { enumerable: true, get: function () { return CMSProviderWithNonce_1.CMSProviderWithNonce; } });
var csp_1 = require("./csp");
Object.defineProperty(exports, "CspNonceProvider", { enumerable: true, get: function () { return csp_1.CspNonceProvider; } });
Object.defineProperty(exports, "useCspNonce", { enumerable: true, get: function () { return csp_1.useCspNonce; } });
Object.defineProperty(exports, "getCspNonce", { enumerable: true, get: function () { return csp_1.getCspNonce; } });
Object.defineProperty(exports, "buildCspPolicy", { enumerable: true, get: function () { return csp_1.buildCspPolicy; } });
Object.defineProperty(exports, "createCspMiddleware", { enumerable: true, get: function () { return csp_1.createCspMiddleware; } });
Object.defineProperty(exports, "CSP_NONCE_HEADER", { enumerable: true, get: function () { return csp_1.CSP_NONCE_HEADER; } });
var nextjs_adapter_v1_1 = require("./nextjs-adapter-v1");
Object.defineProperty(exports, "nextjsAdapterV1", { enumerable: true, get: function () { return nextjs_adapter_v1_1.nextjsAdapterV1; } });
//# sourceMappingURL=index.js.map