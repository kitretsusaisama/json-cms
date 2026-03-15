import { ClientNotFound } from "@workspace/components/error-tracking/ClientNotFound";
import { Metadata } from "next";
import { getSeoWithDefaults } from "@workspace/lib/seo-store";
import { defaultLanguage } from "@workspace/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoWithDefaults("page", "not-found");

  if (!seo) {
    return {
      title: "Page Not Found",
      description: "The page you are looking for does not exist.",
    };
  }

  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: seo.alternates,
    openGraph: seo.openGraph ? {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      images: seo.openGraph.images,
    } : undefined,
    twitter: seo.twitter ? {
      card: seo.twitter.card,
      site: seo.twitter.site,
      creator: seo.twitter.creator,
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.image ? [seo.twitter.image] : undefined,
    } : undefined,
  };
}

export default async function NotFound(): Promise<JSX.Element> {
  const lang = defaultLanguage;
  return <ClientNotFound lang={lang} />;
}