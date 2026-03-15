/**
 * Advanced SEO System with JSON-based configuration
 */
import { Metadata } from 'next';
import { supportedLanguages, defaultLanguage } from '@/i18n';
import { SEOProps } from '../seo';
import { logger } from '../logger';

/**
 * Load SEO configuration for a specific page and language
 * @param page The page identifier
 * @param lang The language code
 * @returns The SEO configuration for the page and language
 */
export async function loadPageSEO(page: string, lang: string): Promise<SEOProps | null> {
  try {
    // Dynamic import of the JSON file based on page and language
    const seoConfig = await import(`./pages/${page}/${lang}.json`);
    return seoConfig.default;
  } catch (error) {
    logger.error({
      message: `Failed to load SEO config for page ${page} in language ${lang}`,
      error: error instanceof Error ? error : new Error(String(error)),
      page,
      lang
    });
    return null;
  }
}

/**
 * Generate metadata for a page based on JSON configuration
 * @param page The page identifier
 * @param lang The language code
 * @returns Next.js Metadata object
 */
export async function generatePageMetadata(page: string, lang: string): Promise<Metadata> {
  // Ensure the language is supported
  const language = supportedLanguages.includes(lang) ? lang : defaultLanguage;
  
  // Load the SEO configuration
  const seoConfig = await loadPageSEO(page, language);
  
  // Fallback to default language if configuration is not available
  const fallbackConfig = language !== defaultLanguage ? 
    await loadPageSEO(page, defaultLanguage) : null;
  
  // Use configuration or fallback
  const config = seoConfig || fallbackConfig || {
    title: `${page.charAt(0).toUpperCase() + page.slice(1)}`,
    description: `${page.charAt(0).toUpperCase() + page.slice(1)} page`,
  };
  
  // Generate alternate language versions
  const alternateLanguages: Record<string, string> = {};
  for (const supportedLang of supportedLanguages) {
    alternateLanguages[supportedLang] = `/${supportedLang}/${page}`;
  }
  
  // Return the metadata
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    openGraph: config.openGraph,
    twitter: config.twitter,
    alternates: {
      languages: alternateLanguages,
      ...config.alternates,
    },
    other: {
      ...config.structuredData && { 'structured-data': JSON.stringify(config.structuredData) },
    },
  };
}

/**
 * Generate integrity token for SEO configuration
 * @param config The SEO configuration
 * @returns Integrity token
 */
export function generateIntegrityToken(config: SEOProps): string {
  // Simple hash function for demonstration
  const str = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}