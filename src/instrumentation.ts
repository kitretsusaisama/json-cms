// This file is used to instrument the application with custom monitoring
// It's automatically loaded by Next.js when placed at src/instrumentation.ts

export async function register(): Promise<void> {
  if (process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN) {
    // Initialize error tracking with environment-specific configuration dynamically
    const { errorTracking } = await import('./lib/error-tracking');
    errorTracking.init({
      dsn: process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      debug: process.env.NODE_ENV !== 'production',
      sampleRate: 1.0,
    });
  }
}