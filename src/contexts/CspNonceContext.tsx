'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface CspNonceContextType {
  nonce: string | null;
}

const CspNonceContext = createContext<CspNonceContextType>({
  nonce: null,
});

interface CspNonceProviderProps {
  children: ReactNode;
  nonce: string;
}

export function CspNonceProvider({ children, nonce }: CspNonceProviderProps): JSX.Element {
  return (
    <CspNonceContext.Provider value={{ nonce }}>
      {children}
    </CspNonceContext.Provider>
  );
}

export function useCspNonce(): string | null {
  const context = useContext(CspNonceContext);
  return context.nonce;
}
