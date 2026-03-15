import { z } from 'zod';

export const MetaTagSchema = z.object({
  name: z.string().optional(),
  property: z.string().optional(),
  content: z.string()
});

export const OpenGraphImageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string()
});

export const OpenGraphDataSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  images: z.array(OpenGraphImageSchema).optional(),
  event: z.object({
    start_time: z.string().optional(),
    location: z.string().optional()
  }).optional()
});

export const TwitterDataSchema = z.object({
  card: z.string().optional(),
  site: z.string().optional(),
  creator: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional()
});

// Base SEO schema that all entities must follow
export const BaseSEOSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().min(10).max(70),
  description: z.string().min(50).max(160),
  canonical: z.string().url(),
  robots: z.string().optional(),
  alternates: z.record(z.string()).optional(),
  meta: z.array(MetaTagSchema).optional(),
  openGraph: OpenGraphDataSchema.optional(),
  twitter: TwitterDataSchema.optional(),
  structuredData: z.array(z.record(z.unknown())).optional(),
  updatedAt: z.string().datetime()
});
