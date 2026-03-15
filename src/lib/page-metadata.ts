import { Metadata } from "next";
import { getSeoWithDefaults } from "@/lib/seo-store";

/**
 * Generate Next.js Metadata from SEO store data
 * This utility makes it easy to add dynamic SEO to any page
 */
export async function generatePageMetadata(
  pageId: string,
  fallback?: { title: string; description: string }
): Promise<Metadata> {
  const seo = await getSeoWithDefaults("page", pageId);
  
  if (!seo) {
    return fallback || {
      title: `${pageId} - Albata`,
      description: `Learn more about ${pageId}`,
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

/**
 * Generate structured data from SEO store
 * Useful for pages that need custom structured data
 */
export async function getStructuredData(pageId: string): Promise<unknown[]> {
  const seo = await getSeoWithDefaults("page", pageId);
  return seo?.structuredData || [];
}

/**
 * Get SEO meta tags array for custom usage
 */
export async function getMetaTags(pageId: string): Promise<Array<{name: string, content: string}>> {
  const seo = await getSeoWithDefaults("page", pageId);
  // Filter out any meta tags that don't have a name property
  return (seo?.meta || []).filter((tag): tag is { name: string; content: string } => 
    !!tag.name
  );
}
