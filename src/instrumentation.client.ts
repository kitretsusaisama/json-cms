// This file is used to instrument the client-side of the application
// It's automatically loaded by Next.js when placed at src/instrumentation.client.ts

// Initialize error tracking on the client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN) {
  import('./lib/error-tracking').then(({ errorTracking }) => {
    errorTracking.init({
      dsn: process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      debug: process.env.NODE_ENV !== 'production',
      sampleRate: 1.0,
      attachStacktrace: true,
    });

    // Add navigation breadcrumbs
    if (typeof window !== 'undefined') {
      // Track page navigation
      const handleRouteChange = (url: string) => {
        errorTracking.addBreadcrumb(`Navigation to ${url}`, 'navigation');
      };

      // Listen for route changes if using Next.js
      if (typeof window.history !== 'undefined') {
        const originalPushState = window.history.pushState;
        window.history.pushState = function (...args) {
          handleRouteChange(args[2] as string);
          return originalPushState.apply(this, args);
        };
      }

      // Track user interactions
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target && target.tagName) {
          const text = target.innerText || target.textContent;
          const id = target.id;
          const className = target.className;
          const tagName = target.tagName.toLowerCase();

          errorTracking.addBreadcrumb(
            `User clicked on ${tagName}${id ? `#${id}` : ''}${text ? `: ${text.substring(0, 20)}` : ''}`,
            'user',
            { tagName, id, className }
          );
        }
      });
    }
  });
}