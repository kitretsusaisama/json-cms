/**
 * Advanced SEO, AEO, and Sitemap Management System
 */

import { Metadata, MetadataRoute } from 'next';
import { supportedLanguages, defaultLanguage } from '@/i18n';
import { getSeoWithDefaults } from '@/lib/seo-store';
import { type SeoRecord, type SeoType, type OpenGraphSchema, type TwitterSchema } from '@/types/seo';
import { z } from 'zod';

// Define missing types
type RobotsProps = {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  nocache?: boolean;
  notranslate?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxVideoPreview?: number;
};

type OpenGraphProps = z.infer<typeof OpenGraphSchema>;
type TwitterProps = z.infer<typeof TwitterSchema>;

type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages?: Record<string, string>;
  };
};

type AlternateProps = {
  languages: Record<string, string>;
};

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: OpenGraphProps;
  twitter?: TwitterProps;
  alternates?: AlternateProps;
  robots?: RobotsProps;
  structuredData?: any[];
  keywords?: string[];
};

// Re-export structured data types and functions for backward compatibility
export type {
  WebSiteData,
  OrganizationData,
  BreadcrumbItem,
  BreadcrumbData,
  ArticleData,
  ProductData,
  StructuredDataInput,
  BaseStructuredData,
  WebSiteStructuredData,
  OrganizationStructuredData,
  BreadcrumbStructuredData,
  ArticleStructuredData,
  ProductStructuredData,
  StructuredDataOutput
} from './seo/structured-data';

export { generateStructuredData } from './seo/structured-data';

/**
 * Helper function to generate robots directives
 */
function generateRobotsDirectives(robots: RobotsProps): string {
  const robotsDirectives: string[] = [];

  if (robots.index === false) {
    robotsDirectives.push('noindex');
  }
  if (robots.follow === false) {
    robotsDirectives.push('nofollow');
  }
  if (robots.noarchive) {
    robotsDirectives.push('noarchive');
  }
  if (robots.nosnippet) {
    robotsDirectives.push('nosnippet');
  }
  if (robots.noimageindex) {
    robotsDirectives.push('noimageindex');
  }
  if (robots.nocache) {
    robotsDirectives.push('nocache');
  }
  if (robots.notranslate) {
    robotsDirectives.push('notranslate');
  }

  if (robots.maxSnippet !== undefined) {
    robotsDirectives.push(`max-snippet:${robots.maxSnippet}`);
  }

  if (robots.maxImagePreview) {
    robotsDirectives.push(`max-image-preview:${robots.maxImagePreview}`);
  }

  if (robots.maxVideoPreview !== undefined) {
    robotsDirectives.push(`max-video-preview:${robots.maxVideoPreview}`);
  }

  return robotsDirectives.join(', ');
}

/**
 * Helper function to generate OpenGraph metadata
 */
function generateOpenGraphMetadata(openGraph: OpenGraphProps, title: string, description: string): Record<string, unknown> {
  return {
    title: openGraph.title || title,
    description: openGraph.description || description,
    ...openGraph,
  };
}

/**
 * Helper function to generate Twitter metadata
 */
function generateTwitterMetadata(twitter: TwitterProps, title: string, description: string): Record<string, unknown> {
  return {
    title: twitter.title || title,
    description: twitter.description || description,
    ...twitter,
  };
}

/**
 * Generate SEO metadata for a page
 */
export function generateSEO({
  title,
  description,
  canonical,
  openGraph,
  twitter,
  alternates,
  robots,
  structuredData,
  keywords,
}: SEOProps): Metadata {
  // Base metadata
  const metadata: Record<string, unknown> = {
    title,
    description,
    keywords: keywords?.join(', '),
  };

  // Canonical URL
  if (canonical) {
    metadata.canonical = canonical;
  }

  // OpenGraph metadata
  if (openGraph) {
    metadata.openGraph = generateOpenGraphMetadata(openGraph, title, description);
  }

  // Twitter metadata
  if (twitter) {
    metadata.twitter = generateTwitterMetadata(twitter, title, description);
  }

  // Alternate languages
  if (alternates) {
    metadata.alternates = alternates;
  }

  // Robots directives
  if (robots) {
    metadata.robots = generateRobotsDirectives(robots);
  }

  // Structured data
  if (structuredData) {
    metadata.structuredData = structuredData;
  }

  return metadata;
}

