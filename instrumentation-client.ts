import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Adds request headers and IP for users
  sendDefaultPii: true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  tracesSampleRate: 1.0,

  integrations: [
    // Replay may only be enabled for the client-side
    Sentry.replayIntegration(),
  ],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});

// This export will instrument router navigations
// Using browserTracingIntegration instead of captureRouterTransitionStart
// as captureRouterTransitionStart is not exported from @sentry/nextjs 8.26.0
export const onRouterTransitionStart = Sentry.browserTracingIntegration;