'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Props type
interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

// Add explicit return type: JSX.Element
export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Something went wrong!</h1>
          <p className="text-lg mb-6">
            We&apos;ve been notified of the issue and are working to fix it.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}