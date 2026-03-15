// This file is used to instrument the server-side of the application
// It's automatically loaded by Next.js when placed at src/instrumentation.server.ts

// Initialize error tracking on the server side
if (process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN) {
  import('./lib/error-tracking').then(({ errorTracking }) => {
    errorTracking.init({
      dsn: process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      debug: process.env.NODE_ENV !== 'production',
      sampleRate: 1.0,
    });
  });
}