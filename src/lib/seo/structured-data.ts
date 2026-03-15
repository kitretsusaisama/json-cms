/**
 * Structured Data Generation Module
 * Contains all structured data types and generation functions
 */

// Structured Data Types
export interface WebSiteData {
  name: string;
  url: string;
  description: string;
  publisher?: string;
}

export interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  socialLinks?: string[];
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbData {
  items: BreadcrumbItem[];
}

export interface ArticleData {
  title: string;
  image?: string;
  author?: string;
  publisher?: string;
  datePublished?: string;
  dateModified?: string;
  description: string;
}

export interface ProductData {
  name: string;
  image?: string;
  description: string;
  brand?: string;
  price?: string;
  currency?: string;
  availability?: string;
}

export type StructuredDataInput = WebSiteData | OrganizationData | BreadcrumbData | ArticleData | ProductData | Record<string, unknown>;

// Type for structured data output
export interface BaseStructuredData {
  '@context': string;
  '@type': string;
}

export interface WebSiteStructuredData extends BaseStructuredData {
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  publisher?: string;
}

export interface OrganizationStructuredData extends BaseStructuredData {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

export interface BreadcrumbStructuredData extends BaseStructuredData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export interface ArticleStructuredData extends BaseStructuredData {
  '@type': 'Article';
  headline: string;
  image?: string;
  author?: string;
  publisher?: string;
  datePublished?: string;
  dateModified?: string;
  description: string;
}

export interface ProductStructuredData extends BaseStructuredData {
  '@type': 'Product';
  name: string;
  image?: string;
  description: string;
  brand?: string;
  offers?: {
    '@type': 'Offer';
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
}

export type StructuredDataOutput = 
  | WebSiteStructuredData 
  | OrganizationStructuredData 
  | BreadcrumbStructuredData 
  | ArticleStructuredData 
  | ProductStructuredData 
  | Record<string, unknown>;

/**
 * Generate structured data for a website
 */
function generateWebSiteStructuredData(data: WebSiteData): WebSiteStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: data.name,
    url: data.url,
    description: data.description,
    publisher: data.publisher,
  };
}

/**
 * Generate structured data for an organization
 */
function generateOrganizationStructuredData(data: OrganizationData): OrganizationStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    logo: data.logo,
    sameAs: data.socialLinks,
  };
}

/**
 * Generate structured data for breadcrumbs
 */
function generateBreadcrumbStructuredData(data: BreadcrumbData): BreadcrumbStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: data.items.map((item: BreadcrumbItem, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate structured data for an article
 */
function generateArticleStructuredData(data: ArticleData): ArticleStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    image: data.image,
    author: data.author,
    publisher: data.publisher,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    description: data.description,
  };
}

/**
 * Generate structured data for a product
 */
function generateProductStructuredData(data: ProductData): ProductStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    image: data.image,
    description: data.description,
    brand: data.brand,
    offers: data.price ? {
      '@type': 'Offer',
      price: data.price,
      priceCurrency: data.currency,
      availability: data.availability,
    } : undefined,
  };
}

/**
 * Generate structured data for a page
 */
export function generateStructuredData(type: string, data: StructuredDataInput): string {
  let structuredData: StructuredDataOutput;

  switch (type) {
    case 'website':
      structuredData = generateWebSiteStructuredData(data as WebSiteData);
      break;
    case 'organization':
      structuredData = generateOrganizationStructuredData(data as OrganizationData);
      break;
    case 'breadcrumb':
      structuredData = generateBreadcrumbStructuredData(data as BreadcrumbData);
      break;
    case 'article':
      structuredData = generateArticleStructuredData(data as ArticleData);
      break;
    case 'product':
      structuredData = generateProductStructuredData(data as ProductData);
      break;
    default:
      structuredData = data as Record<string, unknown>;
  }

  return JSON.stringify(structuredData);
}
