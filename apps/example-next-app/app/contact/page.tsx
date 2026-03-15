import { Metadata } from "next";
import { getSeoWithDefaults } from "@workspace/lib/seo-store";
import JsonRendererV2 from "@workspace/components/renderer/JsonRendererV2";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoWithDefaults("page", "contact");
  if (!seo) {
    return { title: "Contact", description: "Contact page" };
  }
  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: seo.alternates,
    openGraph: seo.openGraph ? {
      type: (seo.openGraph.type || 'website') as "website" | "article" | "book" | "profile" | "music.song" | "music.album" | "music.playlist" | "music.radio_station" | "video.movie" | "video.episode" | "video.tv_show" | "video.other",
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      images: seo.openGraph.images,
    } : undefined,
    twitter: seo.twitter ? ({
      card: seo.twitter.card,
      site: seo.twitter.site,
      creator: seo.twitter.creator,
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.image ? [seo.twitter.image] : undefined,
    }) : undefined,
  };
}

export default async function ContactPage(): Promise<JSX.Element> {
  const ctx = {
    device: 'desktop',
    locale: 'en',
    user: null,
    abBucket: 0
  };

  return (
    <JsonRendererV2 
      slug="contact" 
      ctx={ctx}
      resolveContext={{
        env: process.env.NODE_ENV,
        locale: 'en'
      }}
      debug={process.env.NODE_ENV === 'development'}
    />
  );
}
