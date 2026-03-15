"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMSProviderWithNonce = CMSProviderWithNonce;
const jsx_runtime_1 = require("react/jsx-runtime");
const CMSProvider_1 = require("./CMSProvider");
const csp_1 = require("./csp");
async function CMSProviderWithNonce(props) {
    const headerNonce = await (0, csp_1.getCspNonce)();
    const effectiveNonce = props.nonce ?? headerNonce ?? undefined;
    return ((0, jsx_runtime_1.jsx)(csp_1.CspNonceProvider, { nonce: effectiveNonce, children: (0, jsx_runtime_1.jsx)(CMSProvider_1.CMSProvider, { ...props, nonce: effectiveNonce }) }));
}
//# sourceMappingURL=CMSProviderWithNonce.js.map