/**
 * Custom hook for using page-specific translations
 */
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { 
  loadPageTranslations, 
  getNestedTranslation, 
  verifyIntegrity, 
  PageTranslations 
} from '@/lib/translation';
import { logger } from '@/lib/logger';

/**
 * Hook for using page-specific translations
 * @param page The page identifier
 * @returns Object with translation function and loading state
 */
interface UsePageTranslationReturn {
  t: (key: string, params?: Record<string, unknown>) => string;
  isLoading: boolean;
  error: Error | null;
}

export function usePageTranslation(page: string): UsePageTranslationReturn {
  const { language } = useLanguage();
  const [translations, setTranslations] = useState<PageTranslations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTranslations() {
      try {
        setIsLoading(true);
        const pageTranslations = await loadPageTranslations(page, language);
        
        // Verify integrity if token is present
        if (pageTranslations && 'integrityToken' in pageTranslations) {
          const { integrityToken, ...translationsWithoutToken } = pageTranslations;
          
          if (!verifyIntegrity(translationsWithoutToken as PageTranslations, integrityToken as string)) {
            logger.warn({
              message: `Integrity check failed for ${page} translations in ${language}`,
              context: { page, language, translations: translationsWithoutToken }
            });
          }
        }
        
        setTranslations(pageTranslations);
        setError(null);
      } catch (err) {
        logger.error({
          message: `Error loading translations for ${page}`,
          error: err instanceof Error ? err : new Error(String(err)),
          context: { page, language }
        });
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      finally {
        setIsLoading(false);
      }
    }

    fetchTranslations();
  }, [page, language]);

  /**
   * Get a translation by key
   * @param key The translation key (supports dot notation for nested keys)
   * @param params Optional parameters to interpolate into the translation
   * @returns The translated string or the key if not found
   */
  const t = useCallback((key: string, params: Record<string, unknown> = {}): string => {
    if (!translations) {
      return key;
    }
    
    const translation = getNestedTranslation(translations, key);
    if (typeof translation !== 'string') {
      return key;
    }
    
    // Replace placeholders with params
    return Object.entries(params).reduce(
      (result, [param, value]) => 
        result.replace(new RegExp(`\\{\\s*${param}\\s*\\}`, 'g'), String(value)),
      translation
    );
  }, [translations]);

  return { t, isLoading, error } as const;
}