// Global type definitions

// Google Analytics
interface Window {
  gtag?: (...args: unknown[]) => void; // unknown instead of any
  dataLayer?: Array<Record<string, unknown>>; // array of objects
}

// Declare global gtag function
declare function gtag(...args: unknown[]): void;
