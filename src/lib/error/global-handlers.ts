import { ErrorReporter } from './error-reporter';
import { WindowErrorHandlerOptions } from './error-types';

// ------------------------------------
// Global Error Handlers (Browser Only)
// ------------------------------------

export function setupGlobalHandlers(): void {
  if (typeof window === 'undefined') {return;}

  const win = window as Window;

  // window.onerror
  const originalOnError = win.onerror;
  win.onerror = (...args: Parameters<Exclude<typeof win.onerror, null>>) => {
    const [message, source, lineno, colno, error] = args;
    const opts: WindowErrorHandlerOptions = { message, source, lineno, colno, error };

    ErrorReporter.getInstance().captureException(
      opts.error || new Error(String(opts.message)),
      { source: 'client', url: win.location.href }
    );

    if (originalOnError) {return originalOnError.apply(window, args);}
    return false;
  };

  // window.onunhandledrejection
  const originalOnUnhandledRejection = win.onunhandledrejection;
  win.onunhandledrejection = (event: PromiseRejectionEvent) => {
    ErrorReporter.getInstance().captureException(
      event.reason || new Error('Unhandled Promise rejection'),
      { source: 'client', url: win.location.href }
    );
    if (originalOnUnhandledRejection) {return originalOnUnhandledRejection.call(window, event);}
    return false;
  };

  // fetch interception
  const originalFetch = win.fetch.bind(win);
  win.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const response = await originalFetch(input, init);
      if (!response.ok) {
        ErrorReporter.getInstance().addBreadcrumb({
          category: 'network',
          message: `Fetch error: ${response.status} ${response.statusText}`,
          level: 'error',
          data: { url: response.url, status: response.status, statusText: response.statusText },
        });
      }
      return response;
    } catch (error: unknown) {
      ErrorReporter.getInstance().captureException(error, {
        source: 'client',
        url: typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url,
      });
      throw error;
    }
  };
}
