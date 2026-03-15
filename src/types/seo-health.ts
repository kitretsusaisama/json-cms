// Type definitions for SEO data structures
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

