import { Metadata } from "next";
import { getSeoWithDefaults } from "@workspace/lib/seo-store";
import JsonRendererV2 from "@workspace/components/renderer/JsonRendererV2";
import SeoHead from "@workspace/components/SeoHead";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const seo = await getSeoWithDefaults("product", resolvedParams.slug);
  
  if (!seo) {
    return {
      title: `Product - ${resolvedParams.slug}`,
      description: "Product details",
    };
  }

  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: seo.alternates,
    openGraph: seo.openGraph ? {
      ...seo.openGraph,
      type: seo.openGraph.type as 'website' | 'article' | 'book' | 'profile' | 'music.song' | 'music.album' | 'music.playlist' | 'music.radio_station' | 'video.movie' | 'video.episode' | 'video.tv_show' | 'video.other',
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

export default async function ProductPage({ params }: ProductPageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  
  // Load SEO data
  const seo = await getSeoWithDefaults("product", resolvedParams.slug);

  // Context for the renderer
  const ctx = {
    slug: resolvedParams.slug,
    productId: resolvedParams.slug,
  };

  return (
    <>
      {seo && <SeoHead seo={seo} />}
      <JsonRendererV2 
        slug={`product/${resolvedParams.slug}`}
        ctx={ctx}
        debug={process.env.NODE_ENV === 'development'}
      />
    </>
  );
}
