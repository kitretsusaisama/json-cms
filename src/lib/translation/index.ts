/**
 * Advanced Translation System with JSON-based configuration
 */
import { logger } from '@/lib/logger';

/**
 * Interface for page-specific translations
 */
export interface PageTranslations {
  [key: string]: string | PageTranslations;
}

/**
 * Load translations for a specific page and language
 * @param page The page identifier
 * @param lang The language code
 * @returns The translations for the page and language
 */
export async function loadPageTranslations(page: string, lang: string): Promise<PageTranslations | null> {
  try {
    // Dynamic import of the JSON file based on page and language
    const translations = await import(`./pages/${page}/${lang}.json`);
    return translations.default;
  } catch (error) {
    logger.error({
      message: `Failed to load translations for page ${page} in language ${lang}`,
      error: error instanceof Error ? error : new Error(String(error)),
      page,
      lang
    });
    return null;
  }
}

/**
 * Get a translation value from a nested object using a dot-notation path
 * @param translations The translations object
 * @param path The path to the translation (e.g., 'header.title')
 * @returns The translation value or undefined if not found
 */
export function getNestedTranslation(translations: PageTranslations, path: string): string | undefined {
  const keys = path.split('.');
  let current: string | PageTranslations = translations;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Generate integrity token for translation configuration
 * @param translations The translations object
 * @returns Integrity token
 */
export function generateIntegrityToken(translations: PageTranslations): string {
  // Simple hash function for demonstration
  const str = JSON.stringify(translations);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Verify the integrity of a translations object
 * @param translations The translations object
 * @param token The integrity token to verify against
 * @returns Whether the integrity check passed
 */
export function verifyIntegrity(translations: PageTranslations, token: string): boolean {
  const generatedToken = generateIntegrityToken(translations);
  return generatedToken === token;
}