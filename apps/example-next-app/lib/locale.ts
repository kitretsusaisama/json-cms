import { supportedLanguages, defaultLanguage } from "@workspace/i18n";

export function resolveLanguage(value: string | undefined): string {
  return value && supportedLanguages.includes(value) ? value : defaultLanguage;
}
