"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ErrorBoundary } from "@/components/error-tracking/ErrorBoundary";
import { ErrorTrackingProvider } from "@/components/error-tracking/ErrorTrackingProvider";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "./language-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
  lang?: string;
}

function ErrorFallback(error: Error, resetErrorBoundary: () => void): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
      <p className="mb-4 text-red-600">{error?.message ?? "An unexpected error occurred"}</p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

export function Providers({ children, lang }: ProvidersProps): React.JSX.Element {
  return (
    <ErrorTrackingProvider
      options={{
        dsn: process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN ?? "",
        environment: process.env.NODE_ENV,
      }}
    >
      <ErrorBoundary fallback={ErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider lang={lang}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: "var(--color-background)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                },
              }}
            />
            {process.env.NODE_ENV !== "production" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ErrorTrackingProvider>
  );
}
