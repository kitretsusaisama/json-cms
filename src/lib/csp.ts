import crypto from 'crypto';
import { headers } from 'next/headers';

/** CSP nonce header name for passing nonce from middleware to components */
export const CSP_NONCE_HEADER = 'x-csp-nonce';

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  // Edge runtime / browser-safe
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const array = new Uint8Array(16);
    globalThis.crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64'); // safer than btoa
  }

  // Node.js fallback
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build CSP policy with nonce
 */
export function buildCspPolicy(nonce: string, isDevelopment = false): string {
  const policies = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ''} https:`,
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

  return policies.join('; ');
}

/**
 * Get CSP nonce from headers (server-side)
 */
export async function getNonceFromHeaders(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get(CSP_NONCE_HEADER);
  } catch {
    return null;
  }
}
