import { jsx as _jsx } from "react/jsx-runtime";
import { CMSProvider } from "./CMSProvider";
import { CspNonceProvider, getCspNonce } from "./csp";
export async function CMSProviderWithNonce(props) {
    const headerNonce = await getCspNonce();
    const effectiveNonce = props.nonce ?? headerNonce ?? undefined;
    return (_jsx(CspNonceProvider, { nonce: effectiveNonce, children: _jsx(CMSProvider, { ...props, nonce: effectiveNonce }) }));
}
//# sourceMappingURL=CMSProviderWithNonce.js.map