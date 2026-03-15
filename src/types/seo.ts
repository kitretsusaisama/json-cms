import { z } from "zod";

export const MetaTagSchema = z.object({
  name: z.string().optional(),
  property: z.string().optional(),
  content: z.string(),
}).refine(v => !!v.name || !!v.property, { message: "name or property required" });

export const OpenGraphSchema = z.object({
  type: z.string().default("website"),
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).optional(),
});

export const TwitterSchema = z.object({
  card: z.enum(["summary", "summary_large_image"]).default("summary"),
  site: z.string().optional(),
  creator: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
});

export const SeoRecordSchema = z.object({
  id: z.string(),          // slug or id
  type: z.enum([
    "page", "post", "product", "category", "brand", "tag", "author", "collection", "event", "service"
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  canonical: z.string().url().optional(),
  robots: z.string().optional(),
  alternates: z.record(z.string(), z.string().url()).optional(), // locale -> url
  meta: z.array(MetaTagSchema).default([]),
  openGraph: OpenGraphSchema.optional(),
  twitter: TwitterSchema.optional(),
  structuredData: z.array(z.any()).default([]), // JSON-LD blocks
  updatedAt: z.string(), // ISO
});

// SEO Types
export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: OpenGraphProps;
  twitter?: TwitterProps;
  alternates?: AlternateProps;
  robots?: RobotsProps;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  keywords?: string[];
}

export interface OpenGraphProps {
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
    type?: string;
  }>;
  locale?: string;
  type?: string;
  audio?: string;
  video?: string;
}

export interface TwitterProps {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface AlternateProps {
  languages?: Record<string, string>;
  media?: Record<string, string>;
  types?: Record<string, string>;
}

export interface RobotsProps {
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
}

// Sitemap Types
export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternateRefs?: Array<{
    href: string;
    hreflang: string;
  }>;
}

export type SeoRecord = z.infer<typeof SeoRecordSchema>;
export type SeoType = SeoRecord["type"]; 
