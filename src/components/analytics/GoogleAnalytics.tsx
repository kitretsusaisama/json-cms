// src/components/analytics/GoogleAnalytics.tsx
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import DOMPurify from 'dompurify';

interface GoogleAnalyticsProps {
  gaId: string; // GA4 ID
  gtmId?: string; // GTM ID (optional)
  nonce?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export default function GoogleAnalytics({ gaId, gtmId, nonce }: GoogleAnalyticsProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId || !pathname) {
      return;
    }

    const pathWithQuery = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    window.gtag?.('config', gaId, { page_path: pathWithQuery });
  }, [pathname, searchParams, gaId]);

  const gaScript = DOMPurify.sanitize(`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}', {
      page_path: window.location.pathname,
      cookie_flags: 'SameSite=None;Secure',
    });
  `);

  const gtmScript = gtmId
    ? DOMPurify.sanitize(`
        (function(w,d,s,l,i){
          w[l]=w[l]||[];
          w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),
              dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `)
    : '';

  return (
    <>
      {/* GA4 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        {...(nonce ? { nonce } : {})}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        {...(nonce ? { nonce } : {})}
        // eslint-disable-next-line react/no-danger -- Required to inline GA initialisation
        dangerouslySetInnerHTML={{ __html: gaScript }}
      />

      {/* GTM */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            {...(nonce ? { nonce } : {})}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: gtmScript }}
          />
          <noscript
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        </>
      )}
    </>
  );
}