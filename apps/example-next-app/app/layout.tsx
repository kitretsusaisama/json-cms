import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LayoutProvider } from "@workspace/components/layouts/LayoutProvider";
import { Providers } from "@workspace/providers";
import { getTraceData } from "@workspace/lib/error-tracking";
import ServiceWorkerRegister from "@workspace/components/pwa/ServiceWorkerRegister";
import { CspNonceProvider } from "@workspace/contexts/CspNonceContext";
import { getNonceFromHeaders } from "@workspace/lib/csp";
import GoogleAnalytics from "@workspace/components/analytics/GoogleAnalytics";
import { analyticsConfig, isAnalyticsEnabled } from "@workspace/lib/analytics";
import { resolveLanguage } from "../lib/locale";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = cookies();
  const lang = resolveLanguage(cookieStore.get("NEXT_LOCALE")?.value);

  const titles: Record<string, string> = {
    en: "Enterprise Next.js CMS",
    es: "CMS empresarial para Next.js",
    fr: "CMS entreprise pour Next.js",
    de: "Enterprise-CMS für Next.js",
    zh: "Next.js CMS",
  };

  const descriptions: Record<string, string> = {
    en: "A production-grade data-driven CMS built for modern Next.js applications.",
    es: "Un CMS basado en datos para aplicaciones modernas con Next.js.",
    fr: "Un CMS pilote par les donnees pour les applications Next.js modernes.",
    de: "Ein datengetriebenes CMS für moderne Next.js-Anwendungen.",
    zh: "A production-ready data-driven CMS for modern Next.js apps.",
  };

  return {
    title: titles[lang] ?? titles.en,
    description: descriptions[lang] ?? descriptions.en,
    authors: [{ name: "Enterprise Team" }],
    keywords: ["next.js", "cms", "typescript", "plugin"],
    other: {
      ...getTraceData(),
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const cookieStore = cookies();
  const lang = resolveLanguage(cookieStore.get("NEXT_LOCALE")?.value);
  const nonce = (await getNonceFromHeaders()) || "";
  const enableAnalytics = isAnalyticsEnabled() && Boolean(nonce);

  return (
    <html lang={lang} className={`${inter.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <head>
        {enableAnalytics ? (
          <GoogleAnalytics gaId={analyticsConfig.gaId} gtmId={analyticsConfig.gtmId} nonce={nonce} />
        ) : null}
      </head>
      <body
        className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        suppressHydrationWarning
      >
        <CspNonceProvider nonce={nonce}>
          <Providers lang={lang}>
            <LayoutProvider>{children}</LayoutProvider>
          </Providers>
          <ServiceWorkerRegister />
        </CspNonceProvider>
      </body>
    </html>
  );
}
