import { Metadata } from "next";
import { cookies } from "next/headers";
import { getSeoWithDefaults } from "@workspace/lib/seo-store";
import JsonRendererV2 from "@workspace/components/renderer/JsonRendererV2";
import { resolveLanguage } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoWithDefaults("page", "home");

  if (!seo) {
    return {
      title: "Albata - Modern Web Platform",
      description: "A modern, secure, and scalable web platform",
    };
  }

  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: seo.alternates,
    openGraph: seo.openGraph
      ? {
          title: seo.openGraph.title,
          description: seo.openGraph.description,
          url: seo.openGraph.url,
          images: seo.openGraph.images,
        }
      : undefined,
    twitter: seo.twitter
      ? {
          card: seo.twitter.card,
          site: seo.twitter.site,
          creator: seo.twitter.creator,
          title: seo.twitter.title,
          description: seo.twitter.description,
          images: seo.twitter.image ? [seo.twitter.image] : undefined,
        }
      : undefined,
  };
}

export default async function HomePage(): Promise<JSX.Element> {
  const cookieStore = cookies();
  const locale = resolveLanguage(cookieStore.get("NEXT_LOCALE")?.value);
  const ctx = {
    device: "desktop",
    locale,
    user: null,
    abBucket: 0,
  };

  return (
    <JsonRendererV2
      slug="home"
      ctx={ctx}
      resolveContext={{
        env: process.env.NODE_ENV,
        locale,
      }}
      debug={process.env.NODE_ENV === "development"}
    />
  );
}
