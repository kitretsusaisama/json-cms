// ------------------------------------
// Utility Functions
// ------------------------------------

export function getTraceData(): Record<string, string> {
    return {
      'trace-id': Math.random().toString(36).substring(2, 15),
      'app-version': process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    };
  }
  