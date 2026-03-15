# Advanced SEO and Translation System

## Overview

This directory contains the advanced SEO and translation system for the Albata application. The system is designed to provide:

1. **JSON-based SEO Configuration**: Page-specific SEO metadata with structured data support
2. **Advanced Translation System**: Page-specific translations with integrity verification
3. **Hybrid Server/Client Architecture**: Server components for SEO and client components for UI

## Directory Structure

```
/lib
  /seo
    /pages
      /home
        en.json
        es.json
        ...
      /about
        en.json
        es.json
        ...
      ...
    index.ts
  /translation
    /pages
      /home
        en.json
        es.json
        ...
      /about
        en.json
        es.json
        ...
      ...
    index.ts
  locale.ts
  seo.ts
```

## SEO System

### Features

- **JSON-based Configuration**: Each page has its own SEO configuration in JSON format
- **Language-specific Metadata**: SEO metadata is provided for each supported language
- **Structured Data Support**: JSON-LD structured data for rich search results
- **Integrity Verification**: Integrity tokens to verify SEO configuration integrity

### Usage

```typescript
// In your page.tsx file
import { generatePageMetadata } from '@/lib/seo';
import { getLocaleFromCookies } from '@/lib/locale';

export async function generateMetadata() {
  const lang = await getLocaleFromCookies();
  return generatePageMetadata('pageName', lang);
}
```

## Translation System

### Features

- **Page-specific Translations**: Each page has its own translation files
- **Nested Translation Keys**: Support for nested translation keys using dot notation
- **Integrity Verification**: Integrity tokens to verify translation integrity
- **Fallback Support**: Fallback to default language if translation is not available

### Usage

```typescript
// In your client component
import { usePageTranslation } from '@/hooks/usePageTranslation';

export default function YourComponent() {
  const { t, isLoading } = usePageTranslation('pageName');
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

## Hybrid Architecture

The system uses a hybrid architecture with:

1. **Server Components**: For SEO metadata generation and initial language detection
2. **Client Components**: For dynamic UI rendering with translations

This approach ensures optimal SEO while maintaining a responsive user interface.

## Adding a New Page

1. Create SEO JSON files in `/lib/seo/pages/[pageName]/[lang].json`
2. Create translation JSON files in `/lib/translation/pages/[pageName]/[lang].json`
3. Use `generatePageMetadata` in your page's `generateMetadata` function
4. Use `usePageTranslation` in your client component

## Integrity Tokens

Integrity tokens are used to verify the integrity of SEO and translation configurations. They are generated using a simple hash function and stored in the JSON files.

```typescript
// Generate an integrity token
import { generateIntegrityToken } from '@/lib/translation';

const token = generateIntegrityToken(translations);
```