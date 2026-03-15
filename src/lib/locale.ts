// src/lib/locale.ts
import { cookies } from "next/headers";
import { supportedLanguages, defaultLanguage } from "@/i18n";

/**
 * Get the current locale from cookies, falling back to defaultLanguage.
 */
export async function getLocaleFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("NEXT_LOCALE")?.value;

  if (langCookie && supportedLanguages.includes(langCookie)) {
    return langCookie;
  }

  return defaultLanguage;
}