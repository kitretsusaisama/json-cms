// Core SEO interfaces
export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface OpenGraphImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface OpenGraphData {
  type: string;
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  images?: OpenGraphImage[];
  event?: {
    start_time?: string;
    location?: string;
  };
}

export interface TwitterData {
  card?: string;
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

// Using Record<string, unknown> for structured data to allow flexibility while maintaining type safety
export type StructuredDataItem = Record<string, unknown> & {
  '@type'?: string;
  '@context'?: string;
  location?: {
    url?: string;
    name?: string;
  };
};

export interface SEOData {
  id: string;
  type: string;
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  alternates?: Record<string, string>;
  meta?: MetaTag[];
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  structuredData?: StructuredDataItem[];
  updatedAt: string;
}

export interface SEOHealthCheckResult {
  file: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