/**
 * Generate alternate language URLs for a page
 */
export function generateAlternateLanguages(path: string, currentLang: string): AlternateProps {
  const languages: Record<string, string> = {};

  // Generate URLs for all supported languages
  supportedLanguages.forEach((lang) => {
    if (lang !== currentLang) {
      // Replace language in path or add it
      const langPath = path.startsWith(`/${currentLang}`)
        ? path.replace(`/${currentLang}`, `/${lang}`)
        : `/${lang}${path}`;

      languages[lang] = `${process.env.NEXT_PUBLIC_SITE_URL || ''}${langPath}`;
    }
  });

  return { languages };
}

/**
 * Generate sitemap entries for a page with all language variants
 */
export function generateSitemapEntries(
  path: string,
  options: {
    lastModified?: string | Date;
    changeFrequency?: SitemapEntry['changeFrequency'];
    priority?: number;
  } = {}
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Generate entries for all supported languages
  supportedLanguages.forEach((lang) => {
    const langPath = path === '/' ? `/${lang}` : `/${lang}${path}`;
    const url = `${baseUrl}${langPath}`;

    // Generate alternate refs for other languages
    const alternateRefs = supportedLanguages
      .filter((altLang) => altLang !== lang)
      .map((altLang) => {
        const altPath = path === '/' ? `/${altLang}` : `/${altLang}${path}`;
        return {
          href: `${baseUrl}${altPath}`,
          hreflang: altLang,
        };
      });

    entries.push({
      url,
      lastModified: options.lastModified || new Date(),
      changeFrequency: options.changeFrequency || 'monthly',
      priority: options.priority || 0.8,
      alternates: {
        languages: alternateRefs.reduce((acc, ref) => ({
          ...acc,
          [ref.hreflang]: ref.href
        }), {})
      },
    });
  });

  return entries;
}

/**
 * Generate robots.txt content
 */
export function generateRobots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}


/**
 * High-level helper: generate Next.js Metadata for a given page slug and language.
 * Falls back to defaults and enriches alternates/canonical when absent.
 */
export async function generatePageMetadata(slug: string, lang?: string): Promise<Metadata> {
  const record: SeoRecord | null = await getSeoWithDefaults('page', slug);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const basePath = slug === 'home' || slug === '' ? '/' : `/${slug}`;

  const canonical = record?.canonical || `${baseUrl}${basePath}`;

  // If alternates are not present in the record, synthesize them using supportedLanguages
  const alternates = record?.alternates || generateAlternateLanguages(basePath, lang || defaultLanguage).languages;

  return {
    title: record?.title || 'Albata',
    description: record?.description || 'Modern Web Platform',
    robots: record?.robots,
    alternates: alternates ? { languages: alternates } : undefined,
    other: undefined,
    // Canonical via other.link is not directly in Metadata; Next expects alternates/canonical fields in router metadata.
    // For compatibility with custom head, we keep SeoHead component usage for dynamic routes.
    openGraph: record?.openGraph
      ? {
          type: record.openGraph.type,
          title: record.openGraph.title || record.title,
          description: record.openGraph.description || record.description,
          url: record.openGraph.url || canonical,
          images: record.openGraph.images,
        }
      : undefined,
    twitter: record?.twitter
      ? {
          card: record.twitter.card,
          site: record.twitter.site,
          creator: record.twitter.creator,
          title: record.twitter.title || record.title,
          description: record.twitter.description || record.description,
          images: record.twitter.image ? [record.twitter.image] : undefined,
        }
      : undefined,
    keywords: record?.meta
      ? record.meta
          .filter(m => m.name === 'keywords')
          .map(m => m.content)
          .join(', ')
      : undefined,
  } as Metadata;
}
