import React from "react";
import { CMSProvider, type CMSProviderProps } from "./CMSProvider";
import { CspNonceProvider, getCspNonce } from "./csp";

export async function CMSProviderWithNonce(
  props: CMSProviderProps
): Promise<React.ReactElement> {
  const headerNonce = await getCspNonce();
  const effectiveNonce = props.nonce ?? headerNonce ?? undefined;

  return (
    <CspNonceProvider nonce={effectiveNonce}>
      <CMSProvider {...props} nonce={effectiveNonce} />
    </CspNonceProvider>
  );
}
