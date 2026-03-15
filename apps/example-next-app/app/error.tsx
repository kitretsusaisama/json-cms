'use client';

import { useEffect } from 'react';
import { Button } from '@workspace/components/atoms/Button';
import { useErrorTracking } from '@workspace/components/error-tracking/ErrorTrackingProvider';
import { useLanguage } from '@workspace/providers/language-provider';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const errorTracking = useErrorTracking();
  const { t } = useLanguage();

  useEffect(() => {
    // Log the error to our custom error tracking service
    errorTracking.captureException(error);
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
  }, [error, errorTracking]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="space-y-6 px-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{t('error.title')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            {t('error.description')}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={reset} variant="primary" size="lg">
            {t('error.tryAgain')}
          </Button>
          <Button href="/" variant="outline" size="lg">
            {t('error.goHome')}
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 rounded-lg bg-red-50 p-4 text-left dark:bg-red-950">
            <p className="font-mono text-sm text-red-800 dark:text-red-300">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 max-h-96 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900/50 dark:text-red-300">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}